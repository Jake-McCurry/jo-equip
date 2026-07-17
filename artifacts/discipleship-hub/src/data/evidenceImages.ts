import type { ImageMetadata } from "astro";

/* Evidence article figures live in src/assets/evidence/<basename>.png,
   downloaded by @workspace/scripts evidence:build. Mirror of bcgImages.ts:
   `figure` blocks in evidenceArticles.ts reference images by basename. */
const modules = import.meta.glob<{ default: ImageMetadata }>(
  "../assets/evidence/*.png",
  { eager: true },
);

const byId: Record<string, ImageMetadata> = {};
for (const [path, mod] of Object.entries(modules)) {
  const file = path.split("/").pop() ?? "";
  const id = file.replace(/\.png$/, "");
  byId[id] = mod.default;
}

export function getEvidenceImage(id: string): ImageMetadata | undefined {
  return byId[id];
}
