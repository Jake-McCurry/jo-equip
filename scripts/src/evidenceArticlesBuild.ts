#!/usr/bin/env node
/**
 * Generate on-site long-form articles for the EVIDENCE channel from the JOM
 * WordPress backend, so users read them on EQUIP instead of the JO App.
 *
 * Pipeline:
 *   1. Runtime-import channels.ts, walk the evidence sub-topics, and collect
 *      every item's app slug (links.app) in site order.
 *   2. Resolve each app slug to a WP post id via slug-mapping.json, fetch the
 *      post's title + content.rendered from the apicontent REST API.
 *   3. Convert the flat WP block HTML into the typed ArticleBlock sequence
 *      shared with bcgArticles/bibleStudyMethods (p / h2 / h3 / ul / ol /
 *      quote / figure). Inline HTML (em, strong, sup, a) is preserved.
 *   4. Figures: download images to src/assets/evidence/<articleId>-<n>.<ext>
 *      and reference them by basename (resolved via evidenceImages.ts).
 *   5. Trailing "Endnotes" links are replaced by fetching the endnotes post
 *      and appending its list under an "Endnotes" heading.
 *   6. Links pointing at apicontent are rewritten: to the internal EQUIP
 *      article when the target is another evidence article, otherwise to the
 *      public app.jesusonline.com/post/<slug> URL.
 *   7. Emit AUTO-GENERATED src/data/evidenceArticles.ts.
 *
 * CLI:
 *   pnpm --filter @workspace/scripts run evidence:build
 *   pnpm --filter @workspace/scripts run evidence:build -- --slug=51001-who-is-the-real-jesus
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";

/* Local mirror of the ArticleBlock shape (see bsmPdfBuild.ts for rationale). */
type ArticleBlock =
  | { type: "p"; html: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; html: string; cite?: string }
  | { type: "figure"; src: string; alt: string; caption?: string };

interface EvidenceArticleOut {
  id: string;
  appSlug: string;
  subId: string;
  title: string;
  description: string;
  blocks: ArticleBlock[];
}

const ROOT = resolve(process.cwd(), "..");
const HUB = resolve(ROOT, "artifacts/discipleship-hub");
const MAPPING_PATH = resolve(process.cwd(), "data/slug-mapping.json");
const OUT_PATH = resolve(HUB, "src/data/evidenceArticles.ts");
const IMG_DIR = resolve(HUB, "src/assets/evidence");

const API = "https://apicontent.jesusonline.com/wp-json/wp/v2";

const args = process.argv.slice(2);
const slugFilter = args
  .filter(a => a.startsWith("--slug="))
  .flatMap(a => a.slice(7).split(","))
  .filter(Boolean);

type SlugEntry = { wp_id: number; wp_slug: string };
const mapping: Record<string, SlugEntry> = JSON.parse(readFileSync(MAPPING_PATH, "utf8"));

/* ---------- collect evidence items from channels.ts ---------- */

interface ChannelsModule {
  subTopics: {
    id: string;
    channelId: string;
    items?: { number: number; title: string; links?: { app?: string } }[];
  }[];
}

