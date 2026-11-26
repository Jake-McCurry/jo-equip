// Downloads the elevation tiles used by scripts/generate-map-terrain.mjs.
// Maintenance only; normal builds never run it.
// Source: Terrain Tiles on AWS Open Data (Mapzen "terrarium" encoding), built
// from public-domain SRTM, GMTED2010 and ETOPO1 elevation data among others.
// Usage: node scripts/fetch-terrain-tiles.mjs /tmp/terrain-tiles
import fs from "node:fs/promises";
import path from "node:path";
import { TIERS, TILE_URL, tilesFor } from "./lib/terrain-tiers.mjs";

const dir = process.argv[2];
if (!dir) throw new Error("Usage: node scripts/fetch-terrain-tiles.mjs <directory>");
const all = [...new Set(TIERS.flatMap(tilesFor))];
let fetched = 0;
for (let i = 0; i < all.length; i += 8) {
  await Promise.all(all.slice(i, i + 8).map(async key => {
    const file = path.join(dir, `${key.replaceAll("/", "-")}.png`);
    try { await fs.access(file); return; } catch {}
    const [z, x, y] = key.split("/");
    for (let attempt = 1; ; attempt++) {
      const res = await fetch(TILE_URL(z, x, y));
      if (res.ok) { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(file, Buffer.from(await res.arrayBuffer())); fetched++; return; }
      if (attempt >= 3) throw new Error(`${key}: HTTP ${res.status}`);
    }
  }));
}
console.log(`tiles: ${all.length} (${fetched} downloaded) in ${dir}`);
