// Explicit maintenance command, never a network-dependent part of normal builds.
// Usage:
//   bash scripts/fetch-map-sources.sh /tmp/map-sources
//   node scripts/generate-bible-maps.mjs /tmp/map-sources
// Writes:
//   public/bible-data/maps/  content-hashed runtime data (place index, chapter
//                            index, base map SVG)
//   src/data/bible-maps/     manifest.json (hashes, bundled into the pages) and
//                            build-time data for the place and timeline pages
// See scripts/data/bible-search-sources.md for sources and licenses.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { CHAPTER_VERSES } from "../worker/bible-catalog.js";
import { BOOKS, code, parseOsis, validRange } from "./lib/scripture-refs.mjs";
import { PROJECTION, project } from "../src/components/bible-maps/map-projection.ts";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/generate-bible-maps.mjs <sources directory>");
const root = new URL("../", import.meta.url);
const outPublic = new URL("public/bible-data/maps/", root);
const outData = new URL("src/data/bible-maps/", root);
const sha = text => createHash("sha256").update(text).digest("hex");
const fail = msg => { throw new Error(msg); };

// Pinned digests. If a source is re-downloaded and differs, review the change
// and then update the digest and the sources notes.
const SOURCES = {
  "ob-ancient.jsonl": "b8187aa4737e8517ccc090f765d2be11da4c548cd2a59d3cdcb62e952cb8c0f2",
  "tg-places.json": "cea8f1b960bc0d643b9e574cf888a3061c5e6cd628b29164770cbdf71ca304c6",
  "tg-events.json": "e21729678280c55455603a47df816656be9db75c5870c61fede0eb054f4c6c26",
  "tg-people.json": "09b0a77f89c08196f5326bdad70d4bcbb1b9c7b0a770d521de470d24c63b9d83",
  "tg-verses.json": "f4dc7cadeabf72ffa83499394cdfb9058e274441ecf3b577c69c550f8cdc2c05",
  "ne_10m_land.geojson": "1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416",
  "ne_10m_lakes.geojson": "2d036f53dedec578001c5c30c2959ee7d4eebc1306900fa4367c49929ec8f2d9",
  "ne_10m_rivers_lake_centerlines.geojson": "bb854a900ecbd3b408df46d5e16e3e0f974ba55993f9d8b5c26e855273c0905a",
};
const raw = {};
for (const [name, digest] of Object.entries(SOURCES)) {
  const buf = await fs.readFile(path.join(src, name));
  const actual = sha(buf);
  if (actual !== digest) fail(`${name} digest changed (${actual}). Review the new source before updating SOURCES.`);
  raw[name] = buf.toString("utf8");
}

const stripTags = s => s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const { lonMin, lonMax, latMin, latMax } = PROJECTION;
const inBounds = (lon, lat) => lon >= lonMin && lon <= lonMax && lat >= latMin && lat <= latMax;

/** Verse codes -> [[from, to?], ...] runs of consecutive verses within a chapter. */
function runs(codes) {
  const out = [];
  for (const c of [...new Set(codes)].sort((a, b) => a - b)) {
    const last = out[out.length - 1];
    if (last && c === (last[1] ?? last[0]) + 1 && Math.floor(c / 1000) === Math.floor(last[0] / 1000)) last[1] = c;
    else out.push([c]);
  }
  return out;
}

