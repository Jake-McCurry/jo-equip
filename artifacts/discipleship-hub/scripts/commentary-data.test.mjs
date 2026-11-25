// Build gate for the committed commentary and cross-reference data
// (public/bible-data/commentary). Uses only repository files; regenerate with
// scripts/generate-commentaries.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { CHAPTER_VERSES } from "../worker/bible-catalog.js";
import { COMMENTARIES } from "../src/components/bible-reader/commentary-format.ts";
import { parseRefList, validRange } from "./lib/scripture-refs.mjs";

const root = new URL("../", import.meta.url);
const dir = new URL("public/bible-data/commentary/", root);
const read = rel => fs.readFileSync(new URL(rel, dir), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const BOOKS = Object.keys(CHAPTER_VERSES);
const slug = b => b.toLowerCase().replace(/\s+/g, "-");
const short = text => createHash("sha256").update(text).digest("hex").slice(0, 10);
const code = (b, c, v) => b * 1_000_000 + c * 1_000 + v;
const expected = new Set(["manifest.json"]);
// id -> list of [where, JSON of paragraphs] for intros and comments, for the attribution check.
const texts = new Map();
const record = (id, where, paras) => { if (!texts.has(id)) texts.set(id, []); texts.get(id).push([where, JSON.stringify(paras)]); };

/** Reads a hashed file, checks its hash, and records it as expected on disk. */
const load = rel => {
  expected.add(rel);
  const text = read(rel);
  assert.equal(short(text), /\.([0-9a-f]{10})\.json$/.exec(rel)[1], `${rel} content hash`);
  return JSON.parse(text);
};

function checkParas(paras, where) {
  assert.ok(Array.isArray(paras) && paras.length, `${where}: paragraphs`);
  for (const p of paras) {
    assert.ok(["p", "h", "q", "n"].includes(p[0]), `${where}: paragraph kind ${p[0]}`);
    assert.ok(p.length > 1, `${where}: empty paragraph`);
    for (const s of p.slice(1)) {
      if (typeof s === "string") { assert.ok(s.length, `${where}: empty text`); continue; }
      assert.equal(typeof s[0], "string", `${where}: segment text`);
      assert.ok(Number.isInteger(s[1]) && s[1] >= 0 && s[1] <= 7, `${where}: flags`);
      if (s.length > 2) assert.ok(validRange(s[2], s[3]), `${where}: link "${s[0]}" → ${s[2]}-${s[3]} is outside KJV versification`);
    }
  }
}

test("pinned sources and schema", () => {
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.sources.map(s => s.file), ["MHC.zip", "JFB.zip", "Barnes.zip", "TSK.zip", "cross_references.txt"]);
  for (const s of manifest.sources) assert.match(s.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(Object.keys(manifest.commentaries).sort(), COMMENTARIES.map(c => c.id).sort());
});

test("every covered chapter has commentary, within KJV versification", () => {
  for (const { id, scope } of COMMENTARIES) {
    const books = manifest.commentaries[id].books;
    const covered = scope === "New Testament only" ? BOOKS.slice(39) : BOOKS;
    assert.deepEqual(Object.keys(books), covered, `${id}: covered books`);
    for (const book of covered) {
      const b = BOOKS.indexOf(book) + 1;
      const entry = books[book];
      assert.equal(entry.chapters.length, CHAPTER_VERSES[book].length, `${id} ${book}: chapter count`);
      if (entry.intro) checkParas(load(`${id}/${slug(book)}-intro.${entry.intro}.json`), `${id} ${book} intro`);
      entry.chapters.forEach((hash, i) => {
        const c = i + 1, where = `${id} ${book} ${c}`;
        const data = load(`${id}/${slug(book)}-${c}.${hash}.json`);
        assert.ok(data.e.length || data.i?.length, `${where}: no content`);
        if (data.i) { checkParas(data.i, `${where} intro`); record(id, `${where} intro`, data.i); }
        let prev = 0;
        for (const [from, to, paras] of data.e) {
          assert.ok(from >= code(b, c, 1) && to <= code(b, c, CHAPTER_VERSES[book][i]) && to >= from, `${where}: entry ${from}-${to} outside the chapter`);
          assert.ok(from >= prev, `${where}: entries out of order`);
          prev = from;
          checkParas(paras, `${where}:${from % 1000}`);
          record(id, `${where}:${from % 1000}`, paras);
        }
      });
    }
  }
});

test("no commentary text is attributed to two passages", () => {
  // Guards against SWORD index slots that point at another passage's stored text
  // (Barnes' chapter-1 intro slots repeat the previous book's last comment).
  for (const [id, list] of texts) {
    const seen = new Map();
    const dupes = [];
    for (const [where, json] of list) {
      if (json.length > 200 && seen.has(json)) dupes.push(`${seen.get(json)} = ${where}`);
      else seen.set(json, where);
    }
    assert.deepEqual(dupes, [], `${id}: the same comment appears under two passages`);
  }
});

test("book-boundary fixtures: chapter introductions belong to their own chapter", () => {
  const chapter = (id, book, c) => {
    const hash = manifest.commentaries[id].books[book].chapters[c - 1];
    return JSON.parse(read(`${id}/${slug(book)}-${c}.${hash}.json`));
  };
  const plain = paras => paras.map(p => p.slice(1).map(s => (typeof s === "string" ? s : s[0])).join("")).join(" ");
  for (const book of ["Mark", "John", "Romans", "1 Corinthians", "Revelation"]) {
    assert.equal(chapter("barnes", book, 1).i, undefined, `Barnes ${book} 1 must not carry a borrowed introduction`);
  }
  // Previously misattributed Barnes comments stay at their own verses.
  for (const [book, c, v, phrase] of [["Luke", 23, 56, ""], ["Acts", 27, 44, ""], ["Romans", 15, 33, ""]]) {
    const b = BOOKS.indexOf(book) + 1;
    assert.ok(chapter("barnes", book, c).e.some(([from, to]) => code(b, c, v) >= from && code(b, c, v) <= to), `Barnes ${book} ${c}:${v} comment`);
  }
  assert.match(plain(chapter("mhc", "John", 1).i ?? []), /Word|Christ/, "Matthew Henry John 1 introduction");
  assert.match(plain(chapter("mhc", "Genesis", 1).i ?? []), /creation/i, "Matthew Henry Genesis 1 introduction");
});

test("every chapter has cross references, all within KJV versification", () => {
  let rows = 0;
  for (const [bi, book] of BOOKS.entries()) {
    for (let c = 1; c <= CHAPTER_VERSES[book].length; c++) {
      const hash = manifest.xrefs[`${book} ${c}`];
      assert.ok(hash, `${book} ${c}: cross references missing`);
      const data = load(`xrefs/${slug(book)}-${c}.${hash}.json`);
      for (const [v, { w = [], r }] of Object.entries(data)) {
        const here = code(bi + 1, c, Number(v));
        assert.ok(validRange(here), `${book} ${c}:${v} is outside KJV versification`);
        const seen = new Set();
        for (const [from, to, votes, word] of r) {
          assert.ok(validRange(from, to || undefined), `${book} ${c}:${v} → ${from}-${to}`);
          assert.notEqual(from, here, `${book} ${c}:${v} refers to itself`);
          assert.ok(!seen.has(from), `${book} ${c}:${v}: duplicate ${from}`);
          seen.add(from);
          assert.ok(Number.isInteger(votes) && votes >= -1);
          assert.ok(word >= -1 && word < w.length);
          rows++;
        }
      }
    }
  }
  assert.ok(rows > 300_000, `only ${rows} cross references`);
});

test("no orphaned or missing files", () => {
  const onDisk = new Set();
  for (const sub of fs.readdirSync(dir, { withFileTypes: true })) {
    if (sub.isFile()) onDisk.add(sub.name);
    else for (const f of fs.readdirSync(new URL(`${sub.name}/`, dir))) onDisk.add(`${sub.name}/${f}`);
  }
  assert.deepEqual([...onDisk].filter(f => !expected.has(f)), [], "files not referenced by the manifest");
  assert.deepEqual([...expected].filter(f => !onDisk.has(f)), [], "files missing on disk");
});

test("reference parser handles TSK and Barnes styles", () => {
  const john3 = { b: 43, c: 3 };
  const pick = (text, ctx = john3) => parseRefList(text, ctx).map(r => [text.slice(r.start, r.end), r.from, r.to]);
  assert.deepEqual(pick("10; 7:47-49"), [["10", 43003010, undefined], ["7:47-49", 43007047, 43007049]]);
  assert.deepEqual(pick("Jn 7:50,51, 19:39"), [["Jn 7:50", 43007050, undefined], ["51", 43007051, undefined], ["19:39", 43019039, undefined]]);
  assert.deepEqual(pick("Jud 6:27; Jude 6"), [["Jud 6:27", 7006027, undefined], ["Jude 6", 65001006, undefined]]);
  assert.deepEqual(pick("1Jo 2:29; 3:9"), [["1Jo 2:29", 62002029, undefined], ["3:9", 62003009, undefined]]);
  assert.deepEqual(pick("Ps 14:1; *title"), [["Ps 14:1", 19014001, undefined]]);
  assert.equal(validRange(43003037), false, "John 3:37 does not exist");
});
