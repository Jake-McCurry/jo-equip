#!/usr/bin/env node
/**
 * Post-build XML sitemap generation (SEO-010, Aug 2026).
 *
 * Replaces the single @astrojs/sitemap file (which stamped every URL with the
 * build date) with logical, content-grouped sitemaps plus accurate per-page
 * lastmod values:
 *
 *   sitemap-index.xml      → references the sitemaps below
 *   sitemap-pages.xml      → top-level pages (/, /about, /pastors, …)
 *   sitemap-categories.xml   → /categories/** (channel, topic, article pages)
 *   sitemap-books.xml      → /books/**
 *   sitemap-playlists.xml  → /playlists + /playlist/**
 *   sitemap-videos.xml     → video sitemap for playlist pages + article pages
 *                            with embedded videos
 *
 * lastmod: each page's rendered HTML is normalized (volatile build artifacts
 * like hashed /_astro/ asset URLs and pagefind bundles stripped) and hashed.
 * The hash + date persist in sitemap-lastmod.json (committed). A URL's
 * lastmod only advances when its normalized content actually changes — never
 * from a rebuild alone.
 *
 * Inclusion rules (mirrors the old filter, plus canonical checks):
 *   - skip /thank-you, /search, /lp/* (noindex / utility pages)
 *   - skip any page whose robots meta contains "noindex"
 *   - skip any page whose canonical points elsewhere (non-self-referencing)
 *   - URLs are emitted without a trailing slash (matches canonicals), except
 *     the site root.
 *
 * Runs automatically as part of `pnpm run build` (see package.json).
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = resolve(import.meta.dirname, "..");
const DIST = resolve(ROOT, "dist");
const SITE = "https://equip.jesusonline.com";
const MANIFEST_PATH = resolve(ROOT, "sitemap-lastmod.json");
const TODAY = new Date().toISOString().slice(0, 10);

/* ---------- collect pages ---------- */

function* htmlPages(dir, rel = "") {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      yield* htmlPages(full, `${rel}/${name}`);
    } else if (name === "index.html") {
      yield { path: rel === "" ? "/" : rel, file: full };
    }
  }
}

const EXCLUDE = /^\/(thank-you|search|lp(\/|$)|404)/;

function canonicalOf(html) {
  const m = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)
    ?? html.match(/<link[^>]+href="([^"]+)"[^>]+rel="canonical"/i);
  return m ? m[1] : null;
}

function isNoindex(html) {
  const m = html.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i);
  return m ? /noindex/i.test(m[1]) : false;
}

