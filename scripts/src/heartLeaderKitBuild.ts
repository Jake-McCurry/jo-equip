#!/usr/bin/env node
/**
 * Faithful DOCX -> PDF builder for the A Heart After God Leader Kit.
 *
 * This intentionally stands apart from the full-book pipeline: the supplied
 * Leader Kit DOCX is the content and layout authority.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import mammoth from "mammoth";
import puppeteer from "puppeteer";

const ROOT = resolve(process.cwd(), "..");
const kitArg = (process.argv.find(arg => arg.startsWith("--kit="))?.split("=")[1] ?? "heart").toLowerCase();
const KITS = {
  heart: {
    title: "A Heart After God Leader Kit",
    source: "attached_assets/2_Heart_After_God_Leader_Kit_v.091226J_1789677319902.docx",
    output: "a-heart-after-god-leader-kit.pdf",
    proofName: "heart",
    weeks: 9,
    sourceImages: 16,
    goFurther: [
      ["The Adventure of Living with Jesus", "adventure-of-living-with-jesus.png"],
      ["Your New Identity in Christ", "your-new-identity-in-christ.png"],
      ["Beholding the Majesty of God", "beholding-the-majesty-of-god.png"],
      ["Walking in the Spirit", "walking-in-the-spirit.png"],
      ["Building Blocks for Maturity", "building-blocks-for-maturity.png"],
    ],
    starts: [
      "Why This Kit Exists",
      "Identity-Centered Heart Transformation",
      "How to Use This Kit",
      "Do Not Skip the Doubter",
      "Video Moments",
      ...Array.from({ length: 9 }, (_, index) => `WEEK ${index + 1} OF 9`),
      "Go Further",
      "Additional Resources",
    ],
  },
  adventure: {
    title: "The Adventure of Living with Jesus Leader Kit",
    source: "attached_assets/1_This_Sunday_Leader_Kit_(ALJ_-_The_Guide)_v.091726_1789753947981.docx",
    output: "adventure-of-living-with-jesus-leader-kit.pdf",
    proofName: "adventure",
    weeks: 10,
    sourceImages: 11,
    goFurther: [
      ["A Heart After God", "a-heart-after-god.png"],
      ["Your New Identity in Christ", "your-new-identity-in-christ.png"],
      ["Beholding the Majesty of God", "beholding-the-majesty-of-god.png"],
      ["Walking in the Spirit", "walking-in-the-spirit.png"],
      ["Building Blocks for Maturity", "building-blocks-for-maturity.png"],
    ],
    starts: [
      "Why This Kit Exists",
      "Identity-Centered Heart Transformation",
      "How to Use This Kit",
      "Do Not Skip the Doubter",
      "Video Moments",
      ...Array.from({ length: 10 }, (_, index) => `WEEK ${index + 1} OF 10`),
      "Go Further",
      "Additional Resources",
    ],
  },
} as const;
if (!(kitArg in KITS)) throw new Error(`Unknown --kit=${kitArg}; expected heart or adventure`);
const KIT = KITS[kitArg as keyof typeof KITS];
const SOURCE = resolve(ROOT, KIT.source);
const OUT_DIR = resolve(ROOT, "artifacts/discipleship-hub/public/leader-kits");
const COVER_DIR = resolve(OUT_DIR, "covers");
const OUT_PDF = resolve(OUT_DIR, KIT.output);
const PROOF_DIR = resolve(ROOT, `outputs/leader-kits/${KIT.proofName}/proofs`);
const PROOF_HTML = resolve(PROOF_DIR, `${KIT.proofName}-leader-kit.html`);
const REPORT = resolve(PROOF_DIR, `${KIT.proofName}-leader-kit-build-report.json`);
const SOURCE_COVER = resolve(PROOF_DIR, "assets/source-front-cover.png");
const GO_FURTHER = KIT.goFurther;
const PAGE_STARTS = KIT.starts;

function fileUrl(path: string): string {
  return `file://${path}`;
}

function chromiumPath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  const found = spawnSync("which", ["chromium"], { encoding: "utf8" }).stdout.trim();
  if (!found) throw new Error("Chromium was not found");
  return found;
}

function sourceTableFills(): string[] {
  const xml = spawnSync("unzip", ["-p", SOURCE, "word/document.xml"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  }).stdout;
  if (!xml) throw new Error("Could not read word/document.xml");
  return [...xml.matchAll(/<w:tbl>([\s\S]*?)<\/w:tbl>/g)].map(match => {
    const fill = match[1]!.match(/<w:shd\b[^>]*w:fill="([^"]+)"/)?.[1]?.toUpperCase();
    return fill === "1B365D" ? "navy" : fill === "E8EEF4" ? "blue" : fill === "F7F1E3" ? "cream" : "plain";
  });
}

function addTableClasses(html: string, fills: string[]): string {
  let index = 0;
  return html.replace(/<table>/g, () => `<table class="fill-${fills[index++] ?? "plain"}">`);
}

function addPageStarts(html: string): string {
  for (const label of PAGE_STARTS) {
    const labelAt = html.indexOf(label);
    if (labelAt < 0) continue;
    const tableAt = html.lastIndexOf("<table", labelAt);
    const tableEnd = html.indexOf("</table>", labelAt);
    const paragraphAt = html.lastIndexOf("<p", labelAt);
    const startAt = tableAt >= 0 && tableEnd > labelAt ? tableAt : paragraphAt;
    if (startAt >= 0) {
      html = `${html.slice(0, startAt)}<div class="section-start"></div>${html.slice(startAt)}`;
    }
  }
  return html;
}

function addGoFurtherCovers(html: string): string {
  for (const [title, filename] of GO_FURTHER) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const table = new RegExp(`(<table[^>]*>)(<tr>)(<td>)(?=<p><strong>${escaped})`, "i");
    const image = `<td class="series-cover"><img src="${fileUrl(resolve(COVER_DIR, filename))}" alt="${title} cover" /></td>`;
    html = html.replace(table, `$1$2${image}$3`);
  }
  return html;
}

function normalizeLeaderKitLinks(html: string): string {
  // Match the old plural-before-kit spelling, singular spelling, canonical
  // spelling, and any previously doubled trailing "s" in one idempotent pass.
  return html.replace(/\/(?:leaders-kit|leader-kits*)/gi, "/leader-kits");
}

function linkifyBareUrls(html: string): string {
  return html
    .split(/(<a\b[\s\S]*?<\/a>)/gi)
    .map((part, index) => {
      if (index % 2) return part;
      return part.replace(
        /\b((?:https?:\/\/)?(?:equip|app)\.jesusonline\.com(?:\/[^\s<]*)?)/gi,
        raw => {
          const trailing = raw.match(/[.,;:!?)]+$/)?.[0] ?? "";
          const visible = trailing ? raw.slice(0, -trailing.length) : raw;
          const href = /^https?:\/\//i.test(visible) ? visible : `https://${visible}`;
          return `<a href="${href}">${visible}</a>${trailing}`;
        },
      );
    })
    .join("");
}

async function main() {
  const required = [SOURCE, ...GO_FURTHER.map(([, f]) => resolve(COVER_DIR, f))];
  const missing = required.filter(path => !existsSync(path));
  if (missing.length) throw new Error(`Missing required source assets:\n${missing.join("\n")}`);
  mkdirSync(PROOF_DIR, { recursive: true });
  mkdirSync(dirname(SOURCE_COVER), { recursive: true });
  mkdirSync(dirname(OUT_PDF), { recursive: true });
  const extractedCover = spawnSync("unzip", ["-p", SOURCE, "word/media/image1.png"], {
    maxBuffer: 16 * 1024 * 1024,
  });
  if (extractedCover.status !== 0 || !extractedCover.stdout?.length) {
    throw new Error("Could not extract the source front cover image1.png");
  }
  writeFileSync(SOURCE_COVER, extractedCover.stdout);

  let paragraphIndex = 0;
  const transformDocument = (mammoth as any).transforms.paragraph((paragraph: any) => {
    paragraphIndex++;
    if (paragraph.alignment === "center") paragraph.styleName = "LK Center";
    else if (paragraph.alignment === "right") paragraph.styleName = "LK Right";
    else if (Number(paragraph.indent?.start ?? 0) >= 600) paragraph.styleName = "LK Indent";
    return paragraph;
  });
  const converted = await mammoth.convertToHtml(
    { path: SOURCE },
    {
      transformDocument,
      styleMap: [
        "p[style-name='LK Center'] => p.center:fresh",
        "p[style-name='LK Right'] => p.right:fresh",
        "p[style-name='LK Indent'] => p.indent:fresh",
      ],
      convertImage: mammoth.images.imgElement(image =>
        image.read("base64").then(data => ({ src: `data:${image.contentType};base64,${data}` })),
      ),
    },
  );
  if (converted.messages.some(message => message.type === "error")) {
    throw new Error(converted.messages.map(message => message.message).join("; "));
  }

  let body = converted.value;
  // The source's first embedded image is its full-bleed cover. Use the exact
  // extracted asset separately so an oversized image can never shrink pages.
  body = body.replace(/^<p[^>]*><img\b[^>]*><\/p>/, "");
  body = normalizeLeaderKitLinks(body);
  body = linkifyBareUrls(body);
  body = addTableClasses(body, sourceTableFills());
  body = addGoFurtherCovers(body);
  body = addPageStarts(body);

  for (const [title] of GO_FURTHER) {
    if (!body.includes(`alt="${title} cover"`)) throw new Error(`Could not insert Go Further cover: ${title}`);
  }
  for (const label of PAGE_STARTS) {
    if (!body.includes(label)) throw new Error(`Missing expected source section: ${label}`);
  }

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${KIT.title}</title>
<style>
@page { size: Letter; margin: .5in .5in .6in; }
@page cover { size: Letter; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; color: #20242b; }
body { font-family: Caladea, Cambria, serif; font-size: 11pt; line-height: 1.22; }
.cover { page: cover; break-after: page; width: 8.5in; height: 11in; margin: 0; }
.cover img { width: 100%; height: 100%; max-width: none; max-height: none; display: block; object-fit: cover; }
p { margin: 0 0 7pt; orphans: 2; widows: 2; }
p.center { text-align: center; }
p.right { text-align: right; }
p.indent { margin-left: .5in; }
strong { font-family: Carlito, Calibri, sans-serif; }
a { color: #165f87; text-decoration: underline; overflow-wrap: anywhere; }
.section-start { break-before: page; height: 0; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0 10pt; break-inside: avoid; }
td { padding: 9pt 11pt; vertical-align: middle; border: 0; }
td p:last-child { margin-bottom: 0; }
table.fill-navy { background: #1b365d; color: white; }
table.fill-navy a { color: white; }
table.fill-cream { background: #f7f1e3; }
table.fill-blue { background: #e8eef4; }
table.fill-plain { border: .5pt solid #c9cdd2; }
table.fill-navy td { padding-top: 8pt; padding-bottom: 8pt; }
img { max-width: 100%; max-height: 5.45in; object-fit: contain; }
p > img { display: block; margin: 8pt auto; }
td.series-cover { width: 1.45in; padding: 7pt; background: #f7f1e3; text-align: center; }
td.series-cover img { display: block; width: 1.15in; height: 1.65in; margin: auto; object-fit: contain; }
td.series-cover + td { padding-left: 12pt; }
table:has(td.series-cover) { background: #f7f1e3; border-left: 5pt solid #c6a15b; }
@media print {
  .content:after { content: ""; display: block; }
}
</style></head><body>
<div class="cover"><img src="${fileUrl(SOURCE_COVER)}" alt="${KIT.title} cover"></div>
<main class="content">${body}</main>
</body></html>`;
  writeFileSync(PROOF_HTML, html);

  const browser = await puppeteer.launch({
    executablePath: chromiumPath(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--allow-file-access-from-files"],
  });
  try {
    const page = await browser.newPage();
    await page.goto(fileUrl(PROOF_HTML), { waitUntil: "networkidle0" });
    await page.evaluate(() => (globalThis as any).document.fonts.ready);
    const overflow = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      const elements = Array.from(doc.querySelectorAll("*")) as any[];
      return {
      scrollWidth: doc.documentElement.scrollWidth,
      clientWidth: doc.documentElement.clientWidth,
      tooWide: elements.filter(
        (element: any) =>
          !element.closest(".cover") &&
          !element.matches("html, body") &&
          element.scrollWidth > element.clientWidth + 2,
      ).length,
      covers: doc.querySelectorAll("td.series-cover img").length,
      images: doc.images.length,
      brokenImages: (Array.from(doc.images) as any[]).filter(
        (image: any) => !image.complete || image.naturalWidth === 0,
      ).length,
      links: doc.links.length,
    };
    });
    if (overflow.tooWide || overflow.brokenImages || overflow.covers !== 5) {
      throw new Error(`HTML preflight failed: ${JSON.stringify(overflow)}`);
    }
    const rawPdf = resolve(PROOF_DIR, `${KIT.proofName}-leader-kit.raw.pdf`);
    await page.pdf({
      path: rawPdf,
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate: `<div style="width:100%;font:8px Carlito;color:#667085;text-align:center"><span class="pageNumber"></span></div>`,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.6in", left: "0.5in" },
    });
    const rawPdfText = spawnSync("pdftotext", [rawPdf, "-"], {
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
    }).stdout;
    const optimized = spawnSync(
      "gs",
      [
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.7",
        "-dPDFSETTINGS=/ebook",
        "-dColorImageResolution=150",
        "-dGrayImageResolution=150",
        "-dMonoImageResolution=300",
        "-dEmbedAllFonts=true",
        "-dSubsetFonts=true",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        `-sOutputFile=${OUT_PDF}`,
        rawPdf,
      ],
      { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
    );
    if (optimized.status !== 0 || !existsSync(OUT_PDF)) {
      throw new Error(`Ghostscript optimization failed: ${optimized.stderr || optimized.stdout}`);
    }
    spawnSync("rm", ["-f", rawPdf]);
    const pdfInfo = spawnSync("pdfinfo", [OUT_PDF], { encoding: "utf8" }).stdout;
    const pages = Number(pdfInfo.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
    const pdfText = spawnSync("pdftotext", [OUT_PDF, "-"], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).stdout;
    const sourceText = (await mammoth.extractRawText({ path: SOURCE })).value;
    const normalizeText = (text: string) =>
      text
        .normalize("NFKD")
        .replaceAll("/leaders-kit", "/leader-kits")
        .replaceAll("/leader-kit", "/leader-kits")
        .replace(/[‐‑‒–—−]/g, "-")
        .replace(/\s*-\s*/g, "-")
        .replace(/[^\p{L}\p{N}]+/gu, "")
        .toLocaleLowerCase("en")
        .trim();
    // Validate manuscript text against Chromium's lossless text layer before
    // Ghostscript image downsampling. Ghostscript preserves visible text and
    // links but can reorder ToUnicode extraction for separately positioned
    // runs, making paragraph substring checks against the optimized PDF noisy.
    const normalizedPdfText = normalizeText(rawPdfText);
    const sourceTextBlocks = sourceText
      .split(/\n+/)
      .map(normalizeText)
      .filter(text => text.length > 2);
    const unmatchedSourceTextBlocks = sourceTextBlocks.filter(text => !normalizedPdfText.includes(text));
    const pdfLinkDump = spawnSync("mutool", ["show", OUT_PDF, "grep", "URI"], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
    }).stdout;
    const clickablePdfLinks = (pdfLinkDump.match(/\/S\/URI/g) ?? []).length;
    const weekPattern = new RegExp(`WEEK\\s+(\\d+)\\s+OF\\s+${KIT.weeks}`, "g");
    const weekCount = new Set([...pdfText.matchAll(weekPattern)].map(match => match[1])).size;
    const report = {
      source: SOURCE,
      output: OUT_PDF,
      proofHtml: PROOF_HTML,
      generatedAt: new Date().toISOString(),
      pages,
      sourceParagraphsSeen: paragraphIndex,
      sourceTables: sourceTableFills().length,
      sourceEmbeddedImages: KIT.sourceImages,
      renderedImages: overflow.images,
      goFurtherCovers: overflow.covers,
      htmlLinks: overflow.links,
      clickablePdfLinks,
      horizontalOverflowElements: overflow.tooWide,
      brokenImages: overflow.brokenImages,
      expectedWeeks: KIT.weeks,
      uniqueWeeksFound: weekCount,
      normalizedLeaderKitUrl: pdfText.includes("equip.jesusonline.com/leader-kits"),
      accidentalLeaderKitUrl: /leader-kitss+/i.test(pdfText),
      requiredSectionsPresent: PAGE_STARTS.every(label => normalizedPdfText.includes(normalizeText(label))),
      sourceTextBlocks: sourceTextBlocks.length,
      sourceTextBlocksMatched: sourceTextBlocks.length - unmatchedSourceTextBlocks.length,
      sourceTextMatchPercent: Number(
        (((sourceTextBlocks.length - unmatchedSourceTextBlocks.length) / sourceTextBlocks.length) * 100).toFixed(2),
      ),
      unmatchedTextBlocks: unmatchedSourceTextBlocks,
      outputBytes: readFileSync(OUT_PDF).byteLength,
      under20MiB: readFileSync(OUT_PDF).byteLength < 20 * 1024 * 1024,
    };
    if (
      pages < KIT.weeks + 10 ||
      weekCount !== KIT.weeks ||
      !report.requiredSectionsPresent ||
      !report.normalizedLeaderKitUrl ||
      report.accidentalLeaderKitUrl ||
      clickablePdfLinks < overflow.links ||
      report.sourceTextMatchPercent < 99 ||
      !report.under20MiB
    ) {
      throw new Error(`PDF validation failed: ${JSON.stringify(report)}`);
    }
    writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});