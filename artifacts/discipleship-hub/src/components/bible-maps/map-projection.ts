// Shared by the map generator, build tests, Astro pages and the browser.
// Equirectangular projection scaled for the latitude of the Holy Land, in SVG
// units (10 per degree of latitude). Natural Earth shapes and place markers
// are pre-projected with this, so everything lines up without a map library.
const lonMin = -10, lonMax = 70, latMin = 5, latMax = 48;
const K = 10;
const COS = Math.cos((32 * Math.PI) / 180);

export const PROJECTION = {
  lonMin, lonMax, latMin, latMax,
  width: (lonMax - lonMin) * K * COS,
  height: (latMax - latMin) * K,
};

export const project = (lon: number, lat: number): [number, number] => [(lon - lonMin) * K * COS, (latMax - lat) * K];

/** Confidence wording for OpenBible.info scores (0–1000, current scholarship). */
export function confidenceOf(score: number) {
  if (score >= 700) return { tier: "high", label: "High confidence" } as const;
  if (score >= 300) return { tier: "moderate", label: "Moderate confidence" } as const;
  if (score > 0) return { tier: "low", label: "Low confidence" } as const;
  return { tier: "unknown", label: "Location unknown" } as const;
}
