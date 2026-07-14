#!/usr/bin/env node
/**
 * Build the two JO EQUIP ebook PDFs ("Walking in the Spirit" and "Your New
 * Identity in Christ") from their source .docx manuscripts.
 *
 * Pipeline:
 *  1. mammoth converts the .docx to semantic HTML (headings preserved).
 *  2. Post-processing: promote a couple of chapter headings that are plain
 *     paragraphs in the docx, split front matter / TOC / chapters, rebuild
 *     the Table of Contents with dotted leaders, and activate key links
 *     (notably "Share Your Story" → equip.jesusonline.com/reviews/share).
 *  3. Two-pass Chromium render: pass 1 embeds invisible page markers, the
 *     marker pages are read back with pdftotext, then pass 2 renders the
 *     final interior with real TOC page numbers.
 *  4. pdf-lib prepends the book cover image; Ghostscript /ebook compresses.
 *
 * Formatting rules from the manuscript owner: do NOT bold, center, or
 * italicize anything that is not bold/centered/italicized in the docx.
 * mammoth preserves the docx's own bold/italic runs; the template never adds
 * font-style/font-weight/text-align beyond what the docx markup carries
 * (headings are heading-styled in the docx itself).
 *
 * Run:
 *   pnpm --filter @workspace/scripts run book:walking-spirit
 *   pnpm --filter @workspace/scripts run book:new-identity
 *   tsx ./src/ebookDocxBuild.ts --book=all
 */
import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer, { type Browser } from "puppeteer";
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";

const ROOT = resolve(process.cwd(), "..");

interface BookConfig {
  key: string;
  docx: string;
  cover: string;
  coverType: "png" | "jpg";
  /* Crop this many PDF points off the bottom of the cover when it overflows
     the letter page (rest is cropped from the top). */
  coverBottomCrop: number;
  out: string;
  title: string;
  subtitleHtml: string;
  tocHeading: string; // text of the docx TOC <h1>
}

const BOOKS: BookConfig[] = [
  {
    key: "walking",
    docx: resolve(ROOT, "attached_assets/Walking_in_the_Spirit_ebook_260714_1784052029630.docx"),
    cover: resolve(ROOT, "attached_assets/walking_cover_jo_logo_edit.png"),
    coverType: "png",
    coverBottomCrop: 10,
    out: resolve(ROOT, "artifacts/discipleship-hub/public/books/walking-in-the-spirit.pdf"),
    title: "Walking in the Spirit",
    subtitleHtml: "A Practical Guide to the Holy Spirit’s<br />Presence, Power, and Fruit in the Believer’s Life",
    tocHeading: "Table of Contents",
  },
  {
    key: "identity",
    docx: resolve(ROOT, "attached_assets/Your_New_Identity_in_Christ_ebook_260714_1784052032853.docx"),
    cover: resolve(ROOT, "attached_assets/identity_cover_jo_logo_edit.jpg"),
    coverType: "jpg",
    coverBottomCrop: 0,
    out: resolve(ROOT, "artifacts/discipleship-hub/public/books/your-new-identity-in-christ.pdf"),
    title: "Your New Identity in Christ",
    subtitleHtml: "<em>Embracing Who God Says You Are</em>",
    tocHeading: "Contents",
  },
];

const args = process.argv.slice(2);
const bookArg = (args.find(a => a.startsWith("--book="))?.split("=")[1] ?? "all").toLowerCase();

function resolveChromiumPath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const which = spawnSync("which", ["chromium"], { encoding: "utf8" });
  const path = which.stdout?.trim();
  if (path && existsSync(path)) return path;
  throw new Error("No Chromium found. Set PUPPETEER_EXECUTABLE_PATH or install chromium.");
}

/* ---------------------------------------------------------------- helpers */

function stripTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/* Leading TOC/chapter token: "3." / "3" / "B." / "Conclusion" / "Appendix". */
function headingToken(text: string): string | null {
  const t = text.trim();
  let m = t.match(/^(\d+)[.\s]/);
  if (m) return m[1]!;
  m = t.match(/^([A-E])\.\s/);
  if (m) return m[1]!;
  if (/^conclusion\b/i.test(t)) return "CONCL";
  if (/^appendix\b/i.test(t)) return "APPX";
  return null;
}

/* Linkify known bare URLs, but never inside an existing <a>…</a>. */
function linkifyOutsideAnchors(html: string): string {
  const parts = html.split(/(<a [\s\S]*?<\/a>)/);
  const bare: Array<[RegExp, (m: string) => string]> = [
    [/Share Your Story\s*→\s*[^<\s]+/g,
      () => `Share Your Story → <a href="https://equip.jesusonline.com/reviews/share">equip.jesusonline.com/reviews/share</a>`],
    [/(?<![\w/.-])equip\.jesusonline\.com\/books(?![\w/-])/g,
      m => `<a href="https://equip.jesusonline.com/books">${m}</a>`],
    [/(?<![\w/.-])equip\.jesusonline\.com\/playlists(?![\w/-])/g,
      m => `<a href="https://equip.jesusonline.com/playlists">${m}</a>`],
    [/(?<![\w/.-])app\.jesusonline\.com(?![\w/-])/g,
      m => `<a href="https://app.jesusonline.com">${m}</a>`],
    [/(?<![\w/.-])equip\.JesusOnline\.com(?![\w/-])/g,
      m => `<a href="https://equip.jesusonline.com">${m}</a>`],
    [/(?<![\w/.-])JesusOnlineMinistries\.org(?![\w/-])/g,
      m => `<a href="https://jesusonlineministries.org">${m}</a>`],
  ];
  return parts
    .map((part, i) => {
      if (i % 2 === 1) return part; // inside an <a>
      let out = part;
      for (const [re, fn] of bare) out = out.replace(re, fn);
      return out;
    })
    .join("");
}

interface Chapter {
  key: string;      // token used for TOC matching + page markers
  headingHtml: string;
  bodyHtml: string;
}

interface ParsedBook {
  frontPagesHtml: string;
  tocEntries: Array<
    | { kind: "entry"; labelText: string; key: string | null }
    | { kind: "label"; labelText: string }
    | { kind: "sub"; itemsHtml: string[] }
  >;
  chapters: Chapter[];
}