// ---- Places (OpenBible.info) ------------------------------------------------
const ob = raw["ob-ancient.jsonl"].trim().split("\n").map(l => JSON.parse(l));
const places = [];
const skippedNoVerses = [];
for (const r of ob) {
  if (!r.verses?.length) { skippedNoVerses.push(r.friendly_id); continue; } // outside the Protestant canon
  if (!/^[a-z0-9-]+$/.test(r.url_slug)) fail(`${r.friendly_id}: unexpected slug ${r.url_slug}`);
  const verses = r.verses.map(v => {
    const p = parseOsis(v.osis);
    if (!p || p.to !== undefined || !validRange(p.from)) fail(`${r.friendly_id}: verse ${v.osis} is outside KJV versification`);
    return p.from;
  });
  // Identifications are sorted by OpenBible's current-scholarship score.
  const ids = [];
  for (const id of r.identifications ?? []) {
    const res = (id.resolutions ?? []).find(x => x.lonlat);
    if (!res) continue;
    const [lon, lat] = res.lonlat.split(",").map(Number);
    const score = Math.round(id.score.time_total * (res.best_time_score !== undefined ? res.best_time_score / 1000 : 1));
    ids.push({ name: stripTags(id.description), lon: +lon.toFixed(4), lat: +lat.toFixed(4), score: Math.max(-1000, Math.min(1000, score)), kind: res.type ?? id.class });
  }
  const best = ids[0];
  if (best && !inBounds(best.lon, best.lat)) fail(`${r.friendly_id}: ${best.lon},${best.lat} is outside the map`);
  places.push({
    id: r.id,
    slug: r.url_slug,
    name: r.friendly_id.replace(/\s+\d+$/, ""),
    label: r.friendly_id,
    types: (r.types ?? []).filter(t => t !== "special"), // OpenBible's internal catch-all, not a kind of place
    lon: best?.lon ?? null,
    lat: best?.lat ?? null,
    score: best ? Math.max(0, best.score) : 0,
    alts: ids.slice(1, 6).filter(a => a.score > 0 && inBounds(a.lon, a.lat)),
    bestName: best?.name ?? null,
    verses: [...new Set(verses)].sort((a, b) => a - b),
  });
}
places.sort((a, b) => a.label.localeCompare(b.label, "en"));
if (places.length < 1200) fail(`only ${places.length} places`);
if (new Set(places.map(p => p.slug)).size !== places.length) fail("duplicate place slugs");
const placeByOb = new Map(places.map((p, i) => [p.id, i]));

// Same names: say which one in lists ("Tarshish" -> "Tarshish (Spain?)" is not in the data, so use the first reference).
const nameCount = new Map();
for (const p of places) nameCount.set(p.name, (nameCount.get(p.name) ?? 0) + 1);
const refLabel = c => { const b = Math.floor(c / 1e6), ch = Math.floor(c / 1000) % 1000, v = c % 1000; return `${BOOKS[b - 1]} ${ch}:${v}`; };
for (const p of places) p.hint = nameCount.get(p.name) > 1 ? `first mentioned ${refLabel(p.verses[0])}` : null;

// ---- Theographic: verse ids, places, events --------------------------------
const tgVerses = new Map(JSON.parse(raw["tg-verses.json"]).map(v => [v.id, v.fields.osisRef]));
const verseCode = id => {
  const osis = tgVerses.get(id) ?? fail(`unknown Theographic verse ${id}`);
  const p = parseOsis(osis);
  if (!p || !validRange(p.from)) fail(`Theographic verse ${osis} is outside KJV versification`);
  return p.from;
};
const tgPlaces = JSON.parse(raw["tg-places.json"]);
let eastonLinks = 0, eastonDropped = 0;
const tgPlaceToOb = new Map();
for (const t of tgPlaces) {
  const m = /\/geo\/ancient\/a([0-9a-f]+)/.exec(t.fields.openBibleUri ?? "");
  const idx = m ? placeByOb.get(`a${m[1]}`) : undefined;
  if (idx === undefined) continue;
  tgPlaceToOb.set(t.id, idx);
  const p = places[idx];
  // Easton's Bible Dictionary (1897, public domain) via Theographic.
  if (!p.easton && t.fields.dictText?.length) p.easton = eastonParas(t.fields.dictText.join("\n\n"), p.label);
}
/** Easton text with markdown links -> paragraphs of segments: string | [text, from, to?]. */
function eastonParas(text, where) {
  return text.split(/\n{2,}|\n/).map(s => s.trim()).filter(Boolean).map(para => {
    const segs = [];
    let last = 0;
    for (const m of para.matchAll(/\[([^\]]+)\]\(([^)]*)\)/g)) {
      if (m.index > last) segs.push(para.slice(last, m.index));
      const osis = /#(.+)$/.exec(m[2])?.[1];
      const ref = osis ? parseOsis(osis) : null;
      if (ref && validRange(ref.from, ref.to)) { segs.push(ref.to ? [m[1], ref.from, ref.to] : [m[1], ref.from]); eastonLinks++; }
      else { segs.push(m[1]); eastonDropped++; }
      last = m.index + m[0].length;
    }
    if (last < para.length) segs.push(para.slice(last));
    const merged = [];
    for (const s of segs) {
      if (typeof s === "string" && typeof merged[merged.length - 1] === "string") merged[merged.length - 1] += s;
      else merged.push(s);
    }
    if (merged.some(s => typeof s === "string" && /\]\(|<\/?[a-z]/i.test(s))) fail(`${where}: unconverted markup in Easton text`);
    return merged;
  });
}
if (eastonDropped > 50) fail(`${eastonDropped} Easton links could not be resolved`);

