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

/**
 * Extract a YouTube video ID from any common URL form (SEO-012):
 *   https://www.youtube.com/watch?v=ID
 *   https://youtu.be/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube-nocookie.com/embed/ID
 * Returns null when no valid 11-char ID is found. The ID — not any rendered
 * iframe URL — is the canonical identifier; sitemap URLs are generated from it.
 */
export function extractYouTubeId(input) {
  if (typeof input !== "string" || !input) return null;
  try {
    const u = new URL(input);
    const host = u.hostname.replace(/^www\./, "");
    let id = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "m.youtube.com") {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else {
        const m = u.pathname.match(/^\/(?:embed|shorts|v|live)\/([\w-]+)/);
        if (m) id = m[1];
      }
    }
    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Standardized sitemap URL for a video ID (never an embed/nocookie URL). */
const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

/* Video references whose URL yielded no valid ID (logged for review). */
const invalidVideoRefs = [];

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
      const id = extractYouTubeId(a.videoUrl);
      if (!id) {
        if (a.videoUrl) invalidVideoRefs.push({ page: `${SITE}/categories/${a.channelId}/${a.subId}/${a.id}`, videoUrl: a.videoUrl, reason: "no valid YouTube video ID found" });
        continue;
      }
      addVideo(`${SITE}/categories/${a.channelId}/${a.subId}/${a.id}`, {
        title: a.title,
        description: (a.description || a.title).replace(/<[^>]+>/g, ""),
        videoId: id,
      });
    }
  }
}

/* ---------- validate videos (SEO-012) ----------
   Every video ID is checked against YouTube's oEmbed endpoint before it may
   enter the sitemap:
     HTTP 200      → video exists and is embeddable          → include
     HTTP 401/403  → embedding disabled / player config error
                     (what surfaces on-page as "Error 153")  → exclude + log
     HTTP 404/400  → video removed, private, or invalid ID   → exclude + log
     network error → keep the video (do not drop valid entries on a transient
                     failure) but log a warning.
   Results are cached in video-validation-cache.json (committed) for 30 days
   so rebuilds stay fast and offline-safe; failures are re-checked every
   build. Exclusions are written to sitemap-video-exclusions.json for review. */

const VALIDATION_CACHE_PATH = resolve(ROOT, "video-validation-cache.json");
const EXCLUSIONS_PATH = resolve(ROOT, "sitemap-video-exclusions.json");
const CACHE_TTL_DAYS = 30;

const validationCache = existsSync(VALIDATION_CACHE_PATH)
  ? JSON.parse(readFileSync(VALIDATION_CACHE_PATH, "utf8"))
  : {};

const cacheFresh = (c) =>
  c && (Date.parse(TODAY) - Date.parse(c.checked)) < CACHE_TTL_DAYS * 86400000;

