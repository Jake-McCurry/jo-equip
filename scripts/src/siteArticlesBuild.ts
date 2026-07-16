#!/usr/bin/env node
/**
 * Generate on-site long-form articles for ANY channel from the JOM WordPress
 * backend, so users read them on EQUIP instead of the JO App. This is the
 * site-wide generalization of evidenceArticlesBuild.ts (Evidence keeps its
 * own generated file; this script skips evidence sub-topics).
 *
 * Pipeline (per selected sub-topic):
 *   1. Runtime-import channels.ts, walk the selected sub-topics, and collect
 *      every item's app slug (links.app) in site order.
 *   2. Resolve each app slug to a WP post id via slug-mapping.json, fetch the
 *      post's title + content.rendered from the apicontent REST API.
 *   3. Convert the flat WP block HTML into the typed ArticleBlock sequence
 *      shared with bcgArticles (p / h2 / h3 / ul / ol / quote / figure).
 *   4. Figures: download images to src/assets/articles/<subId>/<articleId>-<n>
 *      and reference them as "<subId>/<basename>" (resolved via
 *      siteArticleImages.ts).
 *   5. Trailing "Endnotes" links are replaced by fetching the endnotes post
 *      and appending its list under an "Endnotes" heading.
 *   6. Links pointing at apicontent/app posts are rewritten to internal EQUIP
 *      article URLs when the target article exists on-site (any channel,
 *      including evidence), otherwise to app.jesusonline.com/post/<slug>.
 *   7. Emit AUTO-GENERATED src/data/generated/articles/<subId>.json per sub.
 *
 * CLI:
 *   pnpm --filter @workspace/scripts run site-articles:build -- --channel=church
 *   pnpm --filter @workspace/scripts run site-articles:build -- --sub=soul-prescription
 *   pnpm --filter @workspace/scripts run site-articles:build -- --sub=a,b --force
 *
 * Without --force, sub-topics whose JSON output already exists are skipped,
 * so batches can be re-run safely.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";

type ArticleBlock =
  | { type: "p"; html: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; html: string; cite?: string }
  | { type: "figure"; src: string; alt: string; caption?: string };

interface SiteArticleOut {
  id: string;
  appSlug: string;
  subId: string;
  channelId: string;
  title: string;
  description: string;
  blocks: ArticleBlock[];
}

const ROOT = resolve(process.cwd(), "..");
const HUB = resolve(ROOT, "artifacts/discipleship-hub");
const MAPPING_PATH = resolve(process.cwd(), "data/slug-mapping.json");
const OUT_DIR = resolve(HUB, "src/data/generated/articles");
const IMG_ROOT = resolve(HUB, "src/assets/articles");

const API = "https://apicontent.jesusonline.com/wp-json/wp/v2";
const CONCURRENCY = 6;

const args = process.argv.slice(2);
const channelFilter = args.filter(a => a.startsWith("--channel=")).flatMap(a => a.slice(10).split(",")).filter(Boolean);
const subFilter = args.filter(a => a.startsWith("--sub=")).flatMap(a => a.slice(6).split(",")).filter(Boolean);
const force = args.includes("--force");

/** fetch with a hard timeout and one retry — apicontent occasionally hangs. */
async function fetchT(url: string, tries = 2): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, { signal: AbortSignal.timeout(30_000) });
    } catch (e) {
      if (i >= tries) throw e;
      console.warn(`  ! fetch retry (${i}) for ${url}`);
    }
  }
}

type SlugEntry = { wp_id: number; wp_slug: string };
const mapping: Record<string, SlugEntry> = JSON.parse(readFileSync(MAPPING_PATH, "utf8"));

interface ChannelsModule {
  subTopics: {
    id: string;
    channelId: string;
    items?: { number: number; title: string; articleId?: string; links?: { app?: string } }[];
  }[];
}