// ---- Timeline (Theographic events) -----------------------------------------
const tgEvents = JSON.parse(raw["tg-events.json"]);
const tgPeople = new Map(JSON.parse(raw["tg-people.json"]).map(p => [p.id, p.fields.displayTitle]));
/** "-4003" | "0030-03-31" | "0045" (astronomical years) -> year number. */
const yearOf = s => {
  const m = /^(-?)(\d{1,4})(?:-|$)/.exec(s) ?? fail(`unexpected date ${s}`);
  return (m[1] ? -1 : 1) * Number(m[2]);
};
const DUR = { D: 1 / 365, W: 7 / 365, M: 1 / 12, Y: 1 };
const durationYears = d => {
  if (!/^(\d+(?:\.\d+)?[DWMY])+$/.test(d)) fail(`unexpected duration ${d}`);
  return [...d.matchAll(/(\d+(?:\.\d+)?)([DWMY])/g)].reduce((n, m) => n + Number(m[1]) * DUR[m[2]], 0);
};

// Eras group the list for navigation. Each starts at a Theographic event (by
// title) so the boundaries follow the source's own chronology.
const ERAS = [ // exact: start at the anchor itself, not its whole year
  { id: "beginnings", title: "Beginnings", from: "Creation of all things" },
  { id: "patriarchs", title: "The Patriarchs", from: "Lifetime of Abraham" },
  { id: "exodus", title: "Egypt, the Exodus and the Wilderness", from: "Sojourn in Canaan and Egypt", offset: 215 },
  { id: "conquest", title: "Conquest and Judges", from: "Wilderness Wanderings", offset: 40 },
  { id: "united", title: "The United Kingdom", from: "United Kingdom" },
  { id: "divided", title: "The Divided Kingdom", from: "Southern Kingdom (Judah)" },
  { id: "exile", title: "Exile and Return", from: "Babylonian Captivity" },
  { id: "jesus", title: "The Life of Jesus", fromYear: -10 },
  { id: "church", title: "The Early Church", from: "The Holy Spirit comes", exact: true },
];
const byTitle = new Map(tgEvents.map(e => [e.fields.title, e]));
for (const era of ERAS) {
  if (era.fromYear !== undefined) { era.start = era.fromYear; continue; }
  const e = byTitle.get(era.from) ?? fail(`era anchor "${era.from}" not found in Theographic events`);
  era.start = (era.exact ? e.fields.sortKey : Math.floor(e.fields.sortKey)) + (era.offset ?? 0);
}
for (let i = 1; i < ERAS.length; i++) if (ERAS[i].start < ERAS[i - 1].start) fail(`era ${ERAS[i].id} starts before ${ERAS[i - 1].id}`);
const eraOf = sortKey => { let k = 0; ERAS.forEach((e, i) => { if (sortKey >= e.start) k = i; }); return k; };

const events = tgEvents
  .filter(e => e.fields.verses?.length)
  .sort((a, b) => a.fields.sortKey - b.fields.sortKey || a.fields.verseSort.localeCompare(b.fields.verseSort))
  .map(e => {
    const f = e.fields;
    const year = yearOf(f.startDate);
    const years = durationYears(f.duration);
    const lifetime = /^Lifetime of /.test(f.title);
    const placeIdx = [...new Set((f.locations ?? []).map(id => tgPlaceToOb.get(id)).filter(i => i !== undefined))];
    return {
      id: `e${f.eventID}`,
      title: f.title,
      year,
      years: years >= 1 ? Math.round(years) : 0,
      kind: lifetime ? "life" : years >= 30 ? "period" : "event",
      era: eraOf(f.sortKey),
      verses: runs(f.verses.map(verseCode)),
      people: lifetime ? [] : [...new Set((f.participants ?? []).map(id => tgPeople.get(id)).filter(Boolean))].slice(0, 8),
      places: placeIdx.map(i => places[i].slug),
      notes: f.notes ? stripTags(f.notes) : undefined,
    };
  });
