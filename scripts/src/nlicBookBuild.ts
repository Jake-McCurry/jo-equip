#!/usr/bin/env node
/**
 * Build the "New Life in Christ" book PDF from the 40 generated lesson
 * articles (artifacts/discipleship-hub/src/data/generated/articles/
 * new-life-christ.json).
 *
 * Pipeline (mirrors ebookDocxBuild.ts mechanics, bcgPdfBuild.ts branding):
 *  1. Compose interior HTML: front-matter page, TOC, 40 lesson chapters.
 *  2. Two-pass Chromium render — pass 1 embeds invisible page markers that
 *     are read back with pdftotext to learn each lesson's page, pass 2
 *     renders the final interior with real TOC page numbers.
 *  3. Prepend the cover PNG with pdf-lib, compress with Ghostscript /ebook.
 *
 * Output: artifacts/discipleship-hub/public/books/new-life-in-christ.pdf
 *
 * Run: pnpm --filter @workspace/scripts run book:new-life
 */
import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer, { type Browser } from "puppeteer";
import { PDFDocument } from "pdf-lib";

const ROOT = resolve(process.cwd(), "..");
const HUB = resolve(ROOT, "artifacts/discipleship-hub");
const DATA_PATH = resolve(HUB, "src/data/generated/articles/new-life-christ.json");
const COVER_PATH = resolve(ROOT, "attached_assets/New_Life_In_Christ_Door_1786490737689.png");
const OUT_PATH = resolve(HUB, "public/books/new-life-in-christ.pdf");

const SITE = "https://equip.jesusonline.com";
const TITLE = "New Life in Christ";
const SUBTITLE = "40 Lessons for Victorious Christian Living";

/* Local mirror of the generated-article block shapes (see bcgPdfBuild.ts for
   why leaf scripts duplicate types instead of importing across packages). */
type Block =
  | { type: "p"; html: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; html: string; cite?: string };
interface Lesson {
  id: string;
  title: string;
  blocks: Block[];
}

