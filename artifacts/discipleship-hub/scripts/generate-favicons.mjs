import sharp from "sharp";
import { fileURLToPath } from "node:url";

// Keep the existing SVG artwork as the source, with raster formats for crawlers
// and Apple devices. Output paths remain stable between releases.
const publicDir = new URL("../public/", import.meta.url);
const source = fileURLToPath(new URL("favicon.svg", publicDir));
for (const [name, size] of [["favicon.png", 96], ["apple-touch-icon.png", 180]]) {
  await sharp(source, { density: 288 })
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(name, publicDir)));
  console.log(`Generated ${name}: ${size}×${size}`);
}