// Lazy loader for the locally hosted, content-hashed commentaries, cross
// references and verse previews. Nothing here runs until those tabs are used.
import { trimBase } from "./reader-utils";
import type { CommentaryChapter, CommentaryId, CommentaryManifest, Para, XrefChapter } from "./commentary-format";
import type { Translation } from "./study-storage";

const cache = new Map<string, Promise<unknown>>();

function getJson<T>(url: string, what: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url).then(async res => {
      if (!res.ok) throw new Error(`${what} could not be loaded (status ${res.status}).`);
      return res.json() as Promise<T>;
    });
    cache.set(url, p);
    p.catch(() => cache.delete(url)); // allow a retry after a failed request
  }
  return p;
}

const slug = (book: string) => book.toLowerCase().replace(/\s+/g, "-");
const dataBase = (baseUrl: string) => `${trimBase(baseUrl)}/bible-data/commentary/`;
const loadManifest = (baseUrl: string) => getJson<CommentaryManifest>(`${dataBase(baseUrl)}manifest.json`, "The commentary index");

/** Null when this commentary does not cover the book (Barnes on the Old Testament). */
export async function loadCommentaryChapter(baseUrl: string, id: CommentaryId, book: string, chapter: number): Promise<{ data: CommentaryChapter; hasIntro: boolean } | null> {
  const entry = (await loadManifest(baseUrl)).commentaries[id]?.books[book];
  if (!entry) return null;
  const hash = entry.chapters[chapter - 1];
  if (!hash) throw new Error(`No commentary for ${book} ${chapter}.`);
  const data = await getJson<CommentaryChapter>(`${dataBase(baseUrl)}${id}/${slug(book)}-${chapter}.${hash}.json`, "The commentary");
  return { data, hasIntro: !!entry.intro };
}

export async function loadBookIntro(baseUrl: string, id: CommentaryId, book: string): Promise<Para[] | null> {
  const hash = (await loadManifest(baseUrl)).commentaries[id]?.books[book]?.intro;
  return hash ? getJson<Para[]>(`${dataBase(baseUrl)}${id}/${slug(book)}-intro.${hash}.json`, "The book introduction") : null;
}

export async function loadXrefs(baseUrl: string, book: string, chapter: number): Promise<XrefChapter> {
  const hash = (await loadManifest(baseUrl)).xrefs[`${book} ${chapter}`];
  if (!hash) throw new Error(`No cross references for ${book} ${chapter}.`);
  return getJson<XrefChapter>(`${dataBase(baseUrl)}xrefs/${slug(book)}-${chapter}.${hash}.json`, "Cross references");
}

// ---- Verse previews from the locally hosted full-Bible search text ----------
type SearchManifest = { translations: Record<string, { files: { book: string; file: string }[] }> };
const searchBase = (baseUrl: string) => `${trimBase(baseUrl)}/knowing-god/bible-search/`;
const verseMaps = new Map<string, Promise<Map<number, string>>>();

/** Map of chapter * 1000 + verse -> text for one book in one translation. */
export function loadBookText(baseUrl: string, translation: Translation, book: string): Promise<Map<number, string>> {
  const key = `${translation}|${book}`;
  let p = verseMaps.get(key);
  if (!p) {
    p = (async () => {
      const m = await getJson<SearchManifest>(`${searchBase(baseUrl)}manifest.json`, "The Bible text index");
      const file = m.translations[String(translation)]?.files.find(f => f.book === book)?.file;
      if (!file) throw new Error(`${book} is not available for previews.`);
      const rows = await getJson<[number, number, string][]>(`${searchBase(baseUrl)}${file}`, "Verse previews");
      return new Map(rows.map(([c, v, t]) => [c * 1000 + v, t]));
    })();
    verseMaps.set(key, p);
    p.catch(() => verseMaps.delete(key));
  }
  return p;
}
