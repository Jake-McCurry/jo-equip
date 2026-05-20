import type { ImageMetadata } from "astro";

/* BCG article figures live in src/assets/bcg/<id>.png. Mirror of bookCovers.ts.
   To add a new figure: drop the PNG in that folder and reference its basename
   as the `src` of a `figure` block in bcgArticles.ts. */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/bcg/*.png",
  { eager: true },
);

const byId: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? "";
  const id = file.replace(/\.png$/, "");
  byId[id] = mod.default;
}

export function getBcgImage(id: string): ImageMetadata | undefined {
  return byId[id];
}