function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function rewriteLinks(html: string): string {
  return html.replace(
    /href=(["'])\/(?!\/)([^"']*)\1/g,
    (_m, q: string, path: string) => `href=${q}${SITE}/${path}${q}`,
  );
}

function blockToHtml(b: Block): string {
  switch (b.type) {
    case "h2": return `<h2>${escText(b.text)}</h2>`;
    case "h3": return `<h3>${escText(b.text)}</h3>`;
    case "p": return `<p>${rewriteLinks(b.html)}</p>`;
    case "ul": return `<ul>${b.items.map(i => `<li>${rewriteLinks(i)}</li>`).join("")}</ul>`;
    case "ol": return `<ol>${b.items.map(i => `<li>${rewriteLinks(i)}</li>`).join("")}</ol>`;
    case "quote":
      return `<blockquote><p>${rewriteLinks(b.html)}</p>${b.cite ? `<cite>— ${escText(b.cite)}</cite>` : ""}</blockquote>`;
    default: return "";
  }
}

const CSS = `
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #1f2937;
    font-size: 11.5pt;
    line-height: 1.55;
  }
  .front {
    page-break-after: always;
    padding-top: 2.2in;
    text-align: center;
  }
  .front .title { font-size: 30pt; line-height: 1.15; color: #0b3c5d; margin: 0 0 0.35em 0; }
  .front .subtitle { font-size: 14pt; color: #0083de; margin: 0 0 1.2em 0; }
  .front .rule { display: inline-block; width: 96px; height: 4px; background: #de5b00; margin-bottom: 1.4em; }
  .front .brand {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 10.5pt; color: #4b5563; line-height: 1.7;
  }
  .front .brand strong { color: #0b3c5d; }
  .toc { page-break-after: always; }
  .toc h1 { font-size: 20pt; color: #0b3c5d; font-weight: normal; margin: 0 0 0.8em 0; }
  .toc ol { list-style: none; margin: 0; padding: 0; }
  .toc li {
    display: flex; align-items: baseline; gap: 6px;
    font-size: 10.5pt; margin: 0.32em 0;
  }
  .toc .num { color: #de5b00; font-weight: 700; min-width: 1.6em; }
  .toc .dots { flex: 1; border-bottom: 1px dotted #9ca3af; transform: translateY(-3px); }
  .toc .pg { color: #0b3c5d; }
  .chapter { page-break-before: always; }
  .chapter h1 {
    font-size: 18pt; color: #0b3c5d; font-weight: normal;
    border-bottom: 1px solid #d1d5db; padding-bottom: 0.35em; margin: 0 0 0.25em 0;
  }
  .chapter .lesson-eyebrow {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 9pt; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: #de5b00; margin: 0 0 0.5em 0;
  }
  h2 { font-size: 14pt; color: #0b3c5d; font-weight: 600; margin: 1.6em 0 0.3em; page-break-after: avoid; }
  h3 { font-size: 12pt; color: #0b3c5d; font-weight: 600; margin: 1.3em 0 0.2em; page-break-after: avoid; }
  p { margin: 0 0 0.85em 0; orphans: 3; widows: 3; }
  a { color: #b34800; text-decoration: underline; text-underline-offset: 2px; }
  strong { color: #0b3c5d; }
  ul, ol { margin: 0.5em 0 1em 1.4em; padding: 0; }
  li { margin: 0.25em 0; }
  blockquote {
    margin: 1em 0; padding: 0.5em 1em;
    border-left: 3px solid #0083de; background: #e6f2fa;
    color: #1f2937; font-style: italic;
  }
  blockquote p:last-child { margin-bottom: 0; }
  blockquote cite { display: block; margin-top: 0.4em; font-style: normal; font-size: 9.5pt; color: #6b7280; }
  .pgmark { position: absolute; font-size: 2px; color: #ffffff; }
`;

const FOOTER_TEMPLATE = `
  <div style="width:100%;font-family:'Helvetica Neue',Arial,sans-serif;font-size:8pt;color:#6b7280;padding:0 0.8in;display:flex;justify-content:space-between;align-items:center;">
    <span><span style="color:#0b3c5d;font-weight:700;">New Life in Christ</span> <span style="color:#9ca3af;">· JesusOnline Ministries</span></span>
    <span>Page <span class="pageNumber"></span></span>
    <span>equip.jesusonline.com</span>
  </div>`;
const HEADER_TEMPLATE = `<div></div>`;

function buildHtml(lessons: Lesson[], pageNums: Map<string, number> | null, withMarkers: boolean): string {
  const toc = `
  <section class="toc">
    <h1>Contents</h1>
    <ol>
      ${lessons.map((l, i) => `
        <li>
          <span class="num">${i + 1}.</span>
          <span>${escText(l.title)}</span>
          <span class="dots"></span>
          <span class="pg">${pageNums ? pageNums.get(l.id) ?? "" : ""}</span>
        </li>`).join("")}
    </ol>
  </section>`;

  const chapters = lessons.map((l, i) => {
    const marker = withMarkers ? `<span class="pgmark">[[MK-${l.id}-KM]]</span>` : "";
    return `<section class="chapter">
      <p class="lesson-eyebrow">Lesson ${i + 1} of ${lessons.length}</p>
      <h1>${marker}${escText(l.title)}</h1>
      ${l.blocks.map(blockToHtml).join("\n")}
    </section>`;
  }).join("\n");

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8" /><title>${escText(TITLE)}</title><style>${CSS}</style></head>
<body>
  <section class="front">
    <h1 class="title">${escText(TITLE)}</h1>
    <p class="subtitle">${escText(SUBTITLE)}</p>
    <span class="rule"></span>
    <p class="brand">
      <strong>JesusOnline Ministries</strong><br />
      A free resource — read or share online at equip.jesusonline.com
    </p>
  </section>
  ${toc}
  ${chapters}
</body>
</html>`;
}

function resolveChromiumPath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const which = spawnSync("which", ["chromium"], { encoding: "utf8" });
  const path = which.stdout?.trim();
  if (path && existsSync(path)) return path;
  throw new Error("No Chromium found. Install via package manager or set PUPPETEER_EXECUTABLE_PATH.");
}

async function renderPdf(browser: Browser, html: string, outPath: string): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.setRequestInterception(true);
    page.on("request", req => {
      if (req.url().startsWith("data:") || req.url().startsWith("about:")) req.continue();
      else req.abort();
    });
    await page.setContent(html, { waitUntil: "load", timeout: 120000 });
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

async function prependCoverAndCompress(interiorPath: string): Promise<void> {
  const PAGE_W = 612;
  const PAGE_H = 792;
  const doc = await PDFDocument.load(readFileSync(interiorPath));
  const coverImage = await doc.embedPng(readFileSync(COVER_PATH));
  const scale = PAGE_W / coverImage.width;
  const drawnH = coverImage.height * scale;
  /* The cover art is taller than Letter at full width. Crop mostly from the
     top (empty wall/foliage) — the "JesusOnline Ministries" line sits near
     the bottom edge and must stay visible. */
  const overflow = Math.max(0, drawnH - PAGE_H);
  const bottomCrop = Math.min(18, overflow);
  const coverPage = doc.insertPage(0, [PAGE_W, PAGE_H]);
  coverPage.drawImage(coverImage, { x: 0, y: -bottomCrop, width: PAGE_W, height: drawnH });

  const tmp = `${OUT_PATH}.uncompressed.tmp.pdf`;
  writeFileSync(tmp, await doc.save());
  const gs = spawnSync(
    "gs",
    ["-sDEVICE=pdfwrite", "-dCompatibilityLevel=1.4", "-dPDFSETTINGS=/ebook", "-dNOPAUSE", "-dQUIET", "-dBATCH", `-sOutputFile=${OUT_PATH}`, tmp],
    { stdio: ["ignore", "inherit", "inherit"] },
  );
  if (gs.status !== 0) {
    unlinkSync(tmp);
    throw new Error(`gs failed with exit code ${gs.status}`);
  }
  const before = statSync(tmp).size;
  const after = statSync(OUT_PATH).size;
  unlinkSync(tmp);
  console.log(`Wrote ${OUT_PATH}\n  uncompressed: ${(before / 1024).toFixed(0)} KB → compressed: ${(after / 1024).toFixed(0)} KB`);
}

async function main(): Promise<void> {
  const lessons = JSON.parse(readFileSync(DATA_PATH, "utf8")) as Lesson[];
  if (lessons.length !== 40) throw new Error(`Expected 40 lessons, found ${lessons.length}`);
  if (!existsSync(COVER_PATH)) throw new Error(`Cover art missing: ${COVER_PATH}`);
  console.log(`Building "${TITLE}" from ${lessons.length} lessons…`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChromiumPath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    const pass1 = `${OUT_PATH}.pass1.tmp.pdf`;
    await renderPdf(browser, buildHtml(lessons, null, true), pass1);
    const pageNums = extractMarkerPages(pass1);
    unlinkSync(pass1);

    const missing = lessons.filter(l => !pageNums.has(l.id));
    if (missing.length) throw new Error(`Lessons without a page marker: ${missing.map(l => l.id).join(", ")}`);

    const interior = `${OUT_PATH}.interior.tmp.pdf`;
    await renderPdf(browser, buildHtml(lessons, pageNums, false), interior);
    await prependCoverAndCompress(interior);
    unlinkSync(interior);
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
