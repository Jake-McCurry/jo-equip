// Reader-side Easton's Bible Dictionary data (see scripts/generate-bible-dictionary.mjs).
// The content-hashed index and per-letter entry files are fetched from
// /bible-data/dictionary/ only when the Dictionary tab is opened.
import manifest from "@/data/bible-dictionary/manifest.json";
import type { DictPara } from "@/data/bible-dictionary";
import { prepareDictSearch, type DictSearchDoc, type DictSearchRow } from "./dictionary-search";

/** entries: [slug, title]; chapters: "John 3" -> [[entryIndex, [verses]]]; places: entry slug -> Bible map place slugs. */
export type DictIndex = { entries: [string, string][]; chapters: Record<string, [number, number[]][]>; places: Record<string, string[]> };

const trim = (baseUrl: string) => baseUrl.replace(/\/$/, "");
export const dictEntryHref = (baseUrl: string, slug: string) => `${trim(baseUrl)}/bible/dictionary/${slug}`;
export const dictIndexHref = (baseUrl: string) => `${trim(baseUrl)}/bible/dictionary`;
const letterOf = (slug: string) => (/^[a-z]/.test(slug) ? slug[0] : "#");

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
export const loadDictIndex = (baseUrl: string) =>
  getJson<DictIndex>(`${trim(baseUrl)}/bible-data/dictionary/index.${manifest.files.index}.json`, "The dictionary index");
export const dictSearchHref = (baseUrl: string) =>
  `${trim(baseUrl)}/bible-data/dictionary/search.${manifest.files.search}.json`;
let searchDocs: Promise<DictSearchDoc[]> | null = null;
/** The full text of every article, folded for searching (see dictionary-search.ts). */
export function loadDictSearch(baseUrl: string): Promise<DictSearchDoc[]> {
  if (!searchDocs) {
    const p = getJson<DictSearchRow[]>(dictSearchHref(baseUrl), "The full text of the dictionary").then(prepareDictSearch);
    p.catch(() => { if (searchDocs === p) searchDocs = null; }); // allow a retry
    searchDocs = p;
  }
  return searchDocs;
}
export async function loadDictEntry(baseUrl: string, slug: string): Promise<DictPara[]> {
  const l = letterOf(slug);
  const hash = (manifest.files.letters as Record<string, string>)[l];
  if (!hash) throw new Error(`No dictionary entry “${slug}”.`);
  const all = await getJson<Record<string, DictPara[]>>(`${trim(baseUrl)}/bible-data/dictionary/${l}.${hash}.json`, "The dictionary entry");
  const paras = all[slug];
  if (!paras) throw new Error(`No dictionary entry “${slug}”.`);
  return paras;
}
