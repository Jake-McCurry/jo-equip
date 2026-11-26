// Explicit maintenance command, never a network-dependent part of normal builds.
// Renders the static Bible Atlas maps (/bible/atlas) from scripts/data/bible-atlas-maps.mjs.
// Usage:
//   node scripts/fetch-terrain-tiles.mjs /tmp/terrain-tiles
//   bash scripts/fetch-map-sources.sh /tmp/map-sources
//   bash scripts/fetch-atlas-fonts.sh /tmp/atlas-fonts
//   node scripts/generate-bible-atlas.mjs /tmp/terrain-tiles /tmp/map-sources /tmp/atlas-fonts [--pin]
// Writes:
//   public/bible-data/atlas/  content-hashed images per map: full-size WebP,
//                             half-size WebP, thumbnail WebP and a JPEG for download/print
//   src/data/bible-atlas/atlas.json  page data (titles, notes, stops with verse codes, image files)
// Places come from src/data/bible-maps/places.json (run generate-bible-maps.mjs first).
import fs from "node:fs/promises";
import path from "node:path";
import { ATLAS } from "./data/bible-atlas-maps.mjs";
import { atlasRaster, tilesFor } from "./lib/terrain-tiers.mjs";
import { parseOsis, validRange } from "./lib/scripture-refs.mjs";

const [tilesDir, mapSources, fontsDir] = process.argv.slice(2);
const pin = process.argv.includes("--pin");
if (!tilesDir || !mapSources || !fontsDir) throw new Error("Usage: node scripts/generate-bible-atlas.mjs <tiles dir> <map sources dir> <fonts dir> [--pin]");

// librsvg (inside sharp) finds fonts through fontconfig; point it at the pinned TTFs.
const ttf = path.resolve(fontsDir, "TTF");
await fs.access(path.join(ttf, "SourceSans3-Semibold.ttf"));
const conf = path.resolve(fontsDir, "fonts.conf");
await fs.writeFile(conf, `<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd"><fontconfig><dir>${ttf}</dir><cachedir>${path.resolve(fontsDir, "cache")}</cachedir></fontconfig>`);
process.env.FONTCONFIG_FILE = conf;
const { default: sharp } = await import("sharp");
const { loadLand, loadTiles, renderRelief, sha } = await import("./lib/terrain-render.mjs");

const root = new URL("../", import.meta.url);
const outPublic = new URL("public/bible-data/atlas/", root);
const outData = new URL("src/data/bible-atlas/", root);
const pinFile = new URL("scripts/data/terrain-tiles.json", root);
const fail = msg => { throw new Error(msg); };

const places = new Map(JSON.parse(await fs.readFile(new URL("src/data/bible-maps/places.json", root), "utf8")).map(p => [p.slug, p]));
const land = await loadLand(mapSources);
const read = async name => {
  const buf = await fs.readFile(path.join(mapSources, name));
  return JSON.parse(buf.toString("utf8"));
};
const lakes = await read("ne_10m_lakes.geojson");
const rivers = await read("ne_10m_rivers_lake_centerlines.geojson");

const rasters = ATLAS.map(m => atlasRaster(m));
const keys = [...new Set(rasters.flatMap(tilesFor))].sort();
const allPins = JSON.parse(await fs.readFile(pinFile, "utf8"));
const pins = Object.fromEntries(keys.filter(k => k in allPins).map(k => [k, allPins[k]]));
const tiles = await loadTiles(tilesDir, keys, pins, pin, { despike: true });
if (pin) await fs.writeFile(pinFile, JSON.stringify(Object.fromEntries(Object.entries({ ...allPins, ...pins }).sort()), null, 1) + "\n");

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const r1 = n => Math.round(n * 10) / 10;
const ref = osis => {
  if (!osis) return null;
  const r = parseOsis(osis);
  if (!r || !validRange(r.from, r.to)) fail(`bad reference ${osis}`);
  return r.to ? [r.from, r.to] : [r.from];
};

