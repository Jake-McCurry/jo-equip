import assert from "node:assert/strict";
import test from "node:test";
import { createBibleHandler, parseBibleQuery, upstreamUrl, validateChapter, bibleExpressMiddleware } from "../worker/bible.js";
import { BOOKS, CHAPTER_VERSES } from "../worker/bible-catalog.js";
import worker from "../worker/index.js";
import { getNextChapter, getPreviousChapter, parseReference } from "../src/components/bible-reader/catalog.ts";

const request = (query = "", method = "GET") => new Request(`https://equip.jesusonline.com/api/bible${query}`, { method });
// Deliberately synthetic upstream rows used ONLY in validation unit tests.
function chapterRows(book = "John", chapter = 1, translation = "net") {
  const rows = Array.from({ length: CHAPTER_VERSES[book][chapter - 1] }, (_, i) => ({
    bookname: book, book_name: book, chapter: String(chapter), verse: String(i + 1), text: `Test verse ${i + 1}.`,
  }));
  return translation === "net" ? rows : { translation_id: "kjv", verses: rows };
}

test("66 books, 1189 chapters and 31102 KJV verses", () => {
  assert.equal(BOOKS.length, 66);
  assert.equal(BOOKS.reduce((sum, b) => sum + b.chapters, 0), 1189);
  assert.equal(Object.values(CHAPTER_VERSES).flat().reduce((sum, n) => sum + n, 0), 31102);
});

test("reader catalog parses references and crosses book boundaries without wrapping", () => {
  assert.deepEqual(parseReference("john 1:14"), { book: "John", chapter: 1, verse: 14 });
  assert.deepEqual(parseReference("Psalm 119:176"), { book: "Psalms", chapter: 119, verse: 176 });
  assert.deepEqual(parseReference("Song of Songs 2"), { book: "Song of Solomon", chapter: 2 });
  assert.deepEqual(parseReference("Jude"), { book: "Jude", chapter: 1 });
  for (const input of ["John 22", "Jude 2", "John 1:52", "John 0", "John 1junk", "Unknown"]) assert.equal(parseReference(input), null, input);
  assert.deepEqual(getNextChapter("John", 21), { book: "Acts", chapter: 1 });
  assert.deepEqual(getPreviousChapter("Acts", 1), { book: "John", chapter: 21 });
  assert.equal(getNextChapter("Revelation", 22), null);
  assert.equal(getPreviousChapter("Genesis", 1), null);
  assert.equal(getNextChapter("John", 22), null);
});

test("John 1 NET defaults; strict query validation and canonical aliases", async () => {
  assert.deepEqual(parseBibleQuery(request().url), { book: "John", chapter: 1, translation: "net" });
  assert.equal(parseBibleQuery(request("?book=Psalm&chapter=119&translation=kjv").url).book, "Psalms");
  const handler = createBibleHandler({ fetcher: () => { throw new Error("Invalid queries must not fetch"); } });
  for (const query of ["?translation=niv", "?translation=", "?book=Unknown", "?book=", "?chapter=0", "?chapter=22", "?chapter=1.5", "?chapter=1e0", "?chapter=-1", "?chapter=1&chapter=2", "?book=Jude&chapter=2", "?book=John&book=Mark"]) {
    const response = await handler(request(query));
    assert.equal(response.status, 400, query);
    assert.equal(typeof (await response.json()).error, "string");
  }
  assert.equal((await handler(request("", "POST"))).status, 405);
});

test("explicit one-chapter ranges prevent upstream verse-only responses", () => {
  for (const [book, count] of [["Obadiah", 21], ["Philemon", 25], ["2 John", 13], ["3 John", 14], ["Jude", 25]]) {
    const query = { book, chapter: 1, translation: "kjv" };
    assert.ok(decodeURIComponent(upstreamUrl(query)).includes(`${book} 1:1-${count}`));
    assert.equal(validateChapter(chapterRows(book, 1, "kjv"), query).verses.length, count);
    assert.throws(() => validateChapter({ translation_id: "kjv", verses: chapterRows(book).slice(0, 1) }, query), /incomplete/);
  }
});

