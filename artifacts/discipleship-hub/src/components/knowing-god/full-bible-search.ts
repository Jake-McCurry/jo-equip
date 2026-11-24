export type BibleVerse = { book: string; bookIndex: number; chapter: number; verse: number; text: string; normalized: string };
export function normalizeSearch(text: string) {
  return text.normalize("NFKC").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
export function searchBiblePage(verses: BibleVerse[], query: string, testament: string, book: string, page: number) {
  const normalized = normalizeSearch(query);
  const matches = normalized ? verses.filter(v =>
    (book === "All books" || v.book === book) &&
    (testament === "All Testaments" || (v.bookIndex < 39 ? "Old Testament" : "New Testament") === testament) &&
    ` ${v.normalized} `.includes(` ${normalized} `)) : [];
  // Input corpus is validated and sorted canonically before searching.
  const pages = Math.max(1, Math.ceil(matches.length / 20));
  const current = Math.max(1, Math.min(page, pages));
  return { total: matches.length, page: current, pages, verses: matches.slice((current - 1) * 20, current * 20)
    .map(({ normalized: _, ...verse }) => verse) };
}