// Sutherland–Hodgman clip of a pixel-space ring or line to the image (with margin).
function clip(pts, W, H, closed, m = 30) {
  const edges = [[p => p[0] >= -m, 0, -m], [p => p[0] <= W + m, 0, W + m], [p => p[1] >= -m, 1, -m], [p => p[1] <= H + m, 1, H + m]];
  let out = pts;
  for (const [inside, axis, v] of edges) {
    const input = out; out = [];
    const cross = (a, b) => { const t = (v - a[axis]) / (b[axis] - a[axis]); return axis === 0 ? [v, a[1] + t * (b[1] - a[1])] : [a[0] + t * (b[0] - a[0]), v]; };
    for (let i = 0; i < input.length; i++) {
      const cur = input[i];
      if (!closed && i === 0) { if (inside(cur)) out.push(cur); continue; }
      const prev = input[(i + input.length - 1) % input.length];
      if (inside(cur)) { if (!inside(prev)) out.push(cross(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(cross(prev, cur));
    }
    if (!out.length) return [];
  }
  return out;
}
const thin = pts => pts.filter((p, i) => i === 0 || i === pts.length - 1 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 0.8);
const pathOf = (pts, close) => pts.length < 2 ? "" : "M" + pts.map(p => `${r1(p[0])} ${r1(p[1])}`).join("L") + (close ? "Z" : "");
const geomLines = f => f.geometry.type === "Polygon" ? f.geometry.coordinates : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates.flat()
  : f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.type === "MultiLineString" ? f.geometry.coordinates : [];

/** Smooth curve through points (Catmull–Rom as cubic Béziers); returns path and segment midpoints with direction. */
function smooth(pts) {
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  const mids = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
    const mid = [0.125 * p1[0] + 0.375 * c1[0] + 0.375 * c2[0] + 0.125 * p2[0], 0.125 * p1[1] + 0.375 * c1[1] + 0.375 * c2[1] + 0.125 * p2[1]];
    const tan = [p2[0] + c2[0] - c1[0] - p1[0], p2[1] + c2[1] - c1[1] - p1[1]];
    mids.push({ at: mid, angle: Math.atan2(tan[1], tan[0]) * 180 / Math.PI, len: Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) });
  }
  return { d, mids };
}

const niceKm = km => [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].reduce((best, n) => (n <= km ? n : best), 1);

await fs.rm(outPublic, { recursive: true, force: true });
await fs.mkdir(outPublic, { recursive: true });
await fs.mkdir(outData, { recursive: true });
const pages = [];
for (const [mi, map] of ATLAS.entries()) {
  const raster = rasters[mi];
  const { W, H } = raster;
  const S = Math.max(W, H) / 2000; // type scale
  const [lon0, lon1] = map.lon, [lat0, lat1] = map.lat;
  const P = (lon, lat) => [((lon - lon0) / (lon1 - lon0)) * W, ((lat1 - lat) / (lat1 - lat0)) * H];
  const inside = ([x, y]) => x >= 0 && x <= W && y >= 0 && y <= H;
  const place = slug => places.get(slug) ?? fail(`${map.slug}: unknown place ${slug}`);
  const labelOf = (slug, opt = {}) => opt.label ?? map.placeLabels?.[slug] ?? place(slug).name;

  // ---- Markers: listed places plus every named route stop --------------------
  const markers = new Map();
  const addMarker = (slug, opt = {}) => {
    const p = place(slug);
    if (p.lon === null) fail(`${map.slug}: ${slug} has no location`);
    const xy = P(p.lon, p.lat);
    if (!inside(xy)) fail(`${map.slug}: ${slug} is outside the map`);
    const prev = markers.get(slug);
    markers.set(slug, { slug, xy, label: labelOf(slug, opt), at: opt.at ?? prev?.at ?? "r", major: opt.major ?? prev?.major ?? false });
  };
  for (const [slug, opt] of map.places) addMarker(slug, opt);
  const routes = map.routes.map(r => {
    const pts = [], stops = [];
    for (const s of r.stops) {
      if (!Array.isArray(s)) { pts.push(P(s.lon, s.lat)); continue; }
      const [slug, osis] = s;
      if (!markers.has(slug)) addMarker(slug, {});
      pts.push(markers.get(slug).xy);
      stops.push({ slug, label: labelOf(slug), ref: ref(osis) });
    }
    return { ...r, pts, stops };
  });

  // ---- Base lines ------------------------------------------------------------
  let coast = "", lakeD = "", riverD = "";
  const bboxHit = ring => ring.some(([lo, la]) => lo > lon0 - 1 && lo < lon1 + 1 && la > lat0 - 1 && la < lat1 + 1);
  for (const f of land.features) for (const ring of geomLines(f)) if (bboxHit(ring)) coast += pathOf(thin(clip(ring.map(c => P(...c)), W, H, true)), true);
  const ownLakes = new Set((map.lakes ?? []).map(l => l.name));
  for (const f of lakes.features) if (!ownLakes.has(f.properties.name)) for (const ring of geomLines(f)) if (bboxHit(ring)) lakeD += pathOf(thin(clip(ring.map(c => P(...c)), W, H, true)), true);
  for (const f of rivers.features) {
    if ((f.properties.scalerank ?? 10) > 8) continue;
    for (const line of geomLines(f)) if (bboxHit(line)) riverD += pathOf(thin(clip(line.map(c => P(...c)), W, H, false)), false);
  }

  // ---- Overlay SVG -----------------------------------------------------------
  const font = `font-family="Source Sans 3"`;
  const halo = w => `stroke="#ffffff" stroke-opacity="0.9" stroke-width="${r1(w * S)}" stroke-linejoin="round" paint-order="stroke"`;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  svg += `<path d="${lakeD}" fill="#bfdcef" stroke="#6f98b4" stroke-width="${r1(1.1 * S)}"/>`;
  svg += `<path d="${riverD}" fill="none" stroke="#4f93c4" stroke-width="${r1(1.8 * S)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  svg += `<path d="${coast}" fill="none" stroke="#6f98b4" stroke-width="${r1(1.3 * S)}" stroke-linejoin="round"/>`;

  // Region, people and water labels.
  for (const [text, lo, la, kind, size = 1] of map.regions) {
    const [x, y] = P(lo, la);
    if (!inside([x, y])) fail(`${map.slug}: label ${text} is outside the map`);
    const fs_ = (kind === "water" ? 27 : kind === "people" ? 27 : 30) * size * S;
    const style = kind === "water" ? `font-style="italic" font-weight="400" fill="#2f6b98" letter-spacing="${r1(fs_ * 0.04)}"`
      : kind === "people" ? `font-weight="600" fill="#6d4c2c" fill-opacity="0.9" letter-spacing="${r1(fs_ * 0.14)}"`
      : `font-weight="400" fill="#5e4330" fill-opacity="0.78" letter-spacing="${r1(fs_ * 0.3)}"`;
    svg += `<text x="${r1(x)}" y="${r1(y)}" ${font} font-size="${r1(fs_)}" text-anchor="middle" ${style} ${halo(kind === "water" ? 3 : 4)}>${esc(text)}</text>`;
  }

  // Pentecost-style spokes to Jerusalem.
  if (map.spokes) {
    const j = markers.get("jerusalem")?.xy ?? fail(`${map.slug}: spokes need Jerusalem`);
    for (const [lo, la] of map.spokes) {
      const [x, y] = P(lo, la), dx = j[0] - x, dy = j[1] - y, len = Math.hypot(dx, dy);
      const a = [x + dx * (34 * S / len), y + dy * (34 * S / len) + 10 * S], b = [j[0] - dx * (16 * S / len), j[1] - dy * (16 * S / len)];
      svg += `<path d="M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}" stroke="#8a5a2b" stroke-opacity="0.55" stroke-width="${r1(2.4 * S)}" stroke-dasharray="${r1(10 * S)} ${r1(7 * S)}" fill="none"/>`;
    }
  }

  // Routes: white casing, coloured line (dashed when proposed), direction arrows.
  for (const r of routes) {
    const { d, mids } = smooth(r.pts);
    svg += `<path d="${d}" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="${r1(9 * S)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    svg += `<path d="${d}" fill="none" stroke="${r.color}" stroke-width="${r1(4.6 * S)}" stroke-linecap="round" stroke-linejoin="round"${r.proposed ? ` stroke-dasharray="${r1(16 * S)} ${r1(10 * S)}"` : ""}/>`;
    for (const m of mids) {
      if (m.len < 70 * S) continue;
      const a = 11 * S;
      svg += `<path d="M${r1(a)} 0L${r1(-a)} ${r1(a * 0.8)}L${r1(-a * 0.5)} 0L${r1(-a)} ${r1(-a * 0.8)}Z" transform="translate(${r1(m.at[0])} ${r1(m.at[1])}) rotate(${r1(m.angle)})" fill="${r.color}" stroke="#ffffff" stroke-width="${r1(1.6 * S)}"/>`;
    }
  }

  // Place markers and labels.
  const labelFs = 23 * S;
  for (const m of markers.values()) {
    const [x, y] = m.xy;
    svg += m.major
      ? `<rect x="${r1(x - 7.5 * S)}" y="${r1(y - 7.5 * S)}" width="${r1(15 * S)}" height="${r1(15 * S)}" fill="#b3261e" stroke="#ffffff" stroke-width="${r1(2.6 * S)}"/>`
      : `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(6 * S)}" fill="#ffffff" stroke="#2a1d12" stroke-width="${r1(2.6 * S)}"/>`;
    const off = 12 * S;
    const pos = { r: [x + off, y + labelFs * 0.35, "start"], l: [x - off, y + labelFs * 0.35, "end"], t: [x, y - off, "middle"], b: [x, y + off + labelFs * 0.75, "middle"],
      tr: [x + off * 0.7, y - off * 0.7, "start"], tl: [x - off * 0.7, y - off * 0.7, "end"], br: [x + off * 0.7, y + off + labelFs * 0.55, "start"], bl: [x - off * 0.7, y + off + labelFs * 0.55, "end"] }[m.at];
    if (!pos) fail(`${map.slug}: bad label side ${m.at}`);
    svg += `<text x="${r1(pos[0])}" y="${r1(pos[1])}" ${font} font-size="${r1(m.major ? labelFs * 1.1 : labelFs)}" font-weight="${m.major ? 700 : 600}" fill="#1f1610" text-anchor="${pos[2]}" ${halo(5)}>${esc(m.label)}</text>`;
  }

  // Title block (top-left) and legend (bottom-left).
  const pad = 22 * S, tFs = 40 * S, pFs = 22 * S;
  const titleW = Math.max(map.title.length * tFs * 0.5, map.period.length * pFs * 0.47) + pad * 2;
  const tx = map.titleAt === "right" ? W - pad - titleW : pad;
  svg += `<g transform="translate(${r1(tx - pad)} 0)"><rect x="${r1(pad)}" y="${r1(pad)}" width="${r1(titleW)}" height="${r1(tFs + pFs + pad * 2.1)}" rx="${r1(6 * S)}" fill="#fffdf7" fill-opacity="0.93" stroke="#8a6d4b" stroke-width="${r1(1.5 * S)}"/>`;
  svg += `<text x="${r1(pad * 2)}" y="${r1(pad * 1.75 + tFs * 0.8)}" ${font} font-size="${r1(tFs)}" font-weight="700" fill="#1f3a5a">${esc(map.title)}</text>`;
  svg += `<text x="${r1(pad * 2)}" y="${r1(pad * 2.2 + tFs + pFs * 0.75)}" ${font} font-size="${r1(pFs)}" font-weight="400" fill="#5e4330">${esc(map.period)}</text></g>`;

  const lFs = 20 * S, row = lFs * 1.55;
  const rows = [];
  for (const r of routes) rows.push({ kind: "route", color: r.color, proposed: r.proposed, text: r.name + (r.proposed ? " (one proposal)" : "") });
  if ([...markers.values()].some(m => m.major)) rows.push({ kind: "major", text: "Capital or chief city" });
  rows.push({ kind: "place", text: "Town or site" });
  const kmPerPx = ((lon1 - lon0) * 111.32 * Math.cos((((lat0 + lat1) / 2) * Math.PI) / 180)) / W;
  const km = niceKm(kmPerPx * 220 * S), barPx = km / kmPerPx;
  const legendW = Math.max(barPx + 120 * S, ...rows.map(r => 62 * S + r.text.length * lFs * 0.5)) + pad;
  const legendH = rows.length * row + row * 1.9 + pad;
  const lx = pad, ly = H - pad - legendH;
  svg += `<g><rect x="${r1(lx)}" y="${r1(ly)}" width="${r1(legendW)}" height="${r1(legendH)}" rx="${r1(6 * S)}" fill="#fffdf7" fill-opacity="0.93" stroke="#8a6d4b" stroke-width="${r1(1.5 * S)}"/>`;
  rows.forEach((r, i) => {
    const cy = ly + pad * 0.6 + row * (i + 0.6), sx = lx + pad * 0.8;
    if (r.kind === "route") svg += `<path d="M${r1(sx)} ${r1(cy)}h${r1(40 * S)}" stroke="${r.color}" stroke-width="${r1(4.6 * S)}" stroke-linecap="round"${r.proposed ? ` stroke-dasharray="${r1(12 * S)} ${r1(8 * S)}"` : ""}/>`;
    else if (r.kind === "major") svg += `<rect x="${r1(sx + 12.5 * S)}" y="${r1(cy - 7.5 * S)}" width="${r1(15 * S)}" height="${r1(15 * S)}" fill="#b3261e" stroke="#ffffff" stroke-width="${r1(2 * S)}"/>`;
    else svg += `<circle cx="${r1(sx + 20 * S)}" cy="${r1(cy)}" r="${r1(6 * S)}" fill="#ffffff" stroke="#2a1d12" stroke-width="${r1(2.6 * S)}"/>`;
    svg += `<text x="${r1(sx + 54 * S)}" y="${r1(cy + lFs * 0.35)}" ${font} font-size="${r1(lFs)}" fill="#1f1610">${esc(r.text)}</text>`;
  });
  const by = ly + pad * 0.6 + row * (rows.length + 0.55), bx = lx + pad * 0.8;
  svg += `<path d="M${r1(bx)} ${r1(by)}h${r1(barPx)}" stroke="#2a1d12" stroke-width="${r1(3 * S)}"/><path d="M${r1(bx)} ${r1(by - 6 * S)}v${r1(12 * S)}M${r1(bx + barPx)} ${r1(by - 6 * S)}v${r1(12 * S)}" stroke="#2a1d12" stroke-width="${r1(2 * S)}"/>`;
  svg += `<text x="${r1(bx + barPx + 10 * S)}" y="${r1(by + lFs * 0.35)}" ${font} font-size="${r1(lFs)}" fill="#1f1610">${km} km (${Math.round(km * 0.621371)} mi)</text>`;
  svg += `<text x="${r1(bx)}" y="${r1(by + row * 0.95)}" ${font} font-size="${r1(lFs * 0.8)}" fill="#5e4330">Modern coastlines and rivers</text></g>`;

  const credit = "JO EQUIP Bible Atlas · equip.jesusonline.com · Places: OpenBible.info (CC BY 4.0) · Terrain: SRTM/GMTED/ETOPO1 via AWS Terrain Tiles · Coast: Natural Earth";
  svg += `<text x="${r1(W - pad * 0.6)}" y="${r1(H - pad * 0.6)}" ${font} font-size="${r1(14 * S)}" fill="#3b2a1a" text-anchor="end" ${halo(4)}>${esc(credit)}</text>`;
  svg += `</svg>`;

  // ---- Compose and write ------------------------------------------------------
  const relief = await renderRelief({ ...raster, flatSea: true, water: (map.lakes ?? []).map(l => l.at) }, tiles, land);
  const overlay = await sharp(Buffer.from(svg), { limitInputPixels: false }).png().toBuffer();
  const full = await sharp(relief, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: overlay }]).png().toBuffer();
  const out = {};
  const write = async (key, buf, ext) => {
    const name = `${map.slug}${key ? `-${key}` : ""}.${sha(buf).slice(0, 10)}.${ext}`;
    await fs.writeFile(new URL(name, outPublic), buf);
    out[key || "full"] = name;
    return buf.length;
  };
  const sizes = [
    await write("", await sharp(full).webp({ quality: 80, effort: 6 }).toBuffer(), "webp"),
    await write("half", await sharp(full).resize({ width: Math.round(W / 2) }).webp({ quality: 82, effort: 6 }).toBuffer(), "webp"),
    await write("thumb", await sharp(full).resize({ width: 560 }).webp({ quality: 78, effort: 6 }).toBuffer(), "webp"),
    await write("print", await sharp(full).jpeg({ quality: 86, mozjpeg: true }).toBuffer(), "jpg"),
  ];
  pages.push({
    slug: map.slug, title: map.title, period: map.period, summary: map.summary, notes: map.notes, passage: ref(map.passage),
    width: W, height: H, halfWidth: Math.round(W / 2), files: out,
    routes: routes.map(r => ({ name: r.name, color: r.color, proposed: !!r.proposed, stops: r.stops })),
    places: [...markers.values()].map(m => ({ slug: m.slug, label: m.label })).sort((a, b) => a.label.localeCompare(b.label)),
    regions: [...new Set(map.regions.map(r => r[0]))],
  });
  console.log(map.slug, `${W}×${H}`, sizes.map(n => `${(n / 1024).toFixed(0)}K`).join(" "));
}
await fs.writeFile(new URL("atlas.json", outData), JSON.stringify(pages, null, 1) + "\n");