function parseBook(book: BookConfig, rawHtml: string): ParsedBook {
  let html = rawHtml;

  /* Book-specific heading promotions (plain paragraphs in the docx). */
  if (book.key === "identity") {
    html = html.replace(
      /<p>1\s*<br \/>Embracing Your New Identity in Christ<\/p>/,
      "<h1>1 <br />Embracing Your New Identity in Christ</h1>",
    );
  }

  const tocH1 = `<h1>${book.tocHeading}</h1>`;
  let tocIdx = html.indexOf(tocH1);
  if (tocIdx === -1) {
    /* mammoth sometimes keeps stray <strong> runs inside the heading. */
    const m = html.match(new RegExp(`<h1>[^<]*(?:<strong>[^<]*</strong>[^<]*)*</h1>`));
    if (m && stripTags(m[0]!).toLowerCase() === book.tocHeading.toLowerCase()) tocIdx = html.indexOf(m[0]!);
  }
  if (tocIdx === -1) throw new Error(`TOC heading "${book.tocHeading}" not found in ${book.key}`);

  const frontHtml = html.slice(0, tocIdx);
  const afterToc = html.slice(tocIdx);
  const tocHeadingEnd = afterToc.indexOf("</h1>") + 5;
  const nextH1 = afterToc.indexOf("<h1>", tocHeadingEnd);
  if (nextH1 === -1) throw new Error(`No chapters found after TOC in ${book.key}`);
  const tocBodyHtml = afterToc.slice(tocHeadingEnd, nextH1);
  const chaptersHtml = afterToc.slice(nextH1);

  /* ----- front matter: title page / notices+publisher page / JO EQUIP page */
  const frontPs = frontHtml.match(/<p>[\s\S]*?<\/p>/g) ?? [];
  if (frontPs.length === 0) throw new Error(`No front matter found in ${book.key}`);
  const bodyPs = frontPs.slice(1); // first <p> is the title block → replaced by styled title page
  const joIdx = bodyPs.findIndex(p => /<p><strong>JO EQUIP/.test(p));
  const noticePs = joIdx === -1 ? bodyPs : bodyPs.slice(0, joIdx);
  const joPs = joIdx === -1 ? [] : bodyPs.slice(joIdx);
  const frontPagesHtml = `
  <section class="title-page">
    <h1>${book.title}</h1>
    <p class="subtitle">${book.subtitleHtml}</p>
  </section>
  <section class="front-page notices">
    ${noticePs.join("\n")}
  </section>
  ${joPs.length ? `<section class="front-page">\n${joPs.join("\n")}\n</section>` : ""}`;

  /* ----- TOC entries */
  const tocEntries: ParsedBook["tocEntries"] = [];
  for (const m of tocBodyHtml.matchAll(/<(p|ul)>([\s\S]*?)<\/\1>/g)) {
    const tag = m[1];
    if (tag === "ul") {
      const items = [...m[2]!.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(x => stripTags(x[1]!));
      tocEntries.push({ kind: "sub", itemsHtml: items });
      continue;
    }
    const text = stripTags(m[2]!);
    if (!text) continue;
    const dotSplit = text.split(/\s*\.{3,}/);
    const label = dotSplit[0]!.trim().replace(/\.+$/, "").trim();
    if (/\.{3,}/.test(text)) {
      tocEntries.push({ kind: "entry", labelText: label, key: headingToken(label) });
    } else {
      tocEntries.push({ kind: "label", labelText: label });
    }
  }

  /* ----- chapters */
  const chapters: Chapter[] = [];
  const parts = chaptersHtml.split(/(?=<h1>)/);
  for (const part of parts) {
    const hm = part.match(/^<h1>([\s\S]*?)<\/h1>/);
    if (!hm) continue;
    let headingHtml = hm[1]!.replace(/^\s*(<br \/>)+/, "").trim();
    const text = stripTags(headingHtml);
    const token = headingToken(text) ?? `X${chapters.length}`;
    chapters.push({ key: token, headingHtml, bodyHtml: part.slice(hm[0].length) });
  }
  return { frontPagesHtml, tocEntries, chapters };
}

/* ------------------------------------------------------------- rendering */

const CSS = `
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #1f2937;
    font-size: 11pt;
    line-height: 1.55;
  }
  .title-page { page-break-after: always; padding-top: 2.2in; }
  .title-page h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 30pt; line-height: 1.15; color: #002f55;
    margin: 0 0 0.4em 0;
  }
  .title-page .subtitle { font-size: 14pt; line-height: 1.4; color: #0083de; margin: 0; }
  .front-page { page-break-after: always; padding-top: 0.4in; }
  .front-page.notices { padding-top: 1in; font-size: 9.5pt; color: #4b5563; }
  .front-page.notices p { margin: 0 0 1.1em 0; }
  .toc { page-break-after: always; padding-top: 0.3in; }
  .toc h1 { font-size: 20pt; color: #002f55; margin: 0 0 0.9em 0; }
  .toc-line { display: flex; align-items: baseline; margin: 0 0 0.55em 0; }
  .toc-line .toc-label { white-space: normal; }
  .toc-line .toc-dots { flex: 1 1 auto; min-width: 24px; border-bottom: 1px dotted #9ca3af; margin: 0 6px; transform: translateY(-3px); }
  .toc-line .toc-pg { color: #1f2937; }
  .toc-label-line { margin: 0.9em 0 0.4em 0; }
  .toc ul { margin: 0.15em 0 0.7em 1.6em; padding: 0; list-style: disc; font-size: 10pt; color: #4b5563; }
  .toc ul li { margin: 0.15em 0; }
  .chapter { page-break-before: always; }
  .chapter > h1 {
    font-size: 21pt; line-height: 1.25; color: #002f55;
    margin: 0.25in 0 0.7em 0; position: relative;
  }
  h2 { font-size: 14pt; color: #002f55; margin: 1.5em 0 0.3em; page-break-after: avoid; line-height: 1.3; }
  h3 { font-size: 12pt; color: #002f55; margin: 1.25em 0 0.2em; page-break-after: avoid; line-height: 1.3; }
  p { margin: 0 0 0.85em 0; orphans: 3; widows: 3; }
  a { color: #b34800; text-decoration: none; }
  strong { color: #002f55; }
  ul, ol { margin: 0.5em 0 1em 1.5em; padding: 0; }
  li { margin: 0.3em 0; }
  img { max-width: 100% !important; height: auto !important; page-break-inside: avoid; margin: 0.7em 0; }
  table { border-collapse: collapse; margin: 0.8em 0; font-size: 10pt; }
  td, th { border: 1px solid #d1d5db; padding: 4px 8px; vertical-align: top; }
  .pgmark { position: absolute; left: 0; top: 0; font-size: 2px; color: #ffffff; }
`;

const FOOTER_TEMPLATE = `
  <div style="width:100%;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:8.5pt;color:#6b7280;">
    <span class="pageNumber"></span>
  </div>`;
const HEADER_TEMPLATE = `<div></div>`;

function buildTocHtml(parsed: ParsedBook, pageNums: Map<string, number> | null): string {
  const lines: string[] = [];
  for (const e of parsed.tocEntries) {
    if (e.kind === "sub") {
      lines.push(`<ul>${e.itemsHtml.map(i => `<li>${i}</li>`).join("")}</ul>`);
    } else if (e.kind === "label") {
      lines.push(`<p class="toc-label-line">${e.labelText}</p>`);
    } else {
      const pg = e.key && pageNums?.has(e.key) ? String(pageNums.get(e.key)) : "00";
      lines.push(
        `<div class="toc-line"><span class="toc-label">${e.labelText}</span><span class="toc-dots"></span><span class="toc-pg">${pg}</span></div>`,
      );
    }
  }
  return lines.join("\n");
}

function buildInteriorHtml(
  book: BookConfig,
  parsed: ParsedBook,
  pageNums: Map<string, number> | null,
  withMarkers: boolean,
): string {
  const chaptersHtml = parsed.chapters
    .map(c => {
      const marker = withMarkers ? `<span class="pgmark">[[MK-${c.key}-KM]]</span>` : "";
      return `<section class="chapter"><h1>${marker}${c.headingHtml}</h1>\n${c.bodyHtml}</section>`;
    })
    .join("\n");
  const body = `
  ${parsed.frontPagesHtml}
  <section class="toc">
    <h1>${book.tocHeading}</h1>
    ${buildTocHtml(parsed, pageNums)}
  </section>
  ${chaptersHtml}`;
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>${book.title}</title><style>${CSS}</style></head>
<body>${linkifyOutsideAnchors(body)}</body>
</html>`;
}

async function renderPdf(browser: Browser, html: string, outPath: string): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on("request", req => {
      if (req.url().startsWith("data:") || req.url().startsWith("about:")) req.continue();
      else req.abort();
    });
    await page.setContent(html, { waitUntil: "load", timeout: 60000 });
    await page.pdf({
      path: outPath,
      format: "Letter",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: HEADER_TEMPLATE,
      footerTemplate: FOOTER_TEMPLATE,
      margin: { top: "0.8in", bottom: "0.85in", left: "0.9in", right: "0.9in" },
    });
  } finally {
    await page.close();
  }
}

function extractMarkerPages(pdfPath: string): Map<string, number> {
  const res = spawnSync("pdftotext", [pdfPath, "-"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (res.status !== 0) throw new Error(`pdftotext failed: ${res.stderr}`);
  const pages = res.stdout.split("\f");
  const map = new Map<string, number>();
  pages.forEach((text, i) => {
    for (const m of text.matchAll(/\[\[MK-([^\]]+?)-KM\]\]/g)) {
      if (!map.has(m[1]!)) map.set(m[1]!, i + 1);
    }
  });
  return map;
}

async function prependCoverAndCompress(book: BookConfig, interiorPath: string): Promise<void> {
  const PAGE_W = 612;
  const PAGE_H = 792;
  const doc = await PDFDocument.load(readFileSync(interiorPath));
  const coverBytes = readFileSync(book.cover);
  const coverImage = book.coverType === "png" ? await doc.embedPng(coverBytes) : await doc.embedJpg(coverBytes);
  const scale = PAGE_W / coverImage.width;
  const drawnH = coverImage.height * scale;
  const overflow = Math.max(0, drawnH - PAGE_H);
  const bottomCrop = Math.min(book.coverBottomCrop, overflow);
  const coverPage = doc.insertPage(0, [PAGE_W, PAGE_H]);
  coverPage.drawImage(coverImage, { x: 0, y: -bottomCrop, width: PAGE_W, height: drawnH });

  const tmp = `${book.out}.uncompressed.tmp.pdf`;
  writeFileSync(tmp, await doc.save());
  const gs = spawnSync(
    "gs",
    ["-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/ebook", "-dNOPAUSE", "-dQUIET", "-dBATCH", `-sOutputFile=${book.out}`, tmp],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  if (gs.status !== 0) {
    unlinkSync(tmp);
    throw new Error(`gs failed with exit code ${gs.status}`);
  }
  const before = statSync(tmp).size;
  const after = statSync(book.out).size;
  unlinkSync(tmp);
  console.log(`Wrote ${book.out}\n  uncompressed: ${(before / 1024).toFixed(0)} KB → compressed: ${(after / 1024).toFixed(0)} KB`);
}

async function buildBook(browser: Browser, book: BookConfig): Promise<void> {
  console.log(`\n=== ${book.title} ===`);
  const { value: rawHtml, messages } = await mammoth.convertToHtml({ path: book.docx });
  const warnings = messages.filter(m => m.type === "warning" && !/Unrecognised (run|paragraph) style/.test(m.message));
  if (warnings.length) console.warn("  mammoth warnings:", warnings.map(m => m.message).join("; "));

  const parsed = parseBook(book, rawHtml);
  console.log(`  chapters: ${parsed.chapters.map(c => c.key).join(", ")}`);

  const pass1Path = `${book.out}.pass1.tmp.pdf`;
  await renderPdf(browser, buildInteriorHtml(book, parsed, null, true), pass1Path);
  const pageNums = extractMarkerPages(pass1Path);
  unlinkSync(pass1Path);
  console.log(`  page map: ${[...pageNums.entries()].map(([k, v]) => `${k}→${v}`).join(" ")}`);

  const missing = parsed.tocEntries.filter(e => e.kind === "entry" && e.key && !pageNums.has(e.key));
  if (missing.length) {
    throw new Error(`TOC entries without a matched chapter page: ${missing.map(e => (e as { labelText: string }).labelText).join(" | ")}`);
  }

  const interiorPath = `${book.out}.interior.tmp.pdf`;
  await renderPdf(browser, buildInteriorHtml(book, parsed, pageNums, false), interiorPath);
  await prependCoverAndCompress(book, interiorPath);
  unlinkSync(interiorPath);
}

async function main(): Promise<void> {
  const selected = BOOKS.filter(b => bookArg === "all" || b.key === bookArg);
  if (selected.length === 0) {
    console.error(`Unknown --book=${bookArg}. Use: ${BOOKS.map(b => b.key).join(", ")}, all`);
    process.exit(1);
  }
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChromiumPath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    for (const book of selected) await buildBook(browser, book);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
