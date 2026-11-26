// Reader-side classic sermon index (see scripts/generate-sermons.mjs). The
// content-hashed index is fetched from /bible-data/sermons/ only when the
// Sermons tab is opened; sermon text is on the static sermon pages.
import manifest from "@/data/sermons/manifest.json";
import { PREACHERS, type PreacherId } from "@/data/sermons/preachers";

/** [slug, title, number, year, refs, preacher] — refs are verse codes [from] / [from, to]. */
export type SermonRow = [string, string, string, number, ([number] | [number, number])[], PreacherId];
export const preacherName = (id: PreacherId) => PREACHERS[id]?.name ?? id;
/** "Malachi 3" -> [[sermonIndex, [[v1, v2], ...]]]; [0, 0] = the whole chapter. */
export type SermonIndex = { sermons: SermonRow[]; chapters: Record<string, [number, [number, number][]][]> };

const trim = (baseUrl: string) => baseUrl.replace(/\/$/, "");
export const sermonHref = (baseUrl: string, slug: string) => `${trim(baseUrl)}/bible/sermons/${slug}`;
export const sermonsIndexHref = (baseUrl: string) => `${trim(baseUrl)}/bible/sermons`;

let cached: Promise<SermonIndex> | null = null;
export function loadSermonIndex(baseUrl: string): Promise<SermonIndex> {
  if (!cached) {
    cached = fetch(`${trim(baseUrl)}/bible-data/sermons/index.${manifest.files.index}.json`).then(res => {
      if (!res.ok) throw new Error(`The sermon list could not be loaded (status ${res.status}).`);
      return res.json() as Promise<SermonIndex>;
    });
    cached.catch(() => { cached = null; }); // allow a retry after a failed request
  }
  return cached;
}

/** True when the ranges cover the verse (a whole-chapter range covers every verse). */
export const coversVerse = (ranges: [number, number][], verse: number) => ranges.some(([a, b]) => a === 0 || (verse >= a && verse <= b));
