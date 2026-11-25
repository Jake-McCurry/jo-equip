// Build gate for the committed Strong's word-study data (public/bible-data/strongs).
// Uses only repository files; regenerate with scripts/generate-strongs.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { CHAPTER_VERSES } from "../worker/bible-catalog.js";
import { alignKjv, segmentKjv } from "../src/components/bible-reader/strongs-align.ts";
import { bookSlug, decodeVerse, expandVerses, normalizeStrongs, shardOf, verseCode } from "../src/components/bible-reader/strongs-format.ts";

const root = new URL("../", import.meta.url);
const dir = new URL("public/bible-data/strongs/", root);
const read = rel => fs.readFileSync(new URL(rel, dir), "utf8");
const manifest = JSON.parse(read("manifest.json"));
const BOOKS = Object.keys(CHAPTER_VERSES);
const short = text => createHash("sha256").update(text).digest("hex").slice(0, 10);

const lexicon = {};
for (const [shard, hash] of Object.entries(manifest.lexicon)) {
  const text = read(`lexicon/${shard}.${hash}.json`);
  assert.equal(short(text), hash, `lexicon ${shard} content hash`);
  for (const [num, entry] of Object.entries(JSON.parse(text))) {
    assert.equal(shardOf(num), shard, `${num} is in the wrong shard`);
    lexicon[num] = entry;
  }
}
const chapters = new Map();
for (const book of BOOKS) {
  for (let c = 1; c <= CHAPTER_VERSES[book].length; c++) {
    const hash = manifest.chapters[`${book} ${c}`];
    assert.ok(hash, `manifest missing ${book} ${c}`);
    const text = read(`chapters/${bookSlug(book)}-${c}.${hash}.json`);
    assert.equal(short(text), hash, `${book} ${c} content hash`);
    chapters.set(`${book}|${c}`, JSON.parse(text));
  }
}

test("manifest lists exactly the files on disk", () => {
  assert.equal(Object.keys(manifest.chapters).length, 1189);
  assert.equal(fs.readdirSync(new URL("chapters/", dir)).length, 1189);
  assert.equal(fs.readdirSync(new URL("lexicon/", dir)).length, Object.keys(manifest.lexicon).length);
});

test("every KJV verse has original words and KJV tags, with valid coordinates", () => {
  let verses = 0, tagged = 0;
  for (const [key, data] of chapters) {
    const [book, c] = key.split("|");
    const max = CHAPTER_VERSES[book][Number(c) - 1];
    for (const v of [...Object.keys(data.w), ...Object.keys(data.k)]) {
      assert.ok(Number(v) >= 1 && Number(v) <= max, `${book} ${c}:${v} outside KJV versification`);
    }
    for (let v = 1; v <= max; v++) {
      verses++;
      assert.ok(data.w[v]?.length, `${book} ${c}:${v} has no original-language words`);
      if (data.k[v]?.length) tagged++;
    }
  }
  assert.equal(verses, 31102);
  assert.ok(tagged >= 31000, `only ${tagged} KJV verses carry Strong's tags`);
});

test("every Strong's reference resolves to a lexicon entry", () => {
  const missing = new Set();
  for (const data of chapters.values()) {
    for (const rows of Object.values(data.w)) for (const r of rows) if (!lexicon[r[2]]) missing.add(r[2]);
    for (const tags of Object.values(data.k)) for (const [, n] of tags) if (!lexicon[n]) missing.add(n);
  }
  assert.deepEqual([...missing], []);
  for (const [num, e] of Object.entries(lexicon)) {
    assert.match(num, /^[HG][1-9]\d*$/);
    assert.ok(e.s || e.g, `${num} has neither a definition nor a gloss`);
    const refs = expandVerses(e.v).map(decodeVerse);
    assert.ok(refs.length > 0, `${num} has no verses`);
    for (const r of refs) assert.ok(r.verse >= 1 && r.verse <= (CHAPTER_VERSES[BOOKS[r.book - 1]]?.[r.chapter - 1] ?? 0), `${num} bad verse ${JSON.stringify(r)}`);
  }
  assert.equal(lexicon.G25.l, "ἀγαπάω");
  assert.equal(lexicon.H430.l, "אֱלֹהִים");
});

test("KJV tags align with the reader's existing KJV text", () => {
  const search = new URL("public/knowing-god/bible-search/", root);
  const sm = JSON.parse(fs.readFileSync(new URL("manifest.json", search), "utf8"));
  let total = 0, aligned = 0;
  for (const { book, file } of sm.translations.kjv.files) {
    for (const [c, v, text] of JSON.parse(fs.readFileSync(new URL(file, search), "utf8"))) {
      const tags = chapters.get(`${book}|${c}`).k[v] ?? [];
      total += tags.length;
      aligned += alignKjv(text, tags).length;
    }
  }
  assert.ok(aligned / total >= 0.995, `alignment ${(aligned / total * 100).toFixed(2)}%`);
});

test("John 3:16 data: Greek order and KJV tap targets", () => {
  const john3 = chapters.get("John|3");
  assert.deepEqual(john3.w[16].slice(0, 3).map(r => r[2]), ["G3779", "G1063", "G25"]);
  const text = "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.";
  const segs = segmentKjv(text, alignKjv(text, john3.k[16]));
  assert.equal(segs.map(s => s.text).join(""), text, "segmenting never alters the verse text");
  assert.deepEqual(segs.find(s => s.text === "loved"), { text: "loved", strongs: "G25" });
});

test("alignment tolerates edition differences without mis-tagging", () => {
  const text = "The LORD\nis my shepherd; I shall not want.";
  const spans = alignKjv(text, [["The LORD", "H3068"], ["shepherd", "H7462"], ["nonexistent", "H1"], ["want", "H2637"]]);
  assert.deepEqual(spans.map(s => [text.slice(s.start, s.end), s.strongs]), [["The LORD\nis".slice(0, 8), "H3068"], ["shepherd", "H7462"], ["want", "H2637"]]);
  assert.deepEqual(alignKjv("Father’s house", [["Father's", "G3962"]]).length, 1);
});

test("Strong's number and verse code helpers", () => {
  assert.equal(normalizeStrongs("g0025"), "G25");
  assert.equal(normalizeStrongs(" H430 "), "H430");
  for (const bad of ["G0", "X25", "G25a", "", null, "H12345"]) assert.equal(normalizeStrongs(bad), null);
  assert.deepEqual(decodeVerse(verseCode(43, 3, 16)), { book: 43, chapter: 3, verse: 16 });
  assert.deepEqual(expandVerses([5, 2, 3]), [5, 7, 10]);
});
