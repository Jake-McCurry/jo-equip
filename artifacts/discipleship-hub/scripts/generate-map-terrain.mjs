// Explicit maintenance command, never a network-dependent part of normal builds.
// Renders the shaded-relief "Bible atlas" terrain images drawn under the maps.
// Usage:
//   node scripts/fetch-terrain-tiles.mjs /tmp/terrain-tiles
//   bash scripts/fetch-map-sources.sh /tmp/map-sources        (for the coastline mask)
//   node scripts/generate-map-terrain.mjs /tmp/terrain-tiles /tmp/map-sources [--pin]
// Writes:
//   public/bible-data/maps-terrain/  content-hashed WebP images, one per tier
//   src/data/bible-maps/terrain.json  hashes and map-unit placement of each image
// --pin rewrites scripts/data/terrain-tiles.json (tile digests) after a reviewed
// re-download; without it every tile must match its pinned digest.
// See scripts/data/bible-search-sources.md for sources and licenses.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { PROJECTION, project } from "../src/components/bible-maps/map-projection.ts";
import { TIERS, tileXY, tilesFor } from "./lib/terrain-tiers.mjs";

const [tilesDir, mapSources] = process.argv.slice(2);
const pin = process.argv.includes("--pin");
if (!tilesDir || !mapSources) throw new Error("Usage: node scripts/generate-map-terrain.mjs <tiles dir> <map sources dir> [--pin]");
const root = new URL("../", import.meta.url);
const outPublic = new URL("public/bible-data/maps-terrain/", root);
const outData = new URL("src/data/bible-maps/terrain.json", root);
const pinFile = new URL("scripts/data/terrain-tiles.json", root);
const sha = buf => createHash("sha256").update(buf).digest("hex");

// ---- Pinned inputs -----------------------------------------------------------
const LAND_SHA = "1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416"; // same pin as generate-bible-maps.mjs
const landBuf = await fs.readFile(path.join(mapSources, "ne_10m_land.geojson"));
if (sha(landBuf) !== LAND_SHA) throw new Error("ne_10m_land.geojson digest changed");
const land = JSON.parse(landBuf.toString("utf8"));

const keys = [...new Set(TIERS.flatMap(tilesFor))].sort();
const pins = pin ? {} : JSON.parse(await fs.readFile(pinFile, "utf8"));
const tiles = new Map();
for (const key of keys) {
  const buf = await fs.readFile(path.join(tilesDir, `${key.replaceAll("/", "-")}.png`));
  if (pin) pins[key] = sha(buf);
  else if (pins[key] !== sha(buf)) throw new Error(`tile ${key} digest changed; review and re-run with --pin`);
  const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== 256 || info.height !== 256) throw new Error(`tile ${key} is not 256×256`);
  const elev = new Float32Array(256 * 256);
  for (let i = 0; i < elev.length; i++) elev[i] = data[i * 3] * 256 + data[i * 3 + 1] + data[i * 3 + 2] / 256 - 32768;
  tiles.set(key, elev);
}
if (pin) await fs.writeFile(pinFile, JSON.stringify(pins, null, 1) + "\n");

/** Bilinear elevation (metres) at a lon/lat from the zoom-z tiles. */
function elevation(lon, lat, z) {
  const [tx, ty] = tileXY(lon, lat, z);
  const gx = tx * 256 - 0.5, gy = ty * 256 - 0.5;
  const x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
  const at = (x, y) => {
    const t = tiles.get(`${z}/${Math.floor(x / 256)}/${Math.floor(y / 256)}`);
    if (!t) throw new Error(`missing tile for ${lon},${lat} at zoom ${z}`);
    return t[(y & 255) * 256 + (x & 255)];
  };
  return (at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx) * (1 - fy) + (at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx) * fy;
}

// ---- Classic Bible-atlas palette -------------------------------------------------
// Hypsometric tints (metres → colour), green lowlands through tan to brown highlands.
const LAND = [
  [-450, [150, 190, 132]], [0, [174, 206, 146]], [150, [196, 218, 160]], [400, [226, 226, 172]],
  [800, [233, 212, 160]], [1300, [220, 188, 140]], [2000, [196, 160, 118]], [3000, [172, 140, 112]], [4500, [236, 232, 226]],
];
const SEA = [[0, [206, 230, 242]], [-200, [186, 219, 238]], [-2000, [160, 202, 230]], [-5000, [140, 188, 222]]];
function ramp(stops, v) {
  const desc = stops[0][0] > stops[stops.length - 1][0];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i], [b, cb] = stops[i + 1];
    if (desc ? v >= b : v <= b) {
      const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
      return ca.map((c, k) => c + (cb[k] - c) * t);
    }
  }
  return stops[stops.length - 1][1];
}

