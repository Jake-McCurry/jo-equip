#!/usr/bin/env node
/**
 * Generate branded PDFs for the "Bible Study Methods" long-form articles.
 *
 * Like bcg:pdf (and unlike articles:build, which pulls bodies from the JOM
 * WordPress REST API), these articles are authored locally as typed blocks in
 * artifacts/discipleship-hub/src/data/bibleStudyMethods.ts. This script imports
 * that data module, renders each article through the same branded print
 * template, and writes one PDF per article to
 * artifacts/discipleship-hub/public/articles/bsm/<id>.pdf.
 *
 * Bible Study Methods articles are text-only (no figures), so there is no
 * image inlining or Ghostscript downsampling step — the PDFs are already tiny.
 *
 * It also emits src/data/bsmArticlePdfs.ts — a tiny manifest the article page
 * uses to decide whether to show a "Download PDF" button.
 *
 * CLI:
 *   pnpm --filter @workspace/scripts run bsm:pdf
 *   pnpm --filter @workspace/scripts run bsm:pdf -- --id=soap-method
 *   pnpm --filter @workspace/scripts run bsm:pdf -- --concurrency=4
 */
import { writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import puppeteer, { type Browser } from "puppeteer";

/* Local mirror of the ArticleBlock/BibleStudyMethodArticle shapes from
   artifacts/discipleship-hub/src/data/bibleStudyMethods.ts. Duplicated (rather
   than imported as types) so this leaf script stays decoupled from the artifact
   package — the data is loaded at runtime via a dynamic import. Bible Study
   Methods articles are text-only, so "figure" blocks are ignored if present. */
type ArticleBlock =
  | { type: "p"; html: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; html: string; cite?: string }
  | { type: "figure"; src: string; alt: string; caption?: string };
interface BsmArticle {
  id: string;
  title: string;
  description: string;
  blocks: ArticleBlock[];
}

const ROOT = resolve(process.cwd(), "..");
const HUB = resolve(ROOT, "artifacts/discipleship-hub");
const DATA_PATH = resolve(HUB, "src/data/bibleStudyMethods.ts");
const OUT_DIR = resolve(HUB, "public/articles/bsm");
const MANIFEST_PATH = resolve(HUB, "src/data/bsmArticlePdfs.ts");

/* Public-facing URLs for cover source line + internal-link rewriting. */
const SITE = "https://equip.jesusonline.com";
const SUB_PATH = "/channels/church/bible-study-methods";

const args = process.argv.slice(2);
const argMap: Record<string, string | boolean> = {};
for (const a of args) {
  const [k, v] = a.replace(/^--/, "").split("=");
  argMap[k] = v ?? true;
}
const ID_FILTER: Set<string> | undefined = typeof argMap.id === "string"
  ? new Set(argMap.id.split(",").map(s => s.trim()).filter(Boolean))
  : undefined;
const CONCURRENCY = Math.max(1, Number(argMap.concurrency ?? 4) || 4);

/* Resolve a Chromium binary. Puppeteer's bundled-Chrome installer fails in
   this sandbox, so depend on the Nix-installed system Chromium. Override with
   PUPPETEER_EXECUTABLE_PATH in other environments. */
function resolveChromiumPath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const which = spawnSync("which", ["chromium"], { encoding: "utf8" });
  const path = which.stdout?.trim();
  if (path && existsSync(path)) return path;
  throw new Error(
    "No Chromium found. Install via Replit's package manager (`installSystemDependencies([\"chromium\"])`) or set PUPPETEER_EXECUTABLE_PATH.",
  );
}

