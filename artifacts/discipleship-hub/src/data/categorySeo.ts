import categorySeoJson from "./categorySeo.json" with { type: "json" };

export interface CategorySeoMetadata {
  title: string;
  description: string;
}

export interface CategorySeoRow extends CategorySeoMetadata {
  row: number;
  url: string;
  path: string;
}

const SITE = "https://equip.jesusonline.com";
const EXPECTED_ROWS = 1264;
const importedMetadata = categorySeoJson as Record<string, CategorySeoMetadata>;

export const categorySeoByPath = new Map<string, CategorySeoMetadata>(
  Object.entries(importedMetadata),
);

if (categorySeoByPath.size !== EXPECTED_ROWS) {
  throw new Error(
    `Expected ${EXPECTED_ROWS} checked-in category SEO records, found ${categorySeoByPath.size}`,
  );
}

export const categorySeoRows: CategorySeoRow[] = Object.entries(importedMetadata).map(
  ([path, metadata], index) => ({
    row: index + 2,
    url: `${SITE}${path}`,
    path,
    ...metadata,
  }),
);

/** Exact-path lookup prevents metadata leaking between shared article bodies. */
export function getCategorySeo(path: string): CategorySeoMetadata | undefined {
  return categorySeoByPath.get(path.replace(/\/$/, "") || "/");
}