// ---- Render each tier ------------------------------------------------------------
const COS = Math.cos((32 * Math.PI) / 180);
const fmt = n => Math.round(n * 1000) / 1000;
await fs.rm(outPublic, { recursive: true, force: true });
await fs.mkdir(outPublic, { recursive: true });
const manifest = { schemaVersion: 1, tiers: [] };
for (const tier of TIERS) {
  const [x0, y0] = project(tier.lon[0], tier.lat[1]);
  const [x1, y1] = project(tier.lon[1], tier.lat[0]);
  const W = Math.round((x1 - x0) * tier.ppu), H = Math.round((y1 - y0) * tier.ppu);
  const dLon = (tier.lon[1] - tier.lon[0]) / W, dLat = (tier.lat[1] - tier.lat[0]) / H;
  const elev = new Float32Array(W * H);
  for (let j = 0; j < H; j++) {
    const lat = tier.lat[1] - (j + 0.5) * dLat;
    for (let i = 0; i < W; i++) elev[j * W + i] = elevation(tier.lon[0] + (i + 0.5) * dLon, lat, tier.zoom);
  }

  // Land mask from Natural Earth coastlines, so below-sea-level land (Dead Sea,
  // Jordan valley) is coloured as land and the image matches the vector coast.
  let d = "";
  for (const f of land.features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [];
    for (const rings of polys) for (const ring of rings) {
      if (!ring.some(([lo, la]) => lo > tier.lon[0] - 2 && lo < tier.lon[1] + 2 && la > tier.lat[0] - 2 && la < tier.lat[1] + 2)) continue;
      d += "M" + ring.map(([lo, la]) => `${fmt((lo - tier.lon[0]) / dLon)} ${fmt((tier.lat[1] - la) / dLat)}`).join("L") + "Z";
    }
  }
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/><path d="${d}" fill="#fff" fill-rule="evenodd"/></svg>`;
  const mask = await sharp(Buffer.from(maskSvg), { limitInputPixels: false }).greyscale().raw().toBuffer();

  // Hillshade (Horn's method), light from the north-west.
  const out = Buffer.alloc(W * H * 3);
  const az = (315 * Math.PI) / 180, alt = (45 * Math.PI) / 180;
  for (let j = 0; j < H; j++) {
    const lat = tier.lat[1] - (j + 0.5) * dLat;
    const cx = dLon * 111320 * Math.cos((lat * Math.PI) / 180), cy = dLat * 110540;
    for (let i = 0; i < W; i++) {
      const e = (di, dj) => elev[Math.min(H - 1, Math.max(0, j + dj)) * W + Math.min(W - 1, Math.max(0, i + di))];
      const dzdx = ((e(1, -1) + 2 * e(1, 0) + e(1, 1)) - (e(-1, -1) + 2 * e(-1, 0) + e(-1, 1))) / (8 * cx) * tier.exaggeration;
      const dzdy = ((e(-1, 1) + 2 * e(0, 1) + e(1, 1)) - (e(-1, -1) + 2 * e(0, -1) + e(1, -1))) / (8 * cy) * tier.exaggeration;
      const slope = Math.atan(Math.hypot(dzdx, dzdy)), aspect = Math.atan2(dzdy, -dzdx);
      const shade = Math.max(0, Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(az - Math.PI / 2 - aspect));
      const p = j * W + i, m = mask[p] / 255, z = elev[p];
      // Flat ground shades to sin(45°) ≈ 0.71; normalise so flat land keeps its tint.
      const f = 0.42 + 0.58 * (shade / Math.sin(alt));
      const l = ramp(LAND, z).map(c => c * Math.min(1.12, f));
      const s = ramp(SEA, Math.min(0, z));
      for (let k = 0; k < 3; k++) out[p * 3 + k] = Math.round(Math.min(255, Math.max(0, l[k] * m + s[k] * (1 - m))));
    }
  }
  // Finer tiers fade out at their edges so they blend into the tier beneath.
  let img = out, channels = 3;
  if (tier !== TIERS[0]) {
    const feather = Math.round(Math.min(W, H) * 0.04);
    img = Buffer.alloc(W * H * 4); channels = 4;
    for (let p = 0; p < W * H; p++) {
      const i = p % W, j = Math.floor(p / W);
      const edge = Math.min(i, j, W - 1 - i, H - 1 - j);
      img[p * 4] = out[p * 3]; img[p * 4 + 1] = out[p * 3 + 1]; img[p * 4 + 2] = out[p * 3 + 2];
      img[p * 4 + 3] = Math.round(255 * Math.min(1, edge / feather));
    }
  }
  const webp = await sharp(img, { raw: { width: W, height: H, channels } }).webp({ quality: 78, effort: 6 }).toBuffer();
  const hash = sha(webp).slice(0, 10);
  await fs.writeFile(new URL(`terrain-${tier.name}.${hash}.webp`, outPublic), webp);
  manifest.tiers.push({ name: tier.name, file: `terrain-${tier.name}.${hash}.webp`, x: fmt(x0), y: fmt(y0), width: fmt(x1 - x0), height: fmt(y1 - y0), pixels: [W, H] });
  console.log(tier.name, `${W}×${H}`, `${(webp.length / 1024).toFixed(0)} KB`);
}
if (manifest.tiers[0].width < PROJECTION.width - 0.01 || manifest.tiers[0].height < PROJECTION.height - 0.01) throw new Error("world tier must cover the whole map");
manifest.sources = { tiles: sha(JSON.stringify(Object.entries(pins).sort())), land: LAND_SHA };
await fs.writeFile(outData, JSON.stringify(manifest, null, 1) + "\n");
