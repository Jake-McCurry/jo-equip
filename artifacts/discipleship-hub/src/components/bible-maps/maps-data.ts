// Locally hosted, content-hashed Bible map data (see scripts/generate-bible-maps.mjs).
// The manifest is bundled; the place index, chapter index and base map are
// fetched lazily from /bible-data/maps/ only when a map is used.
import manifest from "@/data/bible-maps/manifest.json";
import terrain from "@/data/bible-maps/terrain.json";
import { BOOKS } from "@/components/bible-reader/catalog";
import { confidenceOf } from "./map-projection";

export { manifest };
export const MAP_SIZE = { width: manifest.projection.width, height: manifest.projection.height };

/** [slug, label, x, y, score, typeIndexes, bookIndexes] — x/y are null when the location is unknown. */
export type PlaceRow = [string, string, number | null, number | null, number, number[], number[]];
/** "Genesis 12" -> [[placeIndex, [verses]]] */
export type ChapterIndex = Record<string, [number, number[]][]>;
/** [id, title, astronomical year, years (0 when under a year), kind] */
export type EventRow = [string, string, number, number, "event" | "period" | "life"];
/** Timeline events by chapter: "Genesis 12" -> [[eventIndex, firstVerse, lastVerse]] in timeline order. */
export type EventIndex = { events: EventRow[]; chapters: Record<string, [number, number, number][]> };

const trim = (baseUrl: string) => baseUrl.replace(/\/$/, "");
export const mapFile = (baseUrl: string, name: "places" | "chapters" | "basemap" | "events") =>
  `${trim(baseUrl)}/bible-data/maps/${name}.${manifest.files[name]}.${name === "basemap" ? "svg" : "json"}`;
export const basemapUrl = (baseUrl: string) => mapFile(baseUrl, "basemap");

/** Shaded-relief terrain images, coarsest first (see scripts/generate-map-terrain.mjs). */
export type TerrainTier = { name: string; href: string; x: number; y: number; width: number; height: number };
/** Terrain tiers resolved relative to a base map URL from basemapUrl(). */
export const terrainFor = (basemap: string): TerrainTier[] => {
  const root = basemap.slice(0, basemap.lastIndexOf("/bible-data/maps/"));
  return terrain.tiers.map(({ name, file, x, y, width, height }) => ({ name, href: `${root}/bible-data/maps-terrain/${file}`, x, y, width, height }));
};
export const placeHref = (baseUrl: string, slug: string) => `${trim(baseUrl)}/bible/maps/${slug}`;
export const timelineHref = (baseUrl: string, eventId?: string) => `${trim(baseUrl)}/bible/timeline${eventId ? `#${eventId}` : ""}`;

const cache = new Map<string, Promise<unknown>>();
function getJson<T>(url: string, what: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url).then(res => {
      if (!res.ok) throw new Error(`${what} could not be loaded (status ${res.status}).`);
      return res.json() as Promise<T>;
    });
    cache.set(url, p);
    p.catch(() => cache.delete(url)); // allow a retry after a failed request
  }
  return p;
}
export const loadPlaces = (baseUrl: string) => getJson<PlaceRow[]>(mapFile(baseUrl, "places"), "The place list");
export const loadChapterIndex = (baseUrl: string) => getJson<ChapterIndex>(mapFile(baseUrl, "chapters"), "The places index");
export const loadEventIndex = (baseUrl: string) => getJson<EventIndex>(mapFile(baseUrl, "events"), "The timeline index");

export const placeTypes = (types: number[]) => types.map(t => manifest.types[t]);
export const bookName = (index: number) => BOOKS[index - 1]?.name ?? "";
export { confidenceOf };

/** Reader link for a verse code (book * 1e6 + chapter * 1e3 + verse). */
export function readerHref(baseUrl: string, code: number, translation = "net") {
  const book = bookName(Math.floor(code / 1e6)), chapter = Math.floor(code / 1000) % 1000, verse = code % 1000;
  const q = new URLSearchParams({ book, chapter: String(chapter) });
  if (verse) q.set("verse", String(verse));
  q.set("translation", translation);
  return `${trim(baseUrl)}/bible?${q.toString()}`;
}

/** "John 3:16" / "John 3:16–18" / "Isaiah 9:6–10:2". */
export function refText(from: number, to?: number) {
  const name = bookName(Math.floor(from / 1e6)), c = Math.floor(from / 1000) % 1000, v = from % 1000;
  const head = v ? `${name} ${c}:${v}` : `${name} ${c}`;
  if (!to || to === from) return head;
  const c2 = Math.floor(to / 1000) % 1000, v2 = to % 1000;
  return c2 === c ? `${head}–${v2}` : `${head}–${c2}:${v2}`;
}

/** Astronomical year (0 = 1 BC) -> "1491 BC" / "AD 30". */
export const yearLabel = (y: number) => (y <= 0 ? `${1 - y} BC` : `AD ${y}`);
/** "c. 1920 BC" or, for spans of a year or more, "c. 1491 BC – 1451 BC". */
export const dateSpan = (year: number, years: number) =>
  years >= 1 ? `c. ${yearLabel(year)} – ${yearLabel(year + years)}` : `c. ${yearLabel(year)}`;
