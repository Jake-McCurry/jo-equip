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
import sharp from "sharp";
import { PROJECTION, project } from "../src/components/bible-maps/map-projection.ts";
import { TIERS, tilesFor } from "./lib/terrain-tiers.mjs";
import { LAND_SHA, loadLand, loadTiles, renderRelief, sha } from "./lib/terrain-render.mjs";

const [tilesDir, mapSources] = process.argv.slice(2);
const pin = process.argv.includes("--pin");
if (!tilesDir || !mapSources) throw new Error("Usage: node scripts/generate-map-terrain.mjs <tiles dir> <map sources dir> [--pin]");
const root = new URL("../", import.meta.url);
const outPublic = new URL("public/bible-data/maps-terrain/", root);
const outData = new URL("src/data/bible-maps/terrain.json", root);
const pinFile = new URL("scripts/data/terrain-tiles.json", root);

// ---- Pinned inputs -----------------------------------------------------------
const land = await loadLand(mapSources);
const keys = [...new Set(TIERS.flatMap(tilesFor))].sort();
const allPins = JSON.parse(await fs.readFile(pinFile, "utf8").catch(() => "{}"));
const pins = Object.fromEntries(keys.filter(k => k in allPins).map(k => [k, allPins[k]]));
const tiles = await loadTiles(tilesDir, keys, pins, pin);
if (pin) await fs.writeFile(pinFile, JSON.stringify(Object.fromEntries(Object.entries({ ...allPins, ...pins }).sort()), null, 1) + "\n");

// ---- Render each tier ------------------------------------------------------------
const fmt = n => Math.round(n * 1000) / 1000;
await fs.rm(outPublic, { recursive: true, force: true });
await fs.mkdir(outPublic, { recursive: true });
const manifest = { schemaVersion: 1, tiers: [] };
for (const tier of TIERS) {
  const [x0, y0] = project(tier.lon[0], tier.lat[1]);
  const [x1, y1] = project(tier.lon[1], tier.lat[0]);
  const W = Math.round((x1 - x0) * tier.ppu), H = Math.round((y1 - y0) * tier.ppu);
  const out = await renderRelief({ lon: tier.lon, lat: tier.lat, zoom: tier.zoom, W, H, exaggeration: tier.exaggeration }, tiles, land);
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