function appSlugOf(url: string | undefined): string | undefined {
  const m = url?.match(/app\.jesusonline\.com\/post\/([^/?#]+)/);
  return m?.[1];
}

/** Strip the leading catalog number ("51001-", "22010-148-") from an app slug. */
function articleIdOf(appSlug: string): string {
  return appSlug.replace(/^\d+(-\d+)?-/, "");
}

/* ---------- HTML helpers ---------- */

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

/** Normalize inline HTML kept inside blocks: decode entities, drop classes/ids,
 *  collapse whitespace, rewrite links. Allowed tags: a em strong i b sup sub br. */
function cleanInline(html: string, articleIdBySlug: Map<string, { subId: string; id: string }>): string {
  let s = html;
  /* Drop images/figures that sneak inline (handled as blocks). */
  s = s.replace(/<img[^>]*>/gi, "");
  /* Rewrite apicontent hrefs → app post slug → internal or public app URL. */
  s = s.replace(
    /href=(["'])(?:https?:)?\/\/apicontent\.jesusonline\.com\/([^"'#?]*?)(?:[?#][^"']*)?\1/gi,
    (_m, q, path) => {
      const slug = path.replace(/\/+$/, "").split("/").pop() ?? "";
      const target = articleIdBySlug.get(slug);
      if (target) return `href=${q}/channels/evidence/${target.subId}/${target.id}${q}`;
      return `href=${q}https://app.jesusonline.com/post/${slug}${q}`;
    },
  );
  /* app.jesusonline.com/post links to other evidence articles → internal. */
  s = s.replace(
    /href=(["'])https?:\/\/app\.jesusonline\.com\/post\/([^"'#?]+)(?:[?#][^"']*)?\1/gi,
    (_m, q, slug) => {
      const target =
        articleIdBySlug.get(slug) ??
        articleIdBySlug.get(slug.replace(/^\d+(-\d+)?-/, ""));
      if (target) return `href=${q}/channels/evidence/${target.subId}/${target.id}${q}`;
      return `href=${q}https://app.jesusonline.com/post/${slug}${q}`;
    },
  );
  /* Strip class/id/style/data-* attributes but keep href/target. */
  s = s.replace(/<(\w+)([^>]*)>/g, (_m, tag: string, attrs: string) => {
    const t = tag.toLowerCase();
    if (!["a", "em", "strong", "i", "b", "sup", "sub", "br", "span"].includes(t)) return `<${t}>`;
    if (t === "span") return ""; // spans carry only styling — drop the tag, keep content below
    if (t === "a") {
      const href = attrs.match(/href=(["'])(.*?)\1/i)?.[2] ?? "";
      const external = /^https?:\/\//i.test(href) && !href.startsWith("https://equip.jesusonline.com");
      return `<a href="${href}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>`;
    }
    return `<${t}>`;
  });
  s = s.replace(/<\/span>/gi, "");
  /* Decode entities that are safe as literal text, but keep &amp; &lt; &gt; escaped. */
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

/** Split flat WP block HTML into top-level chunks. WP renders blocks separated
 *  by blank lines with no nesting between them, so a linear regex scan over
 *  known block tags is reliable here. */
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
    /* Find matching close, accounting for nesting of same tag (ul in ul). */
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

function listItems(inner: string, rw: Map<string, { subId: string; id: string }>): string[] {
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

let imgCounters: Record<string, number> = {};
async function downloadFigure(articleId: string, src: string): Promise<string | null> {
  imgCounters[articleId] = (imgCounters[articleId] ?? 0) + 1;
  const ext = (extname(new URL(src).pathname) || ".png").toLowerCase();
  const base = `${articleId}-${imgCounters[articleId]}`;
  const file = resolve(IMG_DIR, base + ext);
  if (!existsSync(file)) {
    const r = await fetch(src);
    if (!r.ok) {
      console.warn(`  ! image fetch failed (${r.status}): ${src}`);
      return null;
    }
    mkdirSync(IMG_DIR, { recursive: true });
    writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return base;
}

/* ---------- endnotes ---------- */

async function fetchEndnotes(slug: string, rw: Map<string, { subId: string; id: string }>): Promise<ArticleBlock[]> {
  const r = await fetch(`${API}/posts?slug=${encodeURIComponent(slug)}&_fields=content`);
  if (!r.ok) return [];
  const arr = (await r.json()) as { content: { rendered: string } }[];
  if (!arr.length) return [];
  const blocks: ArticleBlock[] = [];
  for (const b of topLevelBlocks(arr[0].content.rendered)) {
    if (b.tag === "ol") {
      const items = listItems(b.inner, rw);
      if (items.length) blocks.push({ type: "ol", items });
    } else if (b.tag === "ul") {
      const items = listItems(b.inner, rw);
      if (items.length) blocks.push({ type: "ul", items });
    } else if (b.tag === "p") {
      const html = cleanInline(b.inner, rw);
      if (html) blocks.push({ type: "p", html });
    }
    /* skip the endnote post's own h2 (duplicate of the article title) */
  }
  return blocks.length ? [{ type: "h2", text: "Endnotes" }, ...blocks] : [];
}

/* ---------- main conversion ---------- */

async function convert(
  articleId: string,
  appSlug: string,
  html: string,
  rw: Map<string, { subId: string; id: string }>,
): Promise<ArticleBlock[]> {
  const blocks: ArticleBlock[] = [];
  let endnoteBlocks: ArticleBlock[] = [];
  for (const b of topLevelBlocks(html)) {
    switch (b.tag) {
      case "hr":
        break;
      case "p": {
        /* Drop the "Watch the video based on this article" lead-in — the
           EQUIP sub-topic pages already expose the video via the Video
           button, so the line is redundant on-site. */
        if (/^watch (?:the|a) video based on this article\.?$/i.test(stripTags(b.inner))) break;
        /* Trailing "Endnotes" link → fetch and inline the endnotes post. */
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
        const base = await downloadFigure(articleId, src);
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

async function main() {
  const channelsUrl = pathToFileURL(resolve(HUB, "src/data/channels.ts")).href;
  const { subTopics } = (await import(channelsUrl)) as ChannelsModule;
  const evidence = subTopics.filter(s => s.channelId === "evidence");

  /* Rewrite map: app slug → { subId, articleId } for internal cross-links. */
  const rw = new Map<string, { subId: string; id: string }>();
  const work: { subId: string; appSlug: string; id: string; itemTitle: string }[] = [];
  for (const sub of evidence) {
    for (const item of sub.items ?? []) {
      const appSlug = appSlugOf(item.links?.app);
      if (!appSlug) continue;
      const id = articleIdOf(appSlug);
      rw.set(appSlug, { subId: sub.id, id });
      /* The app catalog's numeric prefixes have drifted over time, so old
         in-body links may use a different prefix for the same article.
         Also index by the prefix-less name part as a fallback. */
      rw.set(id, { subId: sub.id, id });
      work.push({ subId: sub.id, appSlug, id, itemTitle: item.title });
    }
  }
  console.log(`Evidence items with app links: ${work.length}`);

  imgCounters = {};
  const out: EvidenceArticleOut[] = [];
  for (const w of work) {
    if (slugFilter.length && !slugFilter.includes(w.appSlug)) continue;
    const entry = mapping[w.appSlug];
    if (!entry) {
      console.warn(`  ! no slug mapping for ${w.appSlug} — skipped`);
      continue;
    }
    const r = await fetch(`${API}/posts/${entry.wp_id}?_fields=id,slug,title,content`);
    if (!r.ok) {
      console.warn(`  ! fetch failed (${r.status}) for ${w.appSlug} — skipped`);
      continue;
    }
    const post = (await r.json()) as { title: { rendered: string }; content: { rendered: string } };
    /* Strip leading catalog number from the WP title ("51001 Who Is…"). */
    const title = decodeEntities(post.title.rendered).replace(/^[\d.]+\s+/, "").trim() || w.itemTitle;
    const blocks = await convert(w.id, w.appSlug, post.content.rendered, rw);
    if (!blocks.length) {
      console.warn(`  ! empty conversion for ${w.appSlug} — skipped`);
      continue;
    }
    out.push({ id: w.id, appSlug: w.appSlug, subId: w.subId, title, description: describeFrom(blocks), blocks });
    console.log(`  ✓ ${w.appSlug} → ${w.id} (${blocks.length} blocks)`);
  }

  if (slugFilter.length) {
    /* Partial run: merge into the existing generated file. */
    if (existsSync(OUT_PATH)) {
      const prevUrl = pathToFileURL(OUT_PATH).href + `?t=${Date.now()}`;
      const prev = (await import(prevUrl)) as { evidenceArticles: EvidenceArticleOut[] };
      const byId = new Map(prev.evidenceArticles.map(a => [a.id, a]));
      for (const a of out) byId.set(a.id, a);
      /* Preserve site order from `work`. */
      const merged: EvidenceArticleOut[] = [];
      for (const w of work) {
        const a = byId.get(w.id);
        if (a) merged.push(a);
      }
      out.length = 0;
      out.push(...merged);
    }
  }

  const header = `/**
 * AUTO-GENERATED by @workspace/scripts evidence:build.
 * Do not hand-edit — regenerate with:
 *   pnpm --filter @workspace/scripts run evidence:build
 *
 * Long-form Evidence channel articles sourced from the JOM WordPress backend
 * (apicontent.jesusonline.com), converted to the shared ArticleBlock shape so
 * the per-article page renders them natively on EQUIP instead of linking out
 * to app.jesusonline.com. Figures live in src/assets/evidence/ (resolved via
 * evidenceImages.ts). \`appSlug\` keys the generated article PDF manifest
 * (articles.ts) for the Download PDF button.
 */

import type { ArticleBlock } from "./bcgArticles";

export interface EvidenceArticle {
  id: string;
  /** Source app.jesusonline.com post slug (keys articles.ts PDF manifest). */
  appSlug: string;
  /** Owning evidence sub-topic id. */
  subId: string;
  title: string;
  description: string;
  blocks: ArticleBlock[];
}

export const evidenceArticles: EvidenceArticle[] = `;

  const footer = `;

export function getEvidenceArticle(id: string): EvidenceArticle | undefined {
  return evidenceArticles.find(a => a.id === id);
}

/** Next article within the same sub-topic (declaration order, no wrap). */
export function getNextEvidenceArticle(id: string): EvidenceArticle | undefined {
  const current = getEvidenceArticle(id);
  if (!current) return undefined;
  const siblings = evidenceArticles.filter(a => a.subId === current.subId);
  const idx = siblings.findIndex(a => a.id === id);
  return idx >= 0 && idx + 1 < siblings.length ? siblings[idx + 1] : undefined;
}
`;

  writeFileSync(OUT_PATH, header + JSON.stringify(out, null, 2) + footer);
  console.log(`Wrote ${out.length} articles → ${OUT_PATH}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
