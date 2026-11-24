import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import * as engine from "../src/components/knowing-god/full-bible-search.ts";
import { CHAPTER_VERSES } from "../worker/bible-catalog.js";
import { NET_OMISSIONS } from "../worker/bible.js";
const root = new URL("../public/knowing-god/bible-search/", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", root)));
function corpus(translation) {
  return manifest.translations[translation].files.flatMap((f, bookIndex) =>
    JSON.parse(fs.readFileSync(new URL(f.file, root))).map(([chapter, verse, text]) => ({
      book: f.book, bookIndex, chapter, verse, text, normalized: engine.normalizeSearch(text),
    })));
}
const net = corpus("net"), kjv = corpus("kjv");
test("all 66 books have exact published coverage, valid content hashes and measured gzip sizes", () => {
  for (const [version, verses] of [["net", net], ["kjv", kjv]]) {
    const info = manifest.translations[version];
    assert.deepEqual(info.files.map(f => f.book), Object.keys(CHAPTER_VERSES));
    assert.equal(verses.length, info.verses);
    let compressed = 0;
    for (const f of info.files) {
      const payload = fs.readFileSync(new URL(f.file, root));
      assert.ok(f.file.includes(createHash("sha256").update(payload).digest("hex").slice(0, 12)));
      compressed += gzipSync(payload).length;
    }
    assert.equal(compressed, info.gzipBytes);
    const coordinates = new Set(verses.map(v => `${v.book} ${v.chapter}:${v.verse}`));
    assert.equal(coordinates.size, verses.length);
    for (const [book, chapters] of Object.entries(CHAPTER_VERSES)) {
      chapters.forEach((total, c) => {
        for (let v = 1; v <= total; v++) {
          const omitted = version === "net" && (NET_OMISSIONS[`${book} ${c + 1}`] ?? []).includes(v);
          assert.equal(coordinates.has(`${book} ${c + 1}:${v}`), !omitted);
        }
      });
    }
  }
  assert.equal(net.length, 31085);
  assert.equal(kjv.length, 31102);
});
const search = (verses, query, page = 1, testament = "All Testaments", book = "All books") =>
  engine.searchBiblePage(verses, query, testament, book, page);
test("selected-version wording, Unicode punctuation, contiguous phrases and whole words", () => {
  assert.ok(search(net, "one AND only", 1, "New Testament", "John").verses.some(v => v.chapter === 3 && v.verse === 16));
  assert.equal(search(net, "only begotten", 1, "New Testament", "John").total, 0);
  assert.ok(search(kjv, "only begotten", 1, "New Testament", "John").verses.some(v => v.chapter === 3 && v.verse === 16));
  assert.equal(engine.normalizeSearch("God’s\n   SON"), "god s son");
  assert.equal(search(net, "~~~").total, 0);
  assert.equal(search(net, "begott").total, 0);
  assert.equal(search(kjv, "beginning the God").total, 0);
});
test("full Bible finds text outside the preserved curated corpus", () => {
  const data = new URL("../public/knowing-god/data/", import.meta.url);
  const curated = fs.readdirSync(data).filter(f => /^topics-.*\.json$/.test(f)).flatMap(f =>
    JSON.parse(fs.readFileSync(new URL(f, data))).topics.flatMap(t => t.passages.map(p => engine.normalizeSearch(p.text))));
  const outside = kjv.find(v => v.text.length > 50 && !curated.some(p => p.includes(v.normalized)));
  assert.ok(outside);
  const result = search(kjv, outside.text);
  assert.ok(result.verses.some(v => v.book === outside.book && v.chapter === outside.chapter && v.verse === outside.verse));
  console.log("Outside curated text example:", outside.book, outside.chapter, outside.verse);
});
test("filters and canonical sorting apply before twenty-verse pagination", () => {
  const all = [];
  for (let page = 1; page <= search(kjv, "God").pages; page++) {
    const result = search(kjv, "God", page);
    assert.ok(result.verses.length <= 20);
    all.push(...result.verses);
  }
  assert.equal(all.length, search(kjv, "God").total);
  const sorted = [...all].sort((a,b) => a.bookIndex-b.bookIndex || a.chapter-b.chapter || a.verse-b.verse);
  assert.deepEqual(all, sorted);
  assert.ok(search(net, "God", 1, "Old Testament").verses.every(v => v.bookIndex < 39));
  assert.equal(search(net, "God", 1, "Old Testament", "John").total, 0);
  assert.ok(search(net, "God", 1, "New Testament", "John").verses.every(v => v.book === "John"));
});
function workerHarness(fetcher) {
  const messages = [], self = { postMessage: m => messages.push(m) };
  const source = fs.readFileSync(new URL("../src/components/knowing-god/full-bible.worker.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports: {}, require: () => engine, self, fetch: fetcher, AbortSignal, performance });
  const run = (id, overrides = {}) => self.onmessage({ data: { id, base: "/", translation: "NET", query: "God", testament: "All Testaments", book: "All books", page: 1, ...overrides } });
  return { messages, run };
}
const response = url => new Response(fs.readFileSync(new URL(url.slice(1), root)));
test("worker loads only selected translation, caches it, retries failures and returns one page", async () => {
  const urls = []; let fail = true;
  const h = workerHarness(async url => {
    urls.push(url);
    if (fail && url !== "/manifest.json") return new Response("", { status: 503 });
    return response(url);
  });
  await h.run(1);
  assert.ok(h.messages[0].error);
  fail = false;
  await h.run(2);
  assert.equal(h.messages[1].verses.length, 20);
  const requests = urls.length;
  await h.run(3, { query: "love", page: 2 });
  assert.equal(urls.length, requests);
  assert.ok(!urls.some(u => u.includes("kjv-")));
  assert.ok(h.messages[2].verses.every(v => !("normalized" in v)));
});
test("worker suppresses obsolete searches while a corpus loads", async () => {
  let release;
  const wait = new Promise(resolve => release = resolve);
  const h = workerHarness(async url => { await wait; return response(url); });
  const first = h.run(1, { query: "God" });
  const second = h.run(2, { query: "love", translation: "KJV" });
  release();
  await Promise.all([first, second]);
  assert.deepEqual(h.messages.map(m => m.id), [2]);
});
test("record search-only timing on this development server, not phone performance", () => {
  const samples = [];
  for (let i = 0; i < 30; i++) {
    const start = performance.now();
    search(net, ["God", "love", "one and only", "zzzzzz"][i % 4]);
    samples.push(performance.now() - start);
  }
  samples.sort((a,b) => a-b);
  console.log(`NET search-only: median ${samples[15].toFixed(1)}ms, p95 ${samples[28].toFixed(1)}ms (Node, preloaded data; excludes network/indexing).`);
});