/* Normalize rendered HTML so hashing ignores build-volatile bits. */
function normalize(html) {
  return html
    .replace(/\/_astro\/[^"'\s)]+/g, "/_astro/X")     // hashed asset URLs
    .replace(/\/pagefind\/[^"'\s)]+/g, "/pagefind/X") // pagefind bundles
    .replace(/\s+/g, " ");
}

const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  : {};

const pages = [];
for (const { path, file } of htmlPages(DIST)) {
  if (EXCLUDE.test(path)) continue;
  const html = readFileSync(file, "utf8");
  if (isNoindex(html)) continue;

  const url = path === "/" ? `${SITE}/` : `${SITE}${path}`;
  const canonical = canonicalOf(html);
  /* Only self-referencing canonical pages belong in a sitemap. */
  if (canonical && canonical !== url) continue;

  const hash = createHash("sha256").update(normalize(html)).digest("hex").slice(0, 16);
  const prev = manifest[url];
  const lastmod = prev && prev.hash === hash ? prev.lastmod : TODAY;
  manifest[url] = { hash, lastmod };
  pages.push({ url, path, lastmod, html });
}

/* Drop manifest entries for pages that no longer exist. */
const live = new Set(pages.map(p => p.url));
for (const url of Object.keys(manifest)) if (!live.has(url)) delete manifest[url];

/* ---------- group into logical sitemaps ---------- */

const groups = { channels: [], books: [], playlists: [], pages: [] };
for (const p of pages) {
  if (p.path.startsWith("/categories")) groups.channels.push(p);
  else if (p.path.startsWith("/books")) groups.books.push(p);
  else if (p.path.startsWith("/playlist")) groups.playlists.push(p);
  else groups.pages.push(p);
}

/* ---------- video sitemap ---------- */

const esc = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* Videos per page URL: { title, description, videoId } */
const videosByUrl = new Map();
function addVideo(url, v) {
  if (!live.has(url)) return;
  if (!videosByUrl.has(url)) videosByUrl.set(url, []);
  const list = videosByUrl.get(url);
  if (!list.some(x => x.videoId === v.videoId)) list.push(v);
}

/* 1. Playlist pages — parse src/data/playlists.ts (regular structure). */
const playlistsSrc = readFileSync(resolve(ROOT, "src/data/playlists.ts"), "utf8");
for (const pm of playlistsSrc.matchAll(/id:\s*"([^"]+)",\s*title:\s*"((?:[^"\\]|\\.)*)",[\s\S]*?videos:\s*\[([\s\S]*?)\]/g)) {
  const [, id, plTitle, body] = pm;
  const url = `${SITE}/playlist/${id}`;
  for (const vm of body.matchAll(/title:\s*"((?:[^"\\]|\\.)*)",\s*videoId:\s*yt\("([\w-]+)"\)/g)) {
    addVideo(url, {
      title: vm[1].replace(/\\"/g, '"'),
      description: `${vm[1].replace(/\\"/g, '"')} — from the "${plTitle}" playlist on JO EQUIP.`,
      videoId: vm[2],
    });
  }
}

/* 2. Article pages with embedded videos — generated article JSONs carry an
      optional videoUrl (youtube-nocookie embed). */
const genDir = resolve(ROOT, "src/data/generated/articles");
if (existsSync(genDir)) {
  for (const f of readdirSync(genDir).filter(n => n.endsWith(".json"))) {
    for (const a of JSON.parse(readFileSync(join(genDir, f), "utf8"))) {
      const m = typeof a.videoUrl === "string" && a.videoUrl.match(/embed\/([\w-]+)/);
      if (!m) continue;
      addVideo(`${SITE}/categories/${a.channelId}/${a.subId}/${a.id}`, {
        title: a.title,
        description: (a.description || a.title).replace(/<[^>]+>/g, ""),
        videoId: m[1],
      });
    }
  }
}

/* ---------- emit XML ---------- */

function urlsetXml(list) {
  const rows = list
    .sort((a, b) => a.url.localeCompare(b.url))
    .map(p => `  <url>\n    <loc>${esc(p.url)}</loc>\n    <lastmod>${p.lastmod}</lastmod>\n  </url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

function videoXml() {
  const rows = [...videosByUrl.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([url, vids]) => {
      const lastmod = manifest[url]?.lastmod ?? TODAY;
      const vxml = vids.map(v => `    <video:video>
      <video:thumbnail_loc>https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg</video:thumbnail_loc>
      <video:title>${esc(v.title)}</video:title>
      <video:description>${esc(v.description)}</video:description>
      <video:player_loc>https://www.youtube-nocookie.com/embed/${v.videoId}</video:player_loc>
    </video:video>`).join("\n");
      return `  <url>\n    <loc>${esc(url)}</loc>\n    <lastmod>${lastmod}</lastmod>\n${vxml}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${rows}\n</urlset>\n`;
}

const files = [
  ["sitemap-pages.xml", urlsetXml(groups.pages), groups.pages],
  ["sitemap-categories.xml", urlsetXml(groups.channels), groups.channels],
  ["sitemap-books.xml", urlsetXml(groups.books), groups.books],
  ["sitemap-playlists.xml", urlsetXml(groups.playlists), groups.playlists],
];
if (videosByUrl.size > 0) files.push(["sitemap-videos.xml", videoXml(), [...videosByUrl.keys()].map(u => ({ lastmod: manifest[u]?.lastmod ?? TODAY }))]);

for (const [name, xml] of files) writeFileSync(join(DIST, name), xml);

const indexXml = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files
  .map(([name, , list]) => {
    const newest = list.reduce((m, p) => (p.lastmod > m ? p.lastmod : m), "0000-00-00");
    return `  <sitemap>\n    <loc>${SITE}/${name}</loc>\n    <lastmod>${newest === "0000-00-00" ? TODAY : newest}</lastmod>\n  </sitemap>`;
  })
  .join("\n")}\n</sitemapindex>\n`;
writeFileSync(join(DIST, "sitemap-index.xml"), indexXml);

/* Remove the old integration's output if a stale copy exists. */
for (const stale of ["sitemap-0.xml"]) {
  const p = join(DIST, stale);
  if (existsSync(p)) unlinkSync(p);
}

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

console.log(
  `sitemaps: pages=${groups.pages.length} channels=${groups.channels.length} books=${groups.books.length} playlists=${groups.playlists.length} videoPages=${videosByUrl.size} (total URLs ${pages.length})`,
);
