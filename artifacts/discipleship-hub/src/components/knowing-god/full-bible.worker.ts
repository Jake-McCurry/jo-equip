import { normalizeSearch, searchBiblePage, type BibleVerse } from "./full-bible-search";
type Request = { id: number; base: string; translation: "NET" | "KJV"; query: string; testament: string; book: string; page: number };
type Corpus = { files: { book: string; file: string; verses: number }[]; verses: number; attribution: string; numberingNote?: string };
const loaded = new Map<string, Promise<{ verses: BibleVerse[]; info: Corpus }>>();
async function json(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Bible search data could not be loaded (${response.status}).`);
  return response.json();
}
async function load(request: Request) {
  const key = request.base + request.translation;
  let promise = loaded.get(key);
  if (!promise) {
    promise = (async () => {
      const manifest = await json(`${request.base}manifest.json`);
      const info: Corpus = manifest.translations?.[request.translation.toLowerCase()];
      if (manifest.schemaVersion !== 1 || info?.files?.length !== 66) throw new Error("Incomplete Bible search manifest.");
      const groups: BibleVerse[][] = [];
      let next = 0;
      await Promise.all(Array.from({ length: 4 }, async () => {
        while (next < info.files.length) {
          const index = next++, file = info.files[index];
          if (!/^[a-z0-9.-]+\.json$/.test(file.file)) throw new Error("Invalid Bible search file.");
          const rows: [number, number, string][] = await json(request.base + file.file);
          if (!Array.isArray(rows) || rows.length !== file.verses) throw new Error("Incomplete Bible search book.");
          groups[index] = rows.map(([chapter, verse, text]) => {
            if (!Number.isInteger(chapter) || !Number.isInteger(verse) || typeof text !== "string" || !text.trim()) throw new Error("Invalid Bible search verse.");
            return { book: file.book, bookIndex: index, chapter, verse, text, normalized: normalizeSearch(text) };
          });
        }
      }));
      const verses = groups.flat().sort((a, b) => a.bookIndex - b.bookIndex || a.chapter - b.chapter || a.verse - b.verse);
      if (verses.length !== info.verses) throw new Error("Incomplete Bible search corpus.");
      return { verses, info };
    })();
    loaded.set(key, promise);
    promise.catch(() => loaded.delete(key));
  }
  return promise;
}
let latest = 0;
self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  latest = request.id;
  try {
    const { verses, info } = await load(request);
    if (latest !== request.id) return;
    const start = performance.now();
    const result = searchBiblePage(verses, request.query, request.testament, request.book, request.page);
    self.postMessage({ id: request.id, ...result, attribution: info.attribution, numberingNote: info.numberingNote, searchMs: performance.now() - start });
  } catch (error) {
    if (latest === request.id) self.postMessage({ id: request.id, error: error instanceof Error ? error.message : "Bible search failed." });
  }
};
