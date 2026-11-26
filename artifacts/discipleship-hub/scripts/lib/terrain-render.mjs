// Shaded-relief rendering shared by generate-map-terrain.mjs (interactive map
// tiers) and generate-bible-atlas.mjs (static atlas maps).
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { tileXY } from "./terrain-tiers.mjs";

export const sha = buf => createHash("sha256").update(buf).digest("hex");

/** Natural Earth land, pinned (same digest as generate-bible-maps.mjs). */
export const LAND_SHA = "1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416";
export async function loadLand(mapSources) {
  const buf = await fs.readFile(path.join(mapSources, "ne_10m_land.geojson"));
  if (sha(buf) !== LAND_SHA) throw new Error("ne_10m_land.geojson digest changed");
  return JSON.parse(buf.toString("utf8"));
}

/**
 * Reads terrarium tiles, checking each against `pins` (key -> sha256). With
 * `pin` true, records digests into `pins` instead of checking them.
 */
export async function loadTiles(dir, keys, pins, pin = false, { despike = false } = {}) {
  const tiles = new Map();
  for (const key of keys) {
    const buf = await fs.readFile(path.join(dir, `${key.replaceAll("/", "-")}.png`));
    if (pin) pins[key] = sha(buf);
    else if (pins[key] !== sha(buf)) throw new Error(`tile ${key} digest changed or unpinned; review and re-run with --pin`);
    const { data, info } = await sharp(buf).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    if (info.width !== 256 || info.height !== 256) throw new Error(`tile ${key} is not 256×256`);
    const elev = new Float32Array(256 * 256);
    for (let i = 0; i < elev.length; i++) elev[i] = data[i * 3] * 256 + data[i * 3 + 1] + data[i * 3 + 2] / 256 - 32768;
    if (despike) despikeRows(elev);
    tiles.set(key, elev);
  }
  return tiles;
}

/**
 * A few source tiles contain corrupt rows (a line of bogus elevations that
 * prints as a stripe). A row is corrupt when, across the whole tile width, it
 * typically sits well above or below the average of its neighbours; real
 * terrain doesn't do that along 256 pixels.
 */
function despikeRows(elev) {
  // The damage spreads a row or two either side of the flagged row, so rows
  // y-1..y+2 are rebuilt by linear interpolation between rows y-2 and y+3.
  const bad = [];
  for (let y = 2; y < 253; y++) {
    const diffs = [];
    for (let x = 0; x < 256; x++) { const i = y * 256 + x; diffs.push(elev[i] - (elev[i - 256] + elev[i + 256]) / 2); }
    diffs.sort((p, q) => p - q);
    if (Math.abs(diffs[128]) >= 40) bad.push(y);
  }
  for (const y of bad) for (let x = 0; x < 256; x++) {
    const a = elev[(y - 2) * 256 + x], b = elev[(y + 3) * 256 + x];
    for (let k = 1; k <= 4; k++) elev[(y - 2 + k) * 256 + x] = a + ((b - a) * k) / 5;
  }
}

