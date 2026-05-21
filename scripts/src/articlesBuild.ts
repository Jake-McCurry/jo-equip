#!/usr/bin/env node
/**
 * Generate branded PDFs for every JesusOnline app article EQUIP links to.
 *
 * Pipeline:
 *   1. Read slug-mapping.json (app slug → apicontent WP slug/id) — generated
 *      offline by the resolution script. 596 of 606 links currently resolve.
 *   2. For each resolved entry, fetch /wp-json/wp/v2/posts/<id> to get the
 *      latest title + content.rendered + modified timestamp.
 *   3. Skip if our cached copy already matches the upstream `modified`
 *      timestamp (incremental builds — re-runs only touch changed posts).
 *   4. Strip the leading catalog number from the title for display, light-
 *      sanitize the body HTML (drop scripts, normalize image URLs to
 *      absolute), and inject into a branded HTML template.
 *   5. Use puppeteer to render to PDF at US Letter, write to
 *      artifacts/discipleship-hub/public/articles/<appSlug>.pdf.
 *   6. Emit src/data/articles.ts manifest used by the channels page to
 *      activate per-item PDF buttons.
 *
 * CLI:
 *   pnpm --filter @workspace/scripts run articles:build           # all 596
 *   pnpm --filter @workspace/scripts run articles:build -- --limit=3
 *   pnpm --filter @workspace/scripts run articles:build -- --slug=<app-slug>
 *   pnpm --filter @workspace/scripts run articles:build -- --force
 *
 * Performance: ~1.5s per PDF, 4-way parallel → ~4 min for the full 596.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import puppeteer, { type Browser } from "puppeteer";

/* Resolve a Chromium binary. Puppeteer's bundled-Chrome installer fails in
   this sandbox (unzip segfault, glibc mismatch), so we depend on the
   Nix-installed system Chromium. The exact Nix store path changes across
   reinstalls, so fall back to `which chromium`. Override with
   PUPPETEER_EXECUTABLE_PATH when running in CI / other environments. */
function resolveChromiumPath(): string {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  const which = spawnSync("which", ["chromium"], { encoding: "utf8" });
  const path = which.stdout?.trim();
  if (path && existsSync(path)) return path;
  throw new Error(
    "No Chromium found. Install via Replit's package manager (`installSystemDependencies([\"chromium\"])`) or set PUPPETEER_EXECUTABLE_PATH.",
  );
}

const ROOT = resolve(process.cwd(), "..");
const MAPPING_PATH = resolve(process.cwd(), "data/slug-mapping.json");
const OUT_DIR = resolve(ROOT, "artifacts/discipleship-hub/public/articles");
const MANIFEST_PATH = resolve(ROOT, "artifacts/discipleship-hub/src/data/articles.ts");
const CACHE_PATH = resolve(process.cwd(), "data/articles-cache.json");

type SlugEntry = { wp_id: number; wp_slug: string; method: "exact" | "prefix" | "fuzzy" };
type WpPost = {
  id: number;
  slug: string;
  modified: string;
  title: { rendered: string };
  content: { rendered: string };
  link: string;
};
type CacheEntry = { wp_id: number; modified: string; bytes: number; title: string };
type Manifest = Record<string, CacheEntry>;

const args = process.argv.slice(2);
const argMap: Record<string, string | boolean> = {};
for (const a of args) {
  const [k, v] = a.replace(/^--/, "").split("=");
  argMap[k] = v ?? true;
}
const LIMIT = argMap.limit ? Number(argMap.limit) : undefined;
const SLUG_FILTER = typeof argMap.slug === "string" ? argMap.slug : undefined;
const FORCE = !!argMap.force;
const CONCURRENCY = Number(argMap.concurrency ?? 4);

/* Strip the leading catalog number ("32001 ", "75200.2 ", "93662-3-1 ", etc.)
   from a title for nicer display on the PDF cover. The leading numeric token
   is JOM's internal cataloging — readers see "Building Blocks for Maturity"
   instead of "32001 Building Blocks for Maturity". */
function stripLeadingNumber(title: string): string {
  return title.replace(/^[\d][\d.\-]*\s+/, "").trim();
}