test("upstream must return complete matching coordinates, text and translation", () => {
  const query = { book: "John", chapter: 1, translation: "net" };
  assert.equal(validateChapter(chapterRows(), query).verses.length, 51);
  assert.throws(() => validateChapter(chapterRows().slice(0, 50), query), /incomplete/);
  for (const replacement of [{ bookname: "Mark" }, { chapter: "2" }, { verse: "52" }, { verse: "2" }, { text: "" }]) {
    const data = chapterRows();
    data[0] = { ...data[0], ...replacement };
    assert.throws(() => validateChapter(data, query));
  }
  assert.throws(() => validateChapter({ translation_id: "web", verses: chapterRows() }, { ...query, translation: "kjv" }), /translation/);
});

test("NET omissions and renumbering are narrowly allowlisted, never invented Scripture", () => {
  for (const [book, chapter, missing] of [["John", 5, [4]], ["Mark", 9, [44, 46]], ["2 Corinthians", 13, [14]], ["Acts", 24, [7]]]) {
    const query = { book, chapter, translation: "net" };
    const data = chapterRows(book, chapter).filter(row => !missing.includes(Number(row.verse)));
    assert.equal(validateChapter(data, query).verses.length, CHAPTER_VERSES[book][chapter - 1] - missing.length);
    assert.throws(() => validateChapter(data.slice(1), query), /incomplete/);
  }
});

test("success cache is translation-specific; upstream HTTP/timeout/JSON errors explicit and uncached", async () => {
  let calls = 0;
  const handler = createBibleHandler({ fetcher: async url => {
    calls++;
    return Response.json(chapterRows("John", 1, url.includes("translation=kjv") ? "kjv" : "net"));
  } });
  for (const query of ["", "", "?translation=kjv", "?translation=kjv"]) assert.equal((await handler(request(query))).status, 200);
  assert.equal(calls, 2);
  for (const [fetcher, status] of [
    [async () => new Response("rate limited", { status: 429 }), 502],
    [async () => new Response("not json"), 502],
    [async () => { throw new DOMException("Timeout", "TimeoutError"); }, 504],
    [async () => Response.json(chapterRows().slice(0, 1)), 502],
  ]) {
    const result = await createBibleHandler({ fetcher })(request());
    assert.equal(result.status, status);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.ok((await result.json()).error);
  }
});

test("production worker and Express development adapter return identical API contracts", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json(chapterRows());
  try {
    for (const query of ["", "?translation=invalid", "?chapter=0", "?book=Jude&chapter=2"]) {
      const production = await worker.fetch(request(query), {}, {});
      let status, body;
      const headers = new Headers();
      await bibleExpressMiddleware({ originalUrl: `/api/bible${query}`, method: "GET" }, {
        status(code) { status = code; },
        setHeader(name, value) { headers.set(name, value); },
        send(value) { body = value; },
      });
      assert.equal(status, production.status);
      assert.deepEqual(JSON.parse(body), await production.json());
      assert.equal(headers.get("cache-control"), production.headers.get("cache-control"));
    }
  } finally { globalThis.fetch = original; }
});

test("live official sources: John 1 NET/KJV and all five one-chapter KJV books", { skip: process.env.BIBLE_LIVE !== "1" }, async () => {
  const handler = createBibleHandler({ timeoutMs: 20000 });
  const results = [];
  for (const [book, translation, count] of [["John", "net", 51], ["John", "kjv", 51], ["Obadiah", "kjv", 21], ["Philemon", "kjv", 25], ["2 John", "kjv", 13], ["3 John", "kjv", 14], ["Jude", "kjv", 25]]) {
    const response = await handler(request(`?book=${encodeURIComponent(book)}&chapter=1&translation=${translation}`));
    const data = await response.json();
    assert.equal(response.status, 200, JSON.stringify(data));
    assert.equal(data.verses.length, count);
    assert.equal(data.verses.at(-1).verse, count);
    results.push(data);
  }
  assert.match(results[0].verses[0].text, /fully God/);
  assert.match(results[1].verses[0].text, /Word was God/);
  assert.notEqual(results[0].verses[0].text, results[1].verses[0].text);
});