function appSlugOf(url: string | undefined): string | undefined {
  const m = url?.match(/app\.jesusonline\.com\/post\/([^/?#]+)/);
  return m?.[1];
}

/** Strip the leading catalog number ("51001-", "22010-148-") from an app slug
 *  and sanitize to a URL-safe id (lowercase, "&" → "and", [a-z0-9-] only). */
function articleIdOf(appSlug: string): string {
  return appSlug
    .replace(/^\d+(-\d+)?-/, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/* ---------- HTML helpers (shared shape with evidenceArticlesBuild.ts) ---------- */

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "\u2019")
    .replace(/&#8216;|&lsquo;/g, "\u2018")
    .replace(/&#8220;|&ldquo;/g, "\u201C")
    .replace(/&#8221;|&rdquo;/g, "\u201D")
    .replace(/&#8211;|&ndash;/g, "\u2013")
    .replace(/&#8212;|&mdash;/g, "\u2014")
    .replace(/&#8230;|&hellip;/g, "\u2026")
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

type RwTarget = { channelId: string; subId: string; id: string };

function cleanInline(html: string, rw: Map<string, RwTarget>): string {
  let s = html;
  s = s.replace(/<img[^>]*>/gi, "");
  const rewrite = (q: string, slug: string) => {
    const target = rw.get(slug) ?? rw.get(articleIdOf(slug));
    if (target) return `href=${q}/channels/${target.channelId}/${target.subId}/${target.id}${q}`;
    return `href=${q}https://app.jesusonline.com/post/${slug}${q}`;
  };
  s = s.replace(
    /href=(["'])(?:https?:)?\/\/apicontent\.jesusonline\.com\/([^"'#?]*?)(?:[?#][^"']*)?\1/gi,
    (_m, q, path) => rewrite(q, path.replace(/\/+$/, "").split("/").pop() ?? ""),
  );
  s = s.replace(
    /href=(["'])https?:\/\/app\.jesusonline\.com\/post\/([^"'#?]+)(?:[?#][^"']*)?\1/gi,
    (_m, q, slug) => rewrite(q, slug),
  );
  s = s.replace(/<(\w+)([^>]*)>/g, (_m, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!["a", "em", "strong", "i", "b", "sup", "sub", "br", "span"].includes(t)) return `<${t}>`;
    if (t === "span") return "";
    if (t === "a") {
      const href = attrs.match(/href=(["'])(.*?)\1/i)?.[2] ?? "";
      const external = /^https?:\/\//i.test(href) && !href.startsWith("https://equip.jesusonline.com");
      return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>`;
    }
    return `<${t}>`;
  });
  s = s.replace(/<\/span>/gi, "");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "\u2019")
    .replace(/&#8216;|&lsquo;/g, "\u2018")
    .replace(/&#8220;|&ldquo;/g, "\u201C")
    .replace(/&#8221;|&rdquo;/g, "\u201D")
    .replace(/&#8211;|&ndash;/g, "\u2013")
    .replace(/&#8212;|&mdash;/g, "\u2014")
    .replace(/&#8230;|&hellip;/g, "\u2026")
    .replace(/&#038;/g, "&amp;")
    .replace(/&#039;/g, "'");
  return s.replace(/\s+/g, " ").trim();
}

function topLevelBlocks(html: string): { tag: string; outer: string; inner: string }[] {
  const out: { tag: string; outer: string; inner: string }[] = [];
  const re = /<(p|h2|h3|h4|ul|ol|figure|blockquote|hr)\b[^>]*\/?>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const tag = m[1].toLowerCase();
    if (tag === "hr") {
      out.push({ tag, outer: m[0], inner: "" });
      continue;
    }
    const close = `</${tag}>`;
    let depth = 1;
    let idx = re.lastIndex;
    const openRe = new RegExp(`<${tag}\\b[^>]*>`, "gi");
    const closeRe = new RegExp(close, "gi");
    while (depth > 0) {
      closeRe.lastIndex = idx;
      const c = closeRe.exec(html);
      if (!c) { idx = html.length; break; }
      openRe.lastIndex = idx;
      const o = openRe.exec(html);
      if (o && o.index < c.index) { depth++; idx = o.index + o[0].length; }
      else { depth--; idx = c.index + c[0].length; }
    }
    out.push({ tag, outer: html.slice(m.index, idx), inner: html.slice(re.lastIndex, Math.max(re.lastIndex, idx - close.length)) });
    re.lastIndex = idx;
  }
  return out;
}

function listItems(inner: string, rw: Map<string, RwTarget>): string[] {
  const items: string[] = [];
  const re = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    const html = cleanInline(m[1], rw);
    if (html) items.push(html);
  }
  return items;
}

/* ---------- image download ---------- */

const imgCounters: Record<string, number> = {};
async function downloadFigure(subId: string, articleId: string, src: string): Promise<string | null> {
  const key = `${subId}/${articleId}`;
  imgCounters[key] = (imgCounters[key] ?? 0) + 1;
  const ext = (extname(new URL(src).pathname) || ".png").toLowerCase();
  const base = `${articleId}-${imgCounters[key]}`;
  const dir = resolve(IMG_ROOT, subId);
  const file = resolve(dir, base + ext);
  if (!existsSync(file)) {
    const r = await fetchT(src);
    if (!r.ok) {
      console.warn(`  ! image fetch failed (${r.status}): ${src}`);
      return null;
    }
    mkdirSync(dir, { recursive: true });
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return `${subId}/${base}`;
}

/* ---------- endnotes ---------- */

async function fetchEndnotes(slug: string, rw: Map<string, RwTarget>): Promise<ArticleBlock[]> {
  const r = await fetchT(`${API}/posts?slug=${encodeURIComponent(slug)}&_fields=content`);
  if (!r.ok) return [];
  const arr = (await r.json()) as { content: { rendered: string } }[];
  if (!arr.length) return [];
  const blocks: ArticleBlock[] = [];
  for (const b of topLevelBlocks(arr[0].content.rendered)) {
    if (b.tag === "ol" || b.tag === "ul") {
      const items = listItems(b.inner, rw);
      if (items.length) blocks.push({ type: b.tag, items });
    } else if (b.tag === "p") {
      const html = cleanInline(b.inner, rw);
      if (html) blocks.push({ type: "p", html });
    }
  }
  return blocks.length ? [{ type: "h2", text: "Endnotes" }, ...blocks] : [];
}

/* ---------- main conversion ---------- */

async function convert(
  subId: string,
  articleId: string,
  html: string,
  rw: Map<string, RwTarget>,
): Promise<ArticleBlock[]> {
  const blocks: ArticleBlock[] = [];
  let endnoteBlocks: ArticleBlock[] = [];
  for (const b of topLevelBlocks(html)) {
    switch (b.tag) {
      case "hr":
        break;
      case "p": {
        const endnoteHref = b.inner.match(
          /href=["'](?:https?:)?\/\/apicontent\.jesusonline\.com\/[^"']*?([\w-]*endnotes[\w-]*)\/?["']/i,
        );
        if (endnoteHref && stripTags(b.inner).toLowerCase() === "endnotes") {
          endnoteBlocks = await fetchEndnotes(endnoteHref[1], rw);
          break;
        }
        const html2 = cleanInline(b.inner, rw);
        if (html2) blocks.push({ type: "p", html: html2 });
        break;
      }
      case "h2":
      case "h3": {
        const text = stripTags(b.inner);
        if (text) blocks.push({ type: b.tag, text });
        break;
      }
      case "h4": {
        const text = stripTags(b.inner);
        if (text) blocks.push({ type: "h3", text });
        break;
      }
      case "ul":
      case "ol": {
        const items = listItems(b.inner, rw);
        if (items.length) blocks.push({ type: b.tag, items });
        break;
      }
      case "blockquote": {
        const inner = b.inner.replace(/<\/?p\b[^>]*>/gi, " ");
        const html2 = cleanInline(inner, rw);
        if (html2) blocks.push({ type: "quote", html: html2 });
        break;
      }
      case "figure": {
        const img = b.outer.match(/<img[^>]*\bsrc=(["'])(.*?)\1[^>]*>/i);
        if (!img) break;
        let src = img[2];
        if (src.startsWith("/")) src = "https://apicontent.jesusonline.com" + src;
        const alt = decodeEntities(b.outer.match(/\balt=(["'])(.*?)\1/i)?.[2] ?? "");
        const capM = b.outer.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
        const caption = capM ? cleanInline(capM[1], rw) : undefined;
        const base = await downloadFigure(subId, articleId, src);
        if (base) {
          blocks.push({
            type: "figure",
            src: base,
            alt: alt || "Article illustration",
            ...(caption ? { caption } : {}),
          });
        }
        break;
      }
    }
  }
  return [...blocks, ...endnoteBlocks];
}

function describeFrom(blocks: ArticleBlock[]): string {
  const first = blocks.find(b => b.type === "p") as { html: string } | undefined;
  if (!first) return "";
  let text = stripTags(first.html);
  if (text.length <= 158) return text;
  text = text.slice(0, 155);
  const cut = text.lastIndexOf(" ");
  return (cut > 80 ? text.slice(0, cut) : text) + "\u2026";
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const item = items[i++];
        try {
          await fn(item);
        } catch (e) {
          console.warn(`  ! item failed: ${(e as Error).message}`);
        }
      }
    }),
  );
}

async function main() {
  const channelsUrl = pathToFileURL(resolve(HUB, "src/data/channels.ts")).href;
  const { subTopics } = (await import(channelsUrl)) as ChannelsModule;

  /* Rewrite map covers ALL channels (incl. evidence, which is already live)
     so cross-links between articles resolve to internal URLs wherever the
     target either already exists or is part of this run. */
  const rw = new Map<string, RwTarget>();
  const existingJson = existsSync(OUT_DIR) ? new Set(readdirSync(OUT_DIR).map(f => f.replace(/\.json$/, ""))) : new Set<string>();
  const selected = subTopics.filter(
    s =>
      s.channelId !== "evidence" &&
      (channelFilter.length ? channelFilter.includes(s.channelId) : true) &&
      (subFilter.length ? subFilter.includes(s.id) : true),
  );
  const inScope = new Set(selected.map(s => s.id));

  for (const sub of subTopics) {
    const onSite =
      sub.channelId === "evidence" || inScope.has(sub.id) || existingJson.has(sub.id);
    if (!onSite) continue;
    for (const item of sub.items ?? []) {
      const appSlug = appSlugOf(item.links?.app);
      if (!appSlug || !mapping[appSlug]) continue;
      const id = articleIdOf(appSlug);
      const target = { channelId: sub.channelId, subId: sub.id, id };
      if (!rw.has(appSlug)) rw.set(appSlug, target);
      if (!rw.has(id)) rw.set(id, target);
    }
  }

  for (const sub of selected) {
    const outPath = resolve(OUT_DIR, `${sub.id}.json`);
    if (existsSync(outPath) && !force) {
      console.log(`= ${sub.channelId}/${sub.id} — exists, skipped (use --force to regenerate)`);
      continue;
    }
    const work: { appSlug: string; id: string; itemTitle: string }[] = [];
    for (const item of sub.items ?? []) {
      const appSlug = appSlugOf(item.links?.app);
      if (!appSlug) continue;
      if (!mapping[appSlug]) {
        console.warn(`  ! no slug mapping for ${appSlug} — skipped (APP button stays)`);
        continue;
      }
      work.push({ appSlug, id: articleIdOf(appSlug), itemTitle: item.title });
    }
    if (!work.length) {
      console.log(`= ${sub.channelId}/${sub.id} — no mappable app items, skipped`);
      continue;
    }
    console.log(`▶ ${sub.channelId}/${sub.id} (${work.length} items)`);
    const results = new Map<string, SiteArticleOut>();
    await pool(work, CONCURRENCY, async w => {
      const entry = mapping[w.appSlug];
      const r = await fetchT(`${API}/posts/${entry.wp_id}?_fields=id,slug,title,content`);
      if (!r.ok) {
        console.warn(`  ! fetch failed (${r.status}) for ${w.appSlug} — skipped`);
        return;
      }
      const post = (await r.json()) as { title: { rendered: string }; content: { rendered: string } };
      const title = decodeEntities(post.title.rendered).replace(/^[\d.\-]+\s+/, "").trim() || w.itemTitle;
      const blocks = await convert(sub.id, w.id, post.content.rendered, rw);
      if (!blocks.length) {
        console.warn(`  ! empty conversion for ${w.appSlug} — skipped`);
        return;
      }
      results.set(w.id, {
        id: w.id,
        appSlug: w.appSlug,
        subId: sub.id,
        channelId: sub.channelId,
        title,
        description: describeFrom(blocks),
        blocks,
      });
      console.log(`  ✓ ${w.appSlug} → ${w.id} (${blocks.length} blocks)`);
    });
    /* Preserve site order. */
    const out = work.map(w => results.get(w.id)).filter((a): a is SiteArticleOut => !!a);
    if (!out.length) {
      console.warn(`  ! nothing generated for ${sub.id}`);
      continue;
    }
    const badIds = out.filter(a => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(a.id));
    if (badIds.length) {
      throw new Error(`non-URL-safe article ids in ${sub.id}: ${badIds.map(a => a.id).join(", ")}`);
    }
    mkdirSync(OUT_DIR, { recursive: true });
    writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`  → wrote ${out.length}/${work.length} articles → ${outPath}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