/* Decode the handful of HTML entities WordPress emits in titles (apostrophes,
   ampersands, em dashes). Avoids pulling in a heavy library. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#8230;/g, "…")
    .replace(/&hellip;/g, "…")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/* Light sanitization of the WP content.rendered HTML:
   - drop any <script>/<iframe> (defense in depth — WP shouldn't ever emit
     these to public REST output, but if it does we don't want them in print)
   - rewrite relative image src to absolute apicontent URLs so puppeteer can
     load them
   - kill WP's "continue reading" link-more paragraph if present */
function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<(object|embed|form|svg|math|link|meta|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<(object|embed|link|meta|input)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
    .replace(/(href|src)\s*=\s*"\s*javascript:[^"]*"/gi, '$1="#"')
    .replace(/(href|src)\s*=\s*'\s*javascript:[^']*'/gi, "$1='#'")
    .replace(/(href|src)\s*=\s*"\s*data:(?!image\/)[^"]*"/gi, '$1="#"')
    .replace(/<p class="link-more">[\s\S]*?<\/p>/gi, "")
    /* Images legitimately live on apicontent — rewrite root-relative src so
       puppeteer can fetch them during render. */
    .replace(/src="\/(?!\/)/g, 'src="https://apicontent.jesusonline.com/')
    /* Hrefs must NEVER point at the internal WP backend (apicontent). The
       public-facing app uses /post/<slug> regardless of the WP category
       prefix (e.g. /uncategorized/, /pwa/time-with-god/, /video/...). For
       any apicontent href, drop the category path and rewrite to
       https://app.jesusonline.com/post/<last-slug>. Preserve trailing
       query/hash. Handles "double-quoted, 'single-quoted; absolute
       http(s) and protocol-relative //apicontent forms. */
    .replace(
      /href=(["'])(?:https?:)?\/\/apicontent\.jesusonline\.com\/([^"'#?]*?)([?#][^"']*)?\1/gi,
      (_m, q: string, path: string, suffix: string | undefined) => {
        const slug = path.replace(/\/+$/, "").split("/").filter(Boolean).pop() ?? "";
        return `href=${q}https://app.jesusonline.com/post/${slug}${suffix ?? ""}${q}`;
      },
    )
    /* Root-relative hrefs from WP REST (rare — REST usually emits absolute):
       same treatment, use last segment as the post slug. */
    .replace(
      /href=(["'])\/(?!\/)([^"'#?]*?)([?#][^"']*)?\1/g,
      (_m, q: string, path: string, suffix: string | undefined) => {
        const slug = path.replace(/\/+$/, "").split("/").filter(Boolean).pop() ?? "";
        return `href=${q}https://app.jesusonline.com/post/${slug}${suffix ?? ""}${q}`;
      },
    );
}

/* Branded HTML template. Inline CSS keeps puppeteer fast (no external font
   fetches). Cover: navy block with title + orange divider + JO branding.
   Body: classic serif print typography, brand-navy headings, orange links. */
function renderTemplate({
  title,
  bodyHtml,
  sourceUrl,
}: { title: string; bodyHtml: string; sourceUrl: string }): string {
  const escTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;");
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
  .article h4, .article h5, .article h6 {
    font-size: 11pt; color: #002f55; font-weight: 600;
    margin: 1.1em 0 0.2em;
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
  .article img {
    max-width: 100% !important; height: auto !important;
    page-break-inside: avoid; margin: 0.7em 0;
  }
  .article figure { margin: 0.9em 0; page-break-inside: avoid; }
  .article figcaption {
    font-size: 9.5pt; color: #6b7280; text-align: center; margin-top: 0.3em;
  }
  .article table {
    border-collapse: collapse; margin: 1em 0; font-size: 10.5pt;
    page-break-inside: avoid; width: 100%;
  }
  .article th, .article td {
    border: 1px solid #d1d5db; padding: 6px 8px; vertical-align: top;
  }
  .article th { background: #f3f4f6; color: #002f55; }
  .article hr {
    border: 0; border-top: 1px solid #e5e7eb; margin: 1.4em 0;
  }
</style>
</head>
<body>
  <section class="cover">
    <div class="eyebrow">
      <span class="brand-name">JesusOnline Equip</span>
      <span class="brand-tag">Ministry Resources Hub</span>
    </div>
    <h1>${escTitle}</h1>
    <span class="rule"></span>
    <div class="meta">
      <strong>A free resource from JesusOnline Ministries.</strong><br />
      Read or share online: <span style="color:#002f55">${sourceUrl.replace(/^https?:\/\//, "")}</span>
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

/* puppeteer header/footer templates — small JO branding + page numbers. */
const FOOTER_TEMPLATE = `
  <div style="width:100%;font-family:'Helvetica Neue',Arial,sans-serif;font-size:8pt;color:#6b7280;padding:0 0.8in;display:flex;justify-content:space-between;align-items:center;">
    <span><span style="color:#002f55;font-weight:700;">JesusOnline Equip</span> <span style="color:#9ca3af;">· Ministry Resources Hub</span></span>
    <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    <span>equip.jesusonline.com</span>
  </div>`;
const HEADER_TEMPLATE = `<div></div>`;

async function fetchPost(wpId: number): Promise<WpPost | null> {
  const url = `https://apicontent.jesusonline.com/wp-json/wp/v2/posts/${wpId}?_fields=id,slug,modified,title,content,link`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return (await res.json()) as WpPost;
}

async function buildOne(
  browser: Browser,
  appSlug: string,
  entry: SlugEntry,
  cache: Manifest,
): Promise<{ ok: boolean; skipped: boolean; bytes?: number; error?: string; title?: string }> {
  try {
    const post = await fetchPost(entry.wp_id);
    if (!post) return { ok: false, skipped: false, error: `wp post ${entry.wp_id} not found` };

    const outPath = resolve(OUT_DIR, `${appSlug}.pdf`);
    const cached = cache[appSlug];
    if (!FORCE && cached && cached.modified === post.modified && cached.wp_id === entry.wp_id && existsSync(outPath)) {
      return { ok: true, skipped: true, bytes: cached.bytes, title: cached.title };
    }

    const displayTitle = stripLeadingNumber(decodeEntities(post.title.rendered));
    const bodyHtml = sanitizeHtml(post.content.rendered);
    const html = renderTemplate({
      title: displayTitle,
      bodyHtml,
      sourceUrl: `app.jesusonline.com/post/${appSlug}`,
    });

    const page = await browser.newPage();
    try {
      /* Defense-in-depth: only allow requests to apicontent (for images) and
         data: URIs. Blocks any exfiltration attempt if upstream HTML is ever
         compromised. */
      await page.setRequestInterception(true);
      page.on("request", req => {
        const url = req.url();
        if (url.startsWith("data:") || url.startsWith("https://apicontent.jesusonline.com/")) {
          req.continue();
        } else {
          req.abort();
        }
      });
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

    const bytes = statSync(outPath).size;
    cache[appSlug] = { wp_id: entry.wp_id, modified: post.modified, bytes, title: displayTitle };
    return { ok: true, skipped: false, bytes, title: displayTitle };
  } catch (e) {
    return { ok: false, skipped: false, error: (e as Error).message };
  }
}

/* Process a worklist with a fixed concurrency. Plain promise-pool. */
async function pool<T, R>(
  items: T[],
  n: number,
  worker: (item: T, i: number) => Promise<R>,
  onProgress?: (done: number, total: number, last: R) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  let done = 0;
  async function runOne() {
    while (cursor < items.length) {
      const i = cursor++;
      const r = await worker(items[i]!, i);
      results[i] = r;
      done++;
      onProgress?.(done, items.length, r);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, runOne));
  return results;
}

function writeManifest(manifest: Manifest) {
  const sorted = Object.keys(manifest).sort();
  const entries = sorted
    .map(slug => {
      const m = manifest[slug]!;
      const t = JSON.stringify(m.title);
      return `  ${JSON.stringify(slug)}: { title: ${t}, bytes: ${m.bytes}, modified: ${JSON.stringify(m.modified)} },`;
    })
    .join("\n");
  const ts = `/**
 * AUTO-GENERATED by @workspace/scripts articles:build.
 * Do not hand-edit — regenerate with:
 *   pnpm --filter @workspace/scripts run articles:build
 *
 * Map of app.jesusonline.com slug → metadata for a locally hosted PDF at
 * /articles/<slug>.pdf. The channels page uses hasArticlePdf() to decide
 * whether to activate an item's PDF button.
 */

export interface ArticlePdfMeta {
  title: string;
  bytes: number;
  modified: string;
}

export const articlePdfs: Record<string, ArticlePdfMeta> = {
${entries}
};

/** Extract the app-slug portion of an app.jesusonline.com/post/<slug> URL. */
export function extractAppSlug(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  const m = url.match(/app\\.jesusonline\\.com\\/post\\/([^/?#]+)/);
  return m?.[1];
}

export function hasArticlePdf(appSlug: string | undefined | null): boolean {
  return !!appSlug && appSlug in articlePdfs;
}

export function getArticlePdfMeta(appSlug: string): ArticlePdfMeta | undefined {
  return articlePdfs[appSlug];
}
`;
  writeFileSync(MANIFEST_PATH, ts);
}

async function main() {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const mapping = JSON.parse(readFileSync(MAPPING_PATH, "utf8")) as Record<string, SlugEntry>;
  let cache: Manifest = {};
  if (existsSync(CACHE_PATH)) {
    try { cache = JSON.parse(readFileSync(CACHE_PATH, "utf8")) as Manifest; } catch { cache = {}; }
  }

  let entries = Object.entries(mapping);
  if (SLUG_FILTER) entries = entries.filter(([s]) => s === SLUG_FILTER);
  if (LIMIT) entries = entries.slice(0, LIMIT);

  /* Prune cache entries whose slug is no longer in the mapping (only on a
     full run — partial runs with --slug/--limit must not delete other slugs).
     This keeps the emitted manifest aligned with the active mapping. */
  const isFullRun = !SLUG_FILTER && !LIMIT;
  if (isFullRun) {
    for (const k of Object.keys(cache)) {
      if (!(k in mapping)) delete cache[k];
    }
  }

  console.log(`Generating ${entries.length} article PDF(s) with concurrency=${CONCURRENCY}...`);
  const t0 = Date.now();
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: resolveChromiumPath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  let okCount = 0, skippedCount = 0, failed: string[] = [];
  let sinceFlush = 0;
  const flushCache = () => {
    writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
    writeManifest(cache);
    sinceFlush = 0;
  };
  try {
    await pool(entries, CONCURRENCY, async ([appSlug, entry]) => {
      const r = await buildOne(browser, appSlug, entry, cache);
      return { appSlug, ...r };
    }, (done, total, last) => {
      const tag = last.skipped ? "·" : last.ok ? "✓" : "✗";
      const note = last.skipped ? " (cached)" : last.ok ? ` ${(last.bytes! / 1024).toFixed(0)}KB` : ` ERR: ${last.error}`;
      const pct = ((done / total) * 100).toFixed(1);
      process.stdout.write(`  [${done}/${total} ${pct}%] ${tag} ${last.appSlug}${note}\n`);
      if (last.ok && last.skipped) skippedCount++;
      else if (last.ok) okCount++;
      else failed.push(`${last.appSlug}: ${last.error}`);
      // Incremental cache flush every 20 successful PDFs so a killed run
      // resumes from the last flush instead of restarting at zero.
      if (last.ok && !last.skipped) sinceFlush++;
      if (sinceFlush >= 20) flushCache();
    });
  } finally {
    flushCache();
    await browser.close();
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  const totalBytes = Object.values(cache).reduce((sum, m) => sum + m.bytes, 0);
  console.log(`\n=== Summary (${elapsed}s) ===`);
  console.log(`  generated: ${okCount}`);
  console.log(`  cached:    ${skippedCount}`);
  console.log(`  failed:    ${failed.length}`);
  console.log(`  manifest:  ${Object.keys(cache).length} entries, ${(totalBytes / 1024 / 1024).toFixed(1)} MB total`);
  if (failed.length) {
    console.log(`\nFailures:`);
    failed.slice(0, 20).forEach(f => console.log(`  - ${f}`));
    if (failed.length > 20) console.log(`  ... and ${failed.length - 20} more`);
  }
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