function escText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* Rewrite root-relative hrefs ("/newsletter", "/channels/...") to absolute
   equip.jesusonline.com URLs so links remain clickable in the PDF. Leaves
   mailto:, http(s):, protocol-relative (//), and anchor (#) links untouched. */
function rewriteLinks(html: string): string {
  return html.replace(
    /href=(["'])\/(?!\/)([^"']*)\1/g,
    (_m, q: string, path: string) => `href=${q}${SITE}/${path}${q}`,
  );
}

function blockToHtml(b: ArticleBlock): string {
  switch (b.type) {
    case "h2":
      return `<h2>${escText(b.text)}</h2>`;
    case "h3":
      return `<h3>${escText(b.text)}</h3>`;
    case "p":
      return `<p>${rewriteLinks(b.html)}</p>`;
    case "ul":
      return `<ul>${b.items.map(i => `<li>${rewriteLinks(i)}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${b.items.map(i => `<li>${rewriteLinks(i)}</li>`).join("")}</ol>`;
    case "quote":
      return `<blockquote><p>${rewriteLinks(b.html)}</p>${b.cite ? `<cite>— ${escText(b.cite)}</cite>` : ""}</blockquote>`;
    case "figure":
      return ""; // Bible Study Methods articles are text-only
  }
}

/* Branded HTML template — mirrors scripts/src/bcgPdfBuild.ts so these PDFs are
   visually consistent with the rest of the JO EQUIP article library. */
function renderTemplate({ title, bodyHtml, sourceUrl }: { title: string; bodyHtml: string; sourceUrl: string }): string {
  const escTitle = escText(title);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escTitle}</title>
<style>
  @page { size: Letter; margin: 0.85in 0.8in 0.95in 0.8in; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    color: #1f2937;
    font-size: 11.5pt;
    line-height: 1.55;
  }
  .cover {
    page-break-after: always;
    padding: 1.4in 0.2in 0 0.2in;
    text-align: left;
  }
  .cover .eyebrow {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    margin-bottom: 0.9em;
    line-height: 1.15;
  }
  .cover .eyebrow .brand-name {
    display: block;
    font-size: 18pt;
    font-weight: 700;
    color: #002f55;
    letter-spacing: -0.005em;
  }
  .cover .eyebrow .brand-tag {
    display: block;
    margin-top: 0.18em;
    font-size: 10.5pt;
    font-weight: 400;
    color: #6b7280;
    letter-spacing: 0.01em;
  }
  .cover .series-lead {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 17pt;
    line-height: 1.2;
    color: #0083de;
    font-weight: 600;
    letter-spacing: 0.005em;
    margin: 0 0 0.25em 0;
  }
  .cover h1 {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 30pt;
    line-height: 1.18;
    color: #002f55;
    font-weight: normal;
    margin: 0 0 0.55em 0;
  }
  .cover .rule {
    display: block;
    width: 96px; height: 4px;
    background: #de5b00;
    margin: 0.4in 0 0.45in 0;
  }
  .cover .meta {
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    color: #4b5563;
    line-height: 1.6;
  }
  .cover .meta strong { color: #002f55; font-weight: 600; }
  .cover .footer-block {
    margin-top: 2.4in;
    padding-top: 0.25in;
    border-top: 1px solid #e5e7eb;
    font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
    font-size: 9pt;
    color: #6b7280;
  }
  .cover .footer-block .brand {
    color: #002f55; font-weight: 700;
  }
  .cover .footer-block .brand-tag {
    color: #6b7280; font-weight: 400;
  }

  /* Body content */
  .article { padding-top: 0.1in; }
  .article h1 {
    font-size: 18pt; color: #002f55; font-weight: normal;
    border-bottom: 1px solid #d1d5db; padding-bottom: 0.35em; margin: 0 0 0.6em 0;
  }
  .article h2 {
    font-size: 14pt; color: #002f55; font-weight: 600;
    margin: 1.6em 0 0.3em; page-break-after: avoid;
  }
  .article h3 {
    font-size: 12pt; color: #002f55; font-weight: 600;
    margin: 1.3em 0 0.2em; page-break-after: avoid;
  }
  .article p { margin: 0 0 0.85em 0; orphans: 3; widows: 3; }
  .article a { color: #b34800; text-decoration: none; }
  .article a:hover { text-decoration: underline; }
  .article strong { color: #002f55; }
  .article ul, .article ol { margin: 0.5em 0 1em 1.4em; padding: 0; }
  .article li { margin: 0.25em 0; }
  .article blockquote {
    margin: 1em 0; padding: 0.5em 1em;
    border-left: 3px solid #0083de; background: #f4f7fb;
    color: #1f2937; font-style: italic;
  }
  .article blockquote p:last-child { margin-bottom: 0; }
  .article blockquote cite {
    display: block; margin-top: 0.4em; font-style: normal;
    font-size: 9.5pt; color: #6b7280;
  }
</style>
</head>
<body>
  <section class="cover">
    <div class="eyebrow">
      <span class="brand-name">JesusOnline Equip</span>
      <span class="brand-tag">Ministry Resources Hub</span>
    </div>
    <div class="series-lead">Bible Study Methods</div>
    <h1>${escTitle}</h1>
    <span class="rule"></span>
    <div class="meta">
      <strong>A free resource from JesusOnline.</strong><br />
      Read or share online: <span style="color:#002f55">${escText(sourceUrl)}</span>
    </div>
    <div class="footer-block">
      <span class="brand">JesusOnline Equip</span> <span class="brand-tag">· Ministry Resources Hub</span> · equip.jesusonline.com<br />
      Free media and discipleship resources for pastors, leaders, and growing disciples.
    </div>
  </section>
  <section class="article">
    <h1>${escTitle}</h1>
    ${bodyHtml}
  </section>
</body>
</html>`;
}

const FOOTER_TEMPLATE = `
  <div style="width:100%;font-family:'Helvetica Neue',Arial,sans-serif;font-size:8pt;color:#6b7280;padding:0 0.8in;display:flex;justify-content:space-between;align-items:center;">
    <span><span style="color:#002f55;font-weight:700;">JesusOnline Equip</span> <span style="color:#9ca3af;">· Ministry Resources Hub</span></span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    <span>equip.jesusonline.com</span>
  </div>`;
const HEADER_TEMPLATE = `<div></div>`;

async function buildOne(
  browser: Browser,
  article: BsmArticle,
): Promise<{ ok: boolean; bytes?: number; error?: string }> {
  try {
    const bodyHtml = article.blocks.map(blockToHtml).join("\n");
    const html = renderTemplate({
      title: article.title,
      bodyHtml,
      sourceUrl: `equip.jesusonline.com${SUB_PATH}/${article.id}`,
    });
    const outPath = resolve(OUT_DIR, `${article.id}.pdf`);
    const page = await browser.newPage();
    try {
      /* Defense-in-depth: text-only articles need no network at all, so block
         every request. */
      await page.setRequestInterception(true);
      page.on("request", req => req.abort());
      await page.setContent(html, { waitUntil: "load", timeout: 30000 });
      await page.pdf({
        path: outPath,
        format: "Letter",
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: HEADER_TEMPLATE,
        footerTemplate: FOOTER_TEMPLATE,
        margin: { top: "0.6in", bottom: "0.7in", left: "0.8in", right: "0.8in" },
      });
    } finally {
      await page.close();
    }
    return { ok: true, bytes: statSync(outPath).size };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function pool<T, R>(items: T[], n: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function runOne() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, runOne));
  return results;
}

function writeManifest(entries: { id: string; bytes: number }[]) {
  const sorted = [...entries].sort((a, b) => a.id.localeCompare(b.id));
  const lines = sorted
    .map(e => `  ${JSON.stringify(e.id)}: { bytes: ${e.bytes} },`)
    .join("\n");
  const ts = `/**
 * AUTO-GENERATED by @workspace/scripts bsm:pdf.
 * Do not hand-edit — regenerate with:
 *   pnpm --filter @workspace/scripts run bsm:pdf
 *
 * Map of Bible Study Method article id → metadata for a locally hosted PDF at
 * /articles/bsm/<id>.pdf. The article page uses hasBsmArticlePdf() to decide
 * whether to show a "Download PDF" button.
 */

export interface BsmArticlePdfMeta {
  bytes: number;
}

export const bsmArticlePdfs: Record<string, BsmArticlePdfMeta> = {
${lines}
};

export function hasBsmArticlePdf(id: string | undefined | null): boolean {
  return !!id && id in bsmArticlePdfs;
}

export function getBsmArticlePdfMeta(id: string): BsmArticlePdfMeta | undefined {
  return bsmArticlePdfs[id];
}
`;
  writeFileSync(MANIFEST_PATH, ts);
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  /* Load the locally-authored article data at runtime. Dynamic import keeps
     this leaf script decoupled from the artifact package's tsconfig. */
  const mod = (await import(pathToFileURL(DATA_PATH).href)) as { bibleStudyMethods: BsmArticle[] };
  let articles = mod.bibleStudyMethods;
  if (ID_FILTER) {
    const known = new Set(articles.map(a => a.id));
    const unknown = [...ID_FILTER].filter(id => !known.has(id));
    if (unknown.length) console.warn(`WARNING: --id contained ${unknown.length} unknown article id(s): ${unknown.join(", ")}`);
    articles = articles.filter(a => ID_FILTER.has(a.id));
    if (articles.length === 0) {
      console.error("No matching articles to build — check the --id values.");
      process.exit(1);
    }
  }

  console.log(`Generating ${articles.length} Bible Study Method PDF(s) with concurrency=${CONCURRENCY}...`);
  const t0 = Date.now();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChromiumPath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const built: { id: string; bytes: number }[] = [];
  const failed: string[] = [];
  try {
    const results = await pool(articles, CONCURRENCY, async a => ({ id: a.id, ...(await buildOne(browser, a)) }));
    for (const r of results) {
      if (r.ok) {
        built.push({ id: r.id, bytes: r.bytes! });
        console.log(`  ✓ ${r.id}  ${(r.bytes! / 1024).toFixed(0)}KB`);
      } else {
        failed.push(`${r.id}: ${r.error}`);
        console.log(`  ✗ ${r.id}  ERR: ${r.error}`);
      }
    }
  } finally {
    await browser.close();
  }

  /* On a full run, rewrite the manifest from the freshly built set. On a
     filtered run, merge into the existing manifest so we don't drop ids. */
  let manifestEntries = built;
  if (ID_FILTER && existsSync(MANIFEST_PATH)) {
    const existing = (await import(pathToFileURL(MANIFEST_PATH).href + `?t=${Date.now()}`)) as {
      bsmArticlePdfs: Record<string, { bytes: number }>;
    };
    const merged: Record<string, number> = {};
    for (const [id, m] of Object.entries(existing.bsmArticlePdfs)) merged[id] = m.bytes;
    for (const e of built) merged[e.id] = e.bytes;
    manifestEntries = Object.entries(merged).map(([id, bytes]) => ({ id, bytes }));
  }
  writeManifest(manifestEntries);

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const totalBytes = built.reduce((s, e) => s + e.bytes, 0);
  console.log(`\n=== Summary (${elapsed}s) ===`);
  console.log(`  generated: ${built.length}`);
  console.log(`  failed:    ${failed.length}`);
  console.log(`  manifest:  ${manifestEntries.length} entries, ${(totalBytes / 1024).toFixed(0)} KB this run`);
  if (failed.length) {
    console.log(`\nFailures:`);
    failed.forEach(f => console.log(`  - ${f}`));
    process.exitCode = 1;
  }
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
