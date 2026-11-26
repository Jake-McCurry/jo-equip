// Build gate for the committed commentary and cross-reference data
// (public/bible-data/commentary). Uses only repository files; regenerate with
// scripts/generate-commentaries.mjs.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { CHAPTER_VERSES } from "../worker/bible-catalog.js";
import { COMMENTARIES } from "../src/components/bible-reader/commentary-format.ts";
import { parseClassicRef, parseContinuation, parseRefList, validRange } from "./lib/scripture-refs.mjs";

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

test("reference parser handles Matthew Henry styles", () => {
  const gen25 = { b: 1, c: 25 };
  const pick = (text, lastB = 1, bare = gen25) => parseClassicRef(text, gen25, lastB, bare)?.map(r => [text.slice(r.start, r.end), r.from, r.to]) ?? null;
  assert.deepEqual(pick("Jas. iii. 7"), [["Jas. iii. 7", 59003007, undefined]]);
  assert.deepEqual(pick("v. 26"), [["v. 26", 1025026, undefined]]);
  assert.deepEqual(pick("xxi. 13"), [["xxi. 13", 1021013, undefined]]);
  assert.deepEqual(pick("Ps. v. 16"), [["Ps. v. 16", 19005016, undefined]]);
  assert.deepEqual(pick("1 Kings viii. and ix."), [["1 Kings viii", 11008000, undefined], ["ix", 11009000, undefined]]);
  assert.deepEqual(pick("ver. 9-15 and again ver. 20, 21"), [["ver. 9-15", 1025009, 1025015], ["ver. 20", 1025020, undefined], ["21", 1025021, undefined]]);
  assert.deepEqual(pick("28", 45, { b: 45, c: 3 }), [["28", 45003028, undefined]]);
  assert.equal(pick("28", 1, null), null, "a bare number after an unlinkable reference");
  assert.equal(pick("Dan. 15"), null, "a mis-tagged verse number");
  assert.equal(pick("2 Macc. ii. 4, 5"), null, "Apocrypha");
  assert.equal(pick("second verse"), null);
  assert.equal(pick("v. 7", 16, { b: 16, c: 4 }), null, "\"Neh. iv. 9; v. 7\": chapter v or a local verse");
  assert.deepEqual(pick("v. 7", 1, { b: 1, c: 25 }), [["v. 7", 1025007, undefined]], "continuing the same book");
});

test("continuations after a linked reference", () => {
  const pick = (text, ctx) => parseContinuation(text, ctx).refs.map(r => [text.slice(r.start, r.end), r.from, r.to]);
  const jas = { b: 59, c: 1, verse: true };
  assert.deepEqual(pick("; 2:5) all things", jas), [["2:5", 59002005, undefined]]);
  assert.deepEqual(pick(", 18-23; Mr", { b: 40, c: 13, verse: true }), [["18-23", 40013018, 40013023]]);
  assert.deepEqual(pick(", 7; 16:10", { b: 5, c: 12, verse: true }), [["7", 5012007, undefined], ["16:10", 5016010, undefined]]);
  assert.deepEqual(pick("; 24, 25)", { b: 19, c: 23, verse: false }), [["24", 19024000, undefined], ["25", 19025000, undefined]]);
  assert.deepEqual(pick(", 2 Kings 3", jas), [], "a numbered book is not a verse");
  assert.deepEqual(pick(", 7 times", jas), [], "a number in prose");
  assert.deepEqual(pick("; 9:99.", jas), [], "outside KJV versification");
  assert.deepEqual(pick(". 3. Free", jas), [], "outline numbering");
  assert.deepEqual(pick(", 2. They", jas), [], "outline numbering after a comma");
});

test("commentary link fixtures: continuations and printed references", () => {
  const chapter = (id, book, c) => JSON.parse(read(`${id}/${slug(book)}-${c}.${manifest.commentaries[id].books[book].chapters[c - 1]}.json`));
  /** Every link in a chapter as [text before (40 chars), link text, from, to]. */
  const links = (id, book, c) => {
    const d = chapter(id, book, c), out = [];
    for (const p of [...(d.i ?? []), ...d.e.flatMap(e => e[2])]) {
      let before = "";
      for (const s of p.slice(1)) {
        if (Array.isArray(s) && s.length > 2) out.push([before.slice(-40), s[0], s[2], s[3]]);
        before += typeof s === "string" ? s : s[0];
      }
    }
    return out;
  };
  const has = (list, text, from, to) => list.some(l => l[1] === text && l[2] === from && l[3] === to);
  // JFB on Romans 8:28: "Jas 1:12; 2:5" — the continuation links to James 2:5.
  assert.ok(has(links("jfb", "Romans", 8), "2:5", 59002005, undefined), "JFB Romans 8: Jas 2:5 continuation");
  // JFB tagged "Mt 13:3-9, 18" as Matt.13.3-Matt.9.18; the printed range wins and "18-23" continues it.
  const mt13 = links("jfb", "Matthew", 13);
  assert.ok(has(mt13, "Mt 13:3-9", 40013003, 40013009) && has(mt13, "18-23", 40013018, 40013023), "JFB Matthew 13 sower");
  // Barnes: "Php 2:1; 3:10" continues Philippians, not the book being commented on.
  assert.ok(has(links("barnes", "Philemon", 1), "3:10", 50003010, undefined), "Barnes Philemon 6: Php 3:10");
  // Matthew Henry: printed "Jas. iii. 7" wins over the mistagged Jas.9.7.
  assert.ok(has(links("mhc", "Genesis", 9), "Jas. iii. 7", 59003007, undefined), "MHC Genesis 9: Jas 3:7");
  // Book-less references that do not continue another reference stay unlinked.
  const bad = [
    ["mhc", "John", 4, l => l[1] === "ch. xxiv. 15"], // "Joshua, ch. xxiv. 15": not Genesis 24:15
    ["mhc", "1 John", 1, l => l[1] === "ch. i. 14"], // "in his gospel (ch. i. 14)": not 2 Peter 1:14
    ["mhc", "Proverbs", 15, l => l[2] === 20015007 && /Neh\. [ivxlc]+\. \d+[;,] $/.test(l[0])], // "Neh. …; v. 7" is not Proverbs 15:7
    ["mhc", "Deuteronomy", 30, l => l[1] === "1" && /last verse, $/.test(l[0])], // outline numbering
  ];
  for (const [id, book, c, match] of bad) assert.deepEqual(links(id, book, c).filter(match), [], `${id} ${book} ${c}: ambiguous reference linked`);
});
