import { canonicalBook, CHAPTER_VERSES } from "./bible-catalog.js";

export const ATTRIBUTION = {
  net: "Scripture quoted by permission. Quotations designated NET are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C. https://netbible.com. All rights reserved.",
  kjv: "King James Version (KJV). Public domain.",
};
// Individually reviewed official labs.bible.org omissions. 2 Cor 13 combines
// traditional verses 12–13; its final blessing is verse 13, not verse 14.
// Labs retains 3 John 14 with the (1:15) text inside it.
export const NET_OMISSIONS = {
  "Matthew 17": [21], "Matthew 18": [11], "Matthew 23": [14],
  "Mark 7": [16], "Mark 9": [44, 46], "Mark 11": [26], "Mark 15": [28],
  "Luke 17": [36], "John 5": [4], "Acts 8": [37], "Acts 15": [34],
  "Acts 24": [7], "Acts 28": [29], "Romans 16": [24], "2 Corinthians 13": [14],
};

class BibleError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}
export function parseBibleQuery(url) {
  const params = new URL(url).searchParams;
  for (const key of ["book", "chapter", "translation"]) {
    if (params.getAll(key).length > 1) throw new BibleError(`Specify ${key} only once.`, 400);
  }
  const book = canonicalBook(params.get("book") ?? "John");
  if (!book) throw new BibleError("Unknown Bible book.", 400);
  const raw = params.get("chapter") ?? "1";
  if (!/^[1-9]\d*$/.test(raw) || Number(raw) > CHAPTER_VERSES[book].length) {
    throw new BibleError("Chapter is outside this book's valid range.", 400);
  }
  const translation = params.get("translation") ?? "net";
  if (!["net", "kjv"].includes(translation)) throw new BibleError("Translation must be net or kjv.", 400);
  return { book, chapter: Number(raw), translation };
}

export function upstreamUrl({ book, chapter, translation }) {
  // Explicit range is essential: bible-api interprets '3 John 1' as verse 1.
  const reference = `${book} ${chapter}:1-${CHAPTER_VERSES[book][chapter - 1]}`;
  return translation === "kjv"
    ? `https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`
    : `https://labs.bible.org/api/?passage=${encodeURIComponent(reference)}&type=json&formatting=plain`;
}

export function validateChapter(data, { book, chapter, translation }) {
  if (translation === "kjv" && data?.translation_id !== "kjv") throw new BibleError("Bible source returned the wrong translation.");
  const rows = translation === "net" ? data : data?.verses;
  if (!Array.isArray(rows)) throw new BibleError("Bible source returned an invalid chapter.");
  const max = CHAPTER_VERSES[book][chapter - 1];
  const omitted = translation === "net" ? NET_OMISSIONS[`${book} ${chapter}`] ?? [] : [];
  const found = new Map();
  for (const row of rows) {
    const verse = Number(row.verse);
    if (canonicalBook(row.bookname ?? row.book_name) !== book || Number(row.chapter) !== chapter ||
        !Number.isInteger(verse) || verse < 1 || verse > max || found.has(verse) || typeof row.text !== "string") {
      throw new BibleError("Bible source returned mismatched or duplicate verse coordinates.");
    }
    // Official NET can include markup (speaker headings), even with plain format.
    const text = row.text.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
    if (!text && !omitted.includes(verse)) throw new BibleError("Bible source returned an empty verse.");
    found.set(verse, text);
  }
  for (let verse = 1; verse <= max; verse++) {
    if (!found.has(verse) && !omitted.includes(verse)) throw new BibleError(`Bible source returned an incomplete chapter (missing verse ${verse}).`);
  }
  return { book, chapter, translation, verses: [...found].filter(([, text]) => text).sort(([a], [b]) => a - b).map(([verse, text]) => ({ verse, text })), attribution: ATTRIBUTION[translation] };
}

// Bounded, success-only server cache; clients also cache successful chapters.
// No cross-translation fallback and no existing concordance corpus modifications.
export function createBibleHandler({ fetcher = (...args) => fetch(...args), timeoutMs = 12000 } = {}) {
  const cache = new Map();
  return async function handleBible(request) {
    const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
    if (request.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers: { ...headers, Allow: "GET" } });
    try {
      const query = parseBibleQuery(request.url);
      const key = `${query.translation}:${query.book}:${query.chapter}`;
      let result = cache.get(key);
      if (!result) {
        const response = await fetcher(upstreamUrl(query), { signal: AbortSignal.timeout(timeoutMs), headers: { Accept: "application/json" } });
        if (!response.ok) throw new BibleError(`Bible source unavailable (HTTP ${response.status}). Please try again.`);
        result = validateChapter(await response.json(), query);
        if (cache.size >= 128) cache.delete(cache.keys().next().value);
        cache.set(key, result);
      }
      return new Response(JSON.stringify(result), { headers: { ...headers, "Cache-Control": "public, max-age=86400" } });
    } catch (error) {
      const status = error instanceof BibleError ? error.status : error?.name === "TimeoutError" || error?.name === "AbortError" ? 504 : 502;
      const message = error instanceof BibleError ? error.message : status === 504 ? "Bible source timed out. Please try again." : "Unable to load this Bible chapter. Please try again.";
      return new Response(JSON.stringify({ error: message }), { status, headers });
    }
  };
}
export const handleBible = createBibleHandler();

// Shared Express adapter keeps development/worker validation and response parity.
export async function bibleExpressMiddleware(req, res) {
  const result = await handleBible(new Request(`https://reader.local${req.originalUrl}`, { method: req.method }));
  res.status(result.status);
  result.headers.forEach((value, name) => res.setHeader(name, value));
  res.send(await result.text());
}