async function checkVideo(id) {
  const cached = validationCache[id];
  /* Successful verdicts are reused for the TTL; failures are re-checked every
     build so a video that regains embed permission returns automatically. */
  if (cached?.ok && cacheFresh(cached)) return cached;
  let result;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl(id))}&format=json`,
      { redirect: "follow", signal: AbortSignal.timeout(8000) },
    );
    if (res.ok) result = { ok: true, status: res.status };
    else if (res.status === 401 || res.status === 403)
      result = { ok: false, status: res.status, reason: "embedding disabled / player configuration error (Error 153)" };
    else result = { ok: false, status: res.status, reason: "video unavailable, private, or invalid ID" };
  } catch (e) {
    /* Transient network problem: reuse a still-fresh prior verdict; otherwise
       include the video with a warning rather than dropping valid entries. */
    if (cacheFresh(cached)) return cached;
    console.warn(`video sitemap: could not validate ${id} (${e.message}); including unvalidated`);
    return { ok: true, status: 0, reason: "network error, not validated" };
  }
  validationCache[id] = { ...result, checked: TODAY };
  return validationCache[id];
}

/* Bounded-concurrency runner so a cold cache can't serially stall the build. */
async function mapPool(items, limit, fn) {
  const out = new Map();
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      out.set(item, await fn(item));
    }
  }));
  return out;
}

{
  const allIds = new Set([...videosByUrl.values()].flat().map(v => v.videoId));
  const verdicts = await mapPool(allIds, 8, checkVideo);

  const excluded = [...invalidVideoRefs];
  for (const [url, vids] of videosByUrl) {
    const keep = [];
    for (const v of vids) {
      const verdict = verdicts.get(v.videoId);
      if (verdict.ok) keep.push(v);
      else excluded.push({ page: url, videoId: v.videoId, videoUrl: watchUrl(v.videoId), status: verdict.status, reason: verdict.reason });
    }
    if (keep.length) videosByUrl.set(url, keep);
    else videosByUrl.delete(url);
  }

  /* Drop cache entries for videos no longer referenced anywhere. */
  for (const id of Object.keys(validationCache)) if (!allIds.has(id)) delete validationCache[id];
  writeFileSync(VALIDATION_CACHE_PATH, JSON.stringify(validationCache, null, 2) + "\n");

  if (excluded.length) {
    writeFileSync(EXCLUSIONS_PATH, JSON.stringify({ generated: TODAY, excluded }, null, 2) + "\n");
    console.warn(`video sitemap: EXCLUDED ${excluded.length} video reference(s) — see sitemap-video-exclusions.json`);
    for (const x of excluded) console.warn(`  - ${x.videoId ?? x.videoUrl} on ${x.page}: ${x.reason}`);
  } else if (existsSync(EXCLUSIONS_PATH)) {
    unlinkSync(EXCLUSIONS_PATH);
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
      <video:player_loc>${watchUrl(v.videoId)}</video:player_loc>
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

/* ---------- HTML sitemap cross-check (SEO-014) ----------
   /sitemap is generated from the app's content data (src/pages/sitemap.astro).
   Verify every link it emits is part of the XML sitemap inventory — if the
   two drift (e.g. /sitemap lists a page that is noindex, redirected, or
   canonicalized elsewhere), fail the build so it gets fixed, never shipped. */
const htmlSitemapFile = join(DIST, "sitemap", "index.html");
if (existsSync(htmlSitemapFile)) {
  const doc = readFileSync(htmlSitemapFile, "utf8");
  const main = doc.match(/<main[\s\S]*<\/main>/i)?.[0] ?? doc;
  /* Strip the configured base prefix (BASE_PATH builds serve under e.g.
     /artifacts/discipleship-hub) so hrefs compare against base-free XML
     inventory paths regardless of deployment target. */
  const BASE = (process.env.BASE_PATH ?? "/").replace(/\/$/, "");
  const stripBase = h => {
    if (BASE && h.startsWith(BASE)) h = h.slice(BASE.length) || "/";
    return h;
  };
  const links = new Set(
    [...main.matchAll(/<a[^>]+href="(\/[^"]*)"/g)]
      .map(m => stripBase(m[1]))
      .filter(h => !h.startsWith("/_") && !h.startsWith("/articles/") && !h.startsWith("/books/covers/")),
  );
  const inventory = new Set(pages.map(p => (p.path === "/" ? "/" : p.path)));
  const bad = [...links].filter(h => !inventory.has(h === "/" ? "/" : h.replace(/\/$/, "")));
  if (bad.length) {
    console.error(`HTML sitemap drift: ${bad.length} link(s) on /sitemap are not in the XML sitemap inventory:\n  ${bad.slice(0, 20).join("\n  ")}`);
    process.exit(1);
  }
  const missing = [...inventory].filter(p => p !== "/sitemap" && !links.has(p) && !(p === "/" && links.has("/")));
  if (missing.length) {
    console.error(`HTML sitemap incomplete: ${missing.length} indexable URL(s) not listed on /sitemap:\n  ${missing.slice(0, 20).join("\n  ")}`);
    process.exit(1);
  }
  console.log(`HTML sitemap check: ${links.size} links on /sitemap, all present in XML inventory${missing.length ? `; ${missing.length} XML URL(s) unlisted` : ""}`);
} else {
  console.warn("HTML sitemap check: dist/sitemap/index.html not found — skipped");
}

console.log(
  `sitemaps: pages=${groups.pages.length} channels=${groups.channels.length} books=${groups.books.length} playlists=${groups.playlists.length} videoPages=${videosByUrl.size} (total URLs ${pages.length})`,
);