if (events.length < 450) fail(`only ${events.length} timeline events`);
for (const e of events) for (const [from, to] of e.verses) if (!validRange(from, to)) fail(`${e.title}: bad verse range`);

// Events that happened at each place (for the place pages).
for (const e of events) for (const slug of e.places) {
  const p = places.find(x => x.slug === slug);
  (p.events ??= []).push(e.id);
}

// ---- Chapter index for the reader ------------------------------------------
const chapters = {};
places.forEach((p, i) => {
  for (const v of p.verses) {
    const b = Math.floor(v / 1e6), c = Math.floor(v / 1000) % 1000;
    const key = `${BOOKS[b - 1]} ${c}`;
    const list = (chapters[key] ??= []);
    const row = list.find(r => r[0] === i);
    if (row) row[1].push(v % 1000); else list.push([i, [v % 1000]]);
  }
});
for (const [key, rows] of Object.entries(chapters)) {
  const [, book, c] = /^(.+) (\d+)$/.exec(key);
  const max = CHAPTER_VERSES[book][Number(c) - 1];
  for (const [, vs] of rows) for (const v of vs) if (v < 1 || v > max) fail(`${key}:${v} outside KJV versification`);
  rows.sort((a, b) => a[1][0] - b[1][0] || places[a[0]].label.localeCompare(places[b[0]].label));
}

