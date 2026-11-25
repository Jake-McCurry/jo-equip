// Lazy loader for locally hosted, content-hashed Strong's word-study data.
// Nothing here runs until word study (or the KJV Strong's toggle) is used.
import { trimBase } from "./reader-utils";
import { bookSlug, shardOf, type ChapterData, type LexEntry, type StrongsManifest } from "./strongs-format";

const cache = new Map<string, Promise<unknown>>();

function getJson<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url).then(async res => {
      if (!res.ok) throw new Error(`Word study data could not be loaded (status ${res.status}).`);
      return res.json() as Promise<T>;
    });
    cache.set(url, p);
    p.catch(() => cache.delete(url)); // allow a retry after a failed request
  }
  return p;
}

const dataBase = (baseUrl: string) => `${trimBase(baseUrl)}/bible-data/strongs/`;

export const loadManifest = (baseUrl: string) => getJson<StrongsManifest>(`${dataBase(baseUrl)}manifest.json`);

export async function loadChapterWords(baseUrl: string, book: string, chapter: number): Promise<ChapterData> {
  const m = await loadManifest(baseUrl);
  const hash = m.chapters[`${book} ${chapter}`];
  if (!hash) throw new Error(`No word study data for ${book} ${chapter}.`);
  return getJson<ChapterData>(`${dataBase(baseUrl)}chapters/${bookSlug(book)}-${chapter}.${hash}.json`);
}

/** Resolves to null when the number is valid in form but has no entry. */
export async function loadEntry(baseUrl: string, num: string): Promise<LexEntry | null> {
  const m = await loadManifest(baseUrl);
  const shard = shardOf(num);
  const hash = m.lexicon[shard];
  if (!hash) return null;
  const data = await getJson<Record<string, LexEntry>>(`${dataBase(baseUrl)}lexicon/${shard}.${hash}.json`);
  return data[num] ?? null;
}