/** Bilinear elevation (metres) at a lon/lat from the zoom-z tiles. */
function elevation(tiles, lon, lat, z) {
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

// Classic Bible-atlas palette: hypsometric tints, green lowlands through tan to brown highlands.
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

const fmt = n => Math.round(n * 1000) / 1000;

/**
 * Renders a W×H RGB shaded-relief image of a lon/lat box (linear in both axes,
 * matching the site's equirectangular map projection). `flatSea` paints the sea
 * one colour: some elevation tiles lack bathymetry, which shows as rectangles
 * in large print images. `water` lists [lon, lat] points inside lakes; each
 * lake is flood-filled from its point across the flat water surface in the
 * elevation data, which follows the real shore far better than small-scale
 * lake outlines.
 */
export async function renderRelief({ lon, lat, zoom, W, H, exaggeration, flatSea = false, water = [] }, tiles, land) {
  const dLon = (lon[1] - lon[0]) / W, dLat = (lat[1] - lat[0]) / H;
  const elev = new Float32Array(W * H);
  for (let j = 0; j < H; j++) {
    const la = lat[1] - (j + 0.5) * dLat;
    for (let i = 0; i < W; i++) elev[j * W + i] = elevation(tiles, lon[0] + (i + 0.5) * dLon, la, zoom);
  }

  // Land mask from Natural Earth coastlines, so below-sea-level land (Dead Sea,
  // Jordan valley) is coloured as land and the image matches the vector coast.
  let d = "";
  for (const f of land.features) {
    const polys = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : [];
    for (const rings of polys) for (const ring of rings) {
      if (!ring.some(([lo, la]) => lo > lon[0] - 2 && lo < lon[1] + 2 && la > lat[0] - 2 && la < lat[1] + 2)) continue;
      d += "M" + ring.map(([lo, la]) => `${fmt((lo - lon[0]) / dLon)} ${fmt((lat[1] - la) / dLat)}`).join("L") + "Z";
    }
  }
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#000"/><path d="${d}" fill="#fff" fill-rule="evenodd"/></svg>`;
  const mask = await sharp(Buffer.from(maskSvg), { limitInputPixels: false }).greyscale().raw().toBuffer();

  const lake = new Uint8Array(W * H);
  for (const [lo, la] of water) {
    const i0 = Math.floor((lo - lon[0]) / dLon), j0 = Math.floor((lat[1] - la) / dLat);
    if (i0 < 0 || j0 < 0 || i0 >= W || j0 >= H) throw new Error(`water point ${lo},${la} is outside the image`);
    const level = elev[j0 * W + i0], stack = [j0 * W + i0];
    while (stack.length) {
      const p = stack.pop();
      if (lake[p] || Math.abs(elev[p] - level) > 1.5) continue;
      lake[p] = 1;
      const i = p % W;
      if (i > 0) stack.push(p - 1);
      if (i < W - 1) stack.push(p + 1);
      if (p >= W) stack.push(p - W);
      if (p < W * (H - 1)) stack.push(p + W);
    }
  }

  // Hillshade (Horn's method), light from the north-west.
  const out = Buffer.alloc(W * H * 3);
  const az = (315 * Math.PI) / 180, alt = (45 * Math.PI) / 180;
  for (let j = 0; j < H; j++) {
    const la = lat[1] - (j + 0.5) * dLat;
    const cx = dLon * 111320 * Math.cos((la * Math.PI) / 180), cy = dLat * 110540;
    for (let i = 0; i < W; i++) {
      const e = (di, dj) => elev[Math.min(H - 1, Math.max(0, j + dj)) * W + Math.min(W - 1, Math.max(0, i + di))];
      const dzdx = ((e(1, -1) + 2 * e(1, 0) + e(1, 1)) - (e(-1, -1) + 2 * e(-1, 0) + e(-1, 1))) / (8 * cx) * exaggeration;
      const dzdy = ((e(-1, 1) + 2 * e(0, 1) + e(1, 1)) - (e(-1, -1) + 2 * e(0, -1) + e(1, -1))) / (8 * cy) * exaggeration;
      const slope = Math.atan(Math.hypot(dzdx, dzdy)), aspect = Math.atan2(dzdy, -dzdx);
      const shade = Math.max(0, Math.sin(alt) * Math.cos(slope) + Math.cos(alt) * Math.sin(slope) * Math.cos(az - Math.PI / 2 - aspect));
      const p = j * W + i, m = mask[p] / 255, z = elev[p];
      if (lake[p]) { out[p * 3] = 191; out[p * 3 + 1] = 220; out[p * 3 + 2] = 239; continue; }
      // Flat ground shades to sin(45°) ≈ 0.71; normalise so flat land keeps its tint.
      const f = 0.42 + 0.58 * (shade / Math.sin(alt));
      const l = ramp(LAND, z).map(c => c * Math.min(1.12, f));
      const s = flatSea ? SEA[1][1] : ramp(SEA, Math.min(0, z));
      for (let k = 0; k < 3; k++) out[p * 3 + k] = Math.round(Math.min(255, Math.max(0, l[k] * m + s[k] * (1 - m))));
    }
  }
  return out;
}