// ---- Base map (Natural Earth) ----------------------------------------------
const TOL = 0.012; // degrees; ~1 km
function simplify(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    let max = 0, idx = -1;
    for (let i = a + 1; i < b; i++) {
      // Closed rings start and end on the same point: measure from that point.
      const d = len ? Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / len : Math.hypot(pts[i][0] - ax, pts[i][1] - ay);
      if (d > max) { max = d; idx = i; }
    }
    if (max > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
/** Sutherland–Hodgman clip of one ring to the map rectangle (with a margin). */
function clipRing(ring) {
  const m = 0.5;
  const edges = [
    [p => p[0] >= lonMin - m, (a, b) => cross(a, b, 0, lonMin - m)],
    [p => p[0] <= lonMax + m, (a, b) => cross(a, b, 0, lonMax + m)],
    [p => p[1] >= latMin - m, (a, b) => cross(a, b, 1, latMin - m)],
    [p => p[1] <= latMax + m, (a, b) => cross(a, b, 1, latMax + m)],
  ];
  let out = ring;
  for (const [inside, at] of edges) {
    const input = out; out = [];
    for (let i = 0; i < input.length; i++) {
      const cur = input[i], prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) { if (!inside(prev)) out.push(at(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(at(prev, cur));
    }
    if (!out.length) return [];
  }
  return out;
}
function cross(a, b, axis, v) {
  const t = (v - a[axis]) / (b[axis] - a[axis]);
  return axis === 0 ? [v, a[1] + t * (b[1] - a[1])] : [a[0] + t * (b[0] - a[0]), v];
}
const fmt = n => (Math.round(n * 100) / 100).toString();
const ringPath = ring => {
  const pts = ring.map(([lon, lat]) => project(lon, lat));
  let d = "", px = 0, py = 0;
  pts.forEach(([x, y], i) => {
    // Relative commands keep the file small.
    if (i === 0) d += `M${fmt(x)} ${fmt(y)}`;
    else d += `l${fmt(x - px)} ${fmt(y - py)}`;
    px = Math.round(x * 100) / 100; py = Math.round(y * 100) / 100;
  });
  return d + "z";
};
const polygons = geo => geo.features.flatMap(f => (f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : []).map(rings => ({ f, rings })));
function areaPaths(geo, keep = () => true, minPts = 4) {
  let d = "";
  for (const { f, rings } of polygons(geo)) {
    if (!keep(f)) continue;
    for (const ring of rings) {
      const clipped = simplify(clipRing(ring), TOL);
      if (clipped.length >= minPts) d += ringPath(clipped);
    }
  }
  return d;
}
const land = JSON.parse(raw["ne_10m_land.geojson"]);
const lakes = JSON.parse(raw["ne_10m_lakes.geojson"]);
const rivers = JSON.parse(raw["ne_10m_rivers_lake_centerlines.geojson"]);
const landD = areaPaths(land);
const lakesD = areaPaths(lakes, f => (f.properties.scalerank ?? 10) <= 6 || /Dead Sea|Galilee/.test(f.properties.name ?? ""));
const RIVERS = /^(Jordan|Nile|Euphrates|Tigris|Litani|Orontes|Karun|Kura|Aras|Danube|Tiber|Halys|Kızılırmak|Kizilirmak|Araks|Blue Nile|White Nile|Atbara)$/i;
let riversD = "";
for (const f of rivers.features) {
  const name = f.properties.name ?? "";
  if (!(RIVERS.test(name) || (f.properties.scalerank ?? 10) <= 4)) continue;
  const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [];
  for (const line of lines) {
    let run = [];
    const flush = () => { if (run.length > 1) { const s = simplify(run, TOL); riversD += ringPath(s).slice(0, -1); } run = []; };
    for (const p of line) { if (inBounds(p[0], p[1])) run.push(p); else flush(); }
    flush();
  }
}
if (!/Jordan/.test(rivers.features.map(f => f.properties.name).join(" "))) fail("Jordan River missing from Natural Earth rivers");
const [W, H] = [PROJECTION.width, PROJECTION.height];
// Pages reference the group with <use href="basemap.<hash>.svg#bm-base"> so it
// renders as part of the page's own SVG: strokes stay a constant pixel width
// at any zoom (non-scaling-stroke), and the file still opens on its own.
const nss = `vector-effect="non-scaling-stroke"`;
const basemap = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(W)} ${fmt(H)}" width="${fmt(W)}" height="${fmt(H)}">` +
  `<g id="bm-base">` +
  // Lines only: the shaded-relief terrain images (scripts/generate-map-terrain.mjs)
  // are drawn underneath and supply the land and sea colours.
  `<path d="${landD}" fill="none" stroke="#6f98b4" stroke-width="0.7" stroke-linejoin="round" ${nss}/>` +
  `<path d="${lakesD}" fill="#bfdcef" stroke="#6f98b4" stroke-width="0.6" ${nss}/>` +
  `<path d="${riversD}" fill="none" stroke="#4f93c4" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" ${nss}/>` +
  `</g></svg>`;

// ---- Write -----------------------------------------------------------------
await fs.rm(outPublic, { recursive: true, force: true });
await fs.mkdir(outPublic, { recursive: true });
await fs.mkdir(outData, { recursive: true });
const hashed = async (name, ext, text) => {
  const h = sha(text).slice(0, 10);
  await fs.writeFile(new URL(`${name}.${h}.${ext}`, outPublic), text);
  return h;
};
const TYPES = [...new Set(places.flatMap(p => p.types))].sort();
// Runtime place index: [slug, label, x, y, score, typeIndexes[], books[]] (x/y null when unknown).
const index = places.map(p => {
  const xy = p.lon === null ? [null, null] : project(p.lon, p.lat).map(n => Math.round(n * 100) / 100);
  return [p.slug, p.label, xy[0], xy[1], p.score, p.types.map(t => TYPES.indexOf(t)), [...new Set(p.verses.map(v => Math.floor(v / 1e6)))]];
});
const manifest = {
  schemaVersion: 1,
  projection: PROJECTION,
  types: TYPES,
  files: {
    places: await hashed("places", "json", JSON.stringify(index)),
    chapters: await hashed("chapters", "json", JSON.stringify(chapters)),
    basemap: await hashed("basemap", "svg", basemap),
  },
  stats: { places: places.length, located: places.filter(p => p.lon !== null).length, events: events.length, eastonLinks, eastonDropped, skippedNoVerses: skippedNoVerses.length },
  sources: Object.entries(SOURCES).map(([file, sha256]) => ({ file, sha256 })),
};
await fs.writeFile(new URL("manifest.json", outData), JSON.stringify(manifest, null, 1) + "\n");
await fs.writeFile(new URL("places.json", outData), JSON.stringify(places.map(({ id, ...p }) => p)) + "\n");
await fs.writeFile(new URL("timeline.json", outData), JSON.stringify({ eras: ERAS.map(({ id, title, start }) => ({ id, title, start })), events }) + "\n");
console.log(manifest.stats, `basemap ${(basemap.length / 1024).toFixed(0)} KB`, `chapters ${Object.keys(chapters).length}`);
