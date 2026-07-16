import type { ImageMetadata } from "astro";

/* Site-wide article figures live in src/assets/articles/<subId>/<basename>,
   downloaded by @workspace/scripts site-articles:build. `figure` blocks in
   the generated sub-topic JSON reference images as "<subId>/<basename>". */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/articles/*/*.{png,jpg,jpeg,webp,gif}",
  { eager: true },
);

const byId: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(modules)) {
  const parts = path.split("/");
  const file = parts.pop() ?? "";
  const subId = parts.pop() ?? "";
  byId[`${subId}/${file.replace(/\.(png|jpe?g|webp|gif)$/, "")}`] = mod.default;
}

export function getSiteArticleImage(id: string): ImageMetadata | undefined {
  return byId[id];
}
