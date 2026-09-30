import categorySeoJson from "./categorySeo.json" with { type: "json" };
import categorySeoOverrides from "./categorySeoOverrides.json" with { type: "json" };

export interface CategorySeoMetadata {
  title: string;
  description: string;
  h1?: string;
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
  Object.entries({ ...importedMetadata, ...categorySeoOverrides }),
);

if (Object.keys(importedMetadata).length !== EXPECTED_ROWS) {
  throw new Error(
    `Expected ${EXPECTED_ROWS} imported category SEO records, found ${Object.keys(importedMetadata).length}`,
  );
}

// Later approved overrides survive workbook reimports and use the same lookup.
export const categorySeoRows: CategorySeoRow[] = [...categorySeoByPath].map(
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