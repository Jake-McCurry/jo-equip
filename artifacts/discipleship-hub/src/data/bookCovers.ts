import type { ImageMetadata } from "astro";

const modules = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/books/covers/*.png",
  { eager: true },
);

const byId: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? "";
  const id = file.replace(/\.png$/, "");
  byId[id] = mod.default;
}

export function getBookCover(id: string): ImageMetadata | undefined {
  return byId[id];
}
