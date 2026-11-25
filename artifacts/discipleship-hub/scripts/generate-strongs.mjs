// Explicit maintenance command, never a network-dependent part of normal builds.
// Usage:
//   bash scripts/fetch-strongs-sources.sh /tmp/strongs-sources
//   node scripts/generate-strongs.mjs /tmp/strongs-sources
// Writes content-hashed word-study data to public/bible-data/strongs/.
// See scripts/data/bible-search-sources.md for sources and licenses.
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { CHAPTER_VERSES } from "../worker/bible-catalog.js";
import { alignKjv } from "../src/components/bible-reader/strongs-align.ts";
import { verseCode, bookSlug, SHARD_SIZE, shardOf } from "../src/components/bible-reader/strongs-format.ts";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/generate-strongs.mjs <sources directory>");
const root = new URL("../", import.meta.url);
const out = new URL("public/bible-data/strongs/", root);
const sha = text => createHash("sha256").update(text).digest("hex");
const BOOKS = Object.keys(CHAPTER_VERSES);

// Pinned digests. If a source is re-downloaded and differs, review the change
// (verse counts, tagging) and then update the digest and the sources notes.
const SOURCES = {
  "strongs-hebrew-dictionary.js": "5ce6aeed551c709f49bcfa341cadf2f34bc7599b85d9de9e6ac2ecbf60fc3739",
  "strongs-greek-dictionary.js": "7624ee738ae47e80f1a352223e28a26d011c9cd4898822cee52f47a010c04efd",
  "eng-kjv2006_usfm.zip": "b6faa67117ccaba49df9e7df224a553f11758ae7c5d58f0f7979e2b73ac4480b",
  "TAHOT Gen-Deu.txt": "7763ef367bb0e6e1c1a95fb9b652e1d611b2481827611433e82abbf229216d70",
  "TAHOT Jos-Est.txt": "b79add01a8c95673e31ec3ab8ad86183d2312cd96421ddf21f3d1f74377526a7",
  "TAHOT Job-Sng.txt": "e0416880bb78f46715bb17ce526b623c3051da0ef83f7bf83beaad350e6272e8",
  "TAHOT Isa-Mal.txt": "d5a609f5a4b9f7757a2615e55877b07f9f6931a8afccef012c0b4bf662caf540",
  "TAGNT Mat-Jhn.txt": "d4c0c820fdf9f2b450c9f96ce6103d6875028affd2e44094d753f1329ca1fd85",
  "TAGNT Act-Rev.txt": "122040eeeaeba50d6abbf67b39cacaff687211bda69b080e5d53927c830d9968",
};
for (const [name, digest] of Object.entries(SOURCES)) {
  const actual = sha(await fs.readFile(path.join(src, name)));
  if (actual !== digest) throw new Error(`${name} digest changed (${actual}). Review the new source before updating SOURCES.`);
}

const fail = msg => { throw new Error(msg); };
const baseNum = s => { const m = /^([HG])0*(\d+)/.exec(s); return m ? `${m[1]}${m[2]}` : null; };
const inRange = (book, c, v) => v >= 1 && v <= (CHAPTER_VERSES[book][c - 1] ?? 0);

// ---- Strong's dictionaries (OpenScriptures) --------------------------------
async function loadDict(file, name) {
  const code = await fs.readFile(path.join(src, file), "utf8");
  const ctx = { module: { exports: {} } };
  vm.runInNewContext(`${code}\n;module.exports = ${name};`, ctx);
  return ctx.module.exports;
}
const dict = { ...await loadDict("strongs-hebrew-dictionary.js", "strongsHebrewDictionary"), ...await loadDict("strongs-greek-dictionary.js", "strongsGreekDictionary") };

// ---- Chapter accumulators -------------------------------------------------
const chapters = new Map(); // "Book|c" -> { w: {}, k: {} }
const chapter = (book, c) => {
  const key = `${book}|${c}`;
  if (!chapters.has(key)) chapters.set(key, { w: {}, k: {} });
  return chapters.get(key);
};
const verses = new Map();   // num -> Set(verseCode)
const pos = new Map();      // num -> Map(pos -> count)
const renderings = new Map(); // num -> Map(word -> count)
const stepLex = new Map();  // num -> { lemma, gloss }
const casing = new Map();   // lower-case rendering -> Map(surface -> count)
const bump = (map, key, sub) => { if (!map.has(key)) map.set(key, new Map()); const m = map.get(key); m.set(sub, (m.get(sub) ?? 0) + 1); };
const addVerse = (num, book, c, v) => { if (!verses.has(num)) verses.set(num, new Set()); verses.get(num).add(verseCode(BOOKS.indexOf(book) + 1, c, v)); };
const report = { folded: [], titles: 0, skippedVariants: 0, otWords: 0, ntWords: 0 };

// ---- KJV with Strong's tags (eBible.org, public domain) --------------------
const usfmDir = path.join(src, "kjv");
const usfmFiles = (await fs.readdir(usfmDir)).filter(f => /^\d\d-[A-Z0-9]{3}eng-kjv2006\.usfm$/.test(f)).sort();
if (usfmFiles.length !== 66) fail(`Expected 66 USFM books, found ${usfmFiles.length}`);
const TAG = /\\\+?w ([^|\\]+)\|strong="([HG]\d+)"\\\+?w\*/g;
let kjvVerses = 0, kjvTags = 0;
for (const [i, file] of usfmFiles.entries()) {
  const book = BOOKS[i];
  const text = (await fs.readFile(path.join(usfmDir, file), "utf8")).replace(/\\f .*?\\f\*/gs, "").replace(/\\x .*?\\x\*/gs, "");
  let c = 0, v = 0;
  const seen = new Set();
  for (const piece of text.split(/(?=\\c |\\v |\\d\b|\\s\d? )/)) {
    let m;
    if ((m = /^\\c (\d+)/.exec(piece))) { c = Number(m[1]); v = 0; continue; }
    if (/^\\(d|s\d?)\b/.test(piece)) { v = 0; continue; } // headings / Psalm titles are not reader text
    if (!(m = /^\\v (\d+)/.exec(piece))) continue;
    v = Number(m[1]);
    if (!inRange(book, c, v) || seen.has(`${c}:${v}`)) fail(`KJV USFM coordinate invalid or duplicate: ${book} ${c}:${v}`);
    seen.add(`${c}:${v}`); kjvVerses++;
    const tags = [];
    for (const t of piece.matchAll(TAG)) {
      const num = baseNum(t[2]);
      const surface = t[1].trim();
      tags.push([surface, num]);
      addVerse(num, book, c, v);
      const key = surface.toLowerCase();
      bump(renderings, num, key);
      bump(casing, key, surface);
    }
    kjvTags += tags.length;
    if (tags.length) chapter(book, c).k[v] = tags;
  }
  const expected = CHAPTER_VERSES[book].reduce((a, b) => a + b, 0);
  if (seen.size !== expected) fail(`KJV USFM ${book}: ${seen.size} verses, expected ${expected}`);
}
if (kjvVerses !== 31102) fail(`KJV USFM verse total ${kjvVerses}, expected 31,102`);

// ---- Original-language words (STEPBible TAHOT/TAGNT, CC BY 4.0) ------------
const HEB_POS = { Nc: "Noun", Np: "Proper noun", Ng: "Gentilic noun", N: "Noun", V: "Verb", A: "Adjective", P: "Pronoun", R: "Preposition", C: "Conjunction", D: "Adverb", T: "Particle", S: "Suffix" };
const GRK_POS = { N: "Noun", V: "Verb", A: "Adjective", T: "Article", ADV: "Adverb", CONJ: "Conjunction", PREP: "Preposition", PRT: "Particle", INJ: "Interjection", P: "Personal pronoun", R: "Relative pronoun", D: "Demonstrative pronoun", I: "Interrogative pronoun", X: "Indefinite pronoun", Q: "Correlative pronoun", K: "Correlative pronoun", F: "Reflexive pronoun", S: "Possessive pronoun", C: "Reciprocal pronoun", HEB: "Hebrew word", ARAM: "Aramaic word", COND: "Conditional particle" };
// NRSV versification; [c.v] marks a different KJV coordinate (NT only).
const REF = /^(\w{3})\.(\d+)\.(\d+)((?:[([{][^)\]}]*[)\]}])*)#(\d+)=(\S+)$/;
const kjvCoord = (m) => {
  const k = /\[(\d+)\.(\d+)\]/.exec(m[4]);
  return k ? [Number(k[1]), Number(k[2])] : [Number(m[2]), Number(m[3])];
};
const stepBooks = [];
const clean = s => s.replace(/[/\\]/g, "").replace(/\s+/g, " ").trim();

function place(abbr, c, v) {
  let idx = stepBooks.indexOf(abbr);
  if (idx < 0) { stepBooks.push(abbr); idx = stepBooks.length - 1; }
  const book = BOOKS[idx] ?? fail(`Unexpected STEP book ${abbr}`);
  let flag = "";
  if (v === 0) { v = 1; flag = "t"; report.titles++; }
  const max = CHAPTER_VERSES[book][c - 1] ?? fail(`STEP chapter outside KJV: ${abbr}.${c}`);
  if (v > max) { report.folded.push(`${book} ${c}:${v}`); v = max; }
  return { book, v, flag };
}

for (const file of ["TAHOT Gen-Deu.txt", "TAHOT Jos-Est.txt", "TAHOT Job-Sng.txt", "TAHOT Isa-Mal.txt"]) {
  for (const line of (await fs.readFile(path.join(src, file), "utf8")).split("\n")) {
    const col = line.replace(/\r$/, "").split("\t");
    const m = REF.exec(col[0]);
    if (!m) continue;
    if (m[6].startsWith("X")) { report.skippedVariants++; continue; } // LXX-reconstructed additions
    if (!col[1]?.trim() || !col[4]?.trim()) { report.skippedVariants++; continue; } // empty Qere placeholder
    const [c, rawV] = kjvCoord(m);
    const { book, v, flag } = place(m[1], c, rawV);
    const parts = col[4].split("/");
    let main = parts.findIndex(p => p.includes("{"));
    if (main < 0) main = parts.findIndex(p => !/^H9\d{3}/.test(p));
    if (main < 0) main = 0;
    const num = baseNum(parts[main].replace(/[{}\\]/g, "")) ?? fail(`No Strong's number: ${col[0]}`);
    const gram = col[5].split("/");
    const g = (gram[main] ?? "").replace(main === 0 ? /^[HA]/ : /^$/, "");
    const p = HEB_POS[g.slice(0, 2)] ?? HEB_POS[g[0]];
    if (p) bump(pos, num, p);
    // Expanded tags look like "H9003=ב=in/{H7225G=רֵאשִׁית=: beginning»first:1_beginning}".
    for (const lex of (col[11] ?? "").matchAll(/H(\d+)[A-Z]?(?:#\d+)?=([^=/{}]+)=([^}/]*)/g)) {
      const key = `H${Number(lex[1])}`;
      if (!stepLex.has(key)) stepLex.set(key, { lemma: lex[2], gloss: lex[3].split("»")[0].replace(/^:\s*/, "").replace(/_/g, " ").trim() });
    }
    const translit = clean(col[2]).replace(/\./g, "").toLowerCase();
    // Keep vowel points; drop cantillation accents, meteg, paseq and sof pasuq for a readable word list.
    const hebrew = clean(col[1]).replace(/[\u0591-\u05AF\u05BD\u05C0\u05C3]/g, "").trim();
    const row = [hebrew, translit, num, clean(col[3])];
    if (flag) row.push(flag);
    const ch = chapter(book, c);
    (ch.w[v] ??= []).push(row);
    addVerse(num, book, c, v);
    report.otWords++;
  }
}
for (const file of ["TAGNT Mat-Jhn.txt", "TAGNT Act-Rev.txt"]) {
  for (const line of (await fs.readFile(path.join(src, file), "utf8")).split("\n")) {
    const col = line.replace(/\r$/, "").split("\t");
    const m = REF.exec(col[0]);
    if (!m) continue;
    const eds = col[5] ?? "";
    const inNA = eds.includes("NA28"), inTR = /\bTR\b/.test(eds);
    if (!inNA && !inTR) { report.skippedVariants++; continue; }
    const [c, rawV] = kjvCoord(m);
    const { book, v } = place(m[1], c, rawV);
    const [gnum, morph = ""] = col[3].split("=");
    const num = baseNum(gnum) ?? fail(`No Strong's number: ${col[0]}`);
    const p = GRK_POS[morph.split("-")[0]];
    if (p) bump(pos, num, p);
    const [lemma, gloss] = (col[4] ?? "").split("=");
    if (lemma && !stepLex.has(num)) stepLex.set(num, { lemma, gloss: gloss ?? "" });
    const wm = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(col[1]);
    const word = (wm ? wm[1] : col[1]).replace(/[,.;·:¶]+$/u, "").trim();
    const row = [word, wm?.[2] ?? "", num, clean(col[2])];
    if (!inTR) row.push("n"); else if (!inNA) row.push("r");
    (chapter(book, c).w[v] ??= []).push(row);
    addVerse(num, book, c, v);
    report.ntWords++;
  }
}
if (stepBooks.length !== 66) fail(`Expected 66 STEP books, found ${stepBooks.length}`);

// ---- Validate against the reader's existing KJV text ------------------------
const searchDir = new URL("public/knowing-god/bible-search/", root);
const searchManifest = JSON.parse(await fs.readFile(new URL("manifest.json", searchDir), "utf8"));
let aligned = 0, total = 0, missingWords = [];
for (const { book, file } of searchManifest.translations.kjv.files) {
  for (const [c, v, text] of JSON.parse(await fs.readFile(new URL(file, searchDir), "utf8"))) {
    const ch = chapters.get(`${book}|${c}`);
    const tags = ch?.k[v] ?? [];
    total += tags.length;
    aligned += alignKjv(text, tags).length;
    if (!ch?.w[v]?.length) missingWords.push(`${book} ${c}:${v}`);
  }
}
const ratio = aligned / total;
console.log({ kjvVerses, kjvTags, aligned, ratio: ratio.toFixed(4), ...report, folded: report.folded.length, missingWords });
if (ratio < 0.99) fail(`Only ${(ratio * 100).toFixed(2)}% of KJV Strong's tags align with the reader's KJV text`);

// ---- Write output -----------------------------------------------------------
await fs.rm(out, { recursive: true, force: true });
await fs.mkdir(new URL("chapters/", out), { recursive: true });
await fs.mkdir(new URL("lexicon/", out), { recursive: true });
const short = text => sha(text).slice(0, 10);
const manifest = { schemaVersion: 1, shardSize: SHARD_SIZE, chapters: {}, lexicon: {}, stats: {} };
let bytes = 0, gzipBytes = 0;
const write = async (rel, payload) => { await fs.writeFile(new URL(rel, out), payload); bytes += Buffer.byteLength(payload); gzipBytes += gzipSync(payload).length; };

for (const book of BOOKS) {
  for (let c = 1; c <= CHAPTER_VERSES[book].length; c++) {
    const data = chapters.get(`${book}|${c}`) ?? fail(`No word-study data for ${book} ${c}`);
    const payload = JSON.stringify(data);
    const h = short(payload);
    await write(`chapters/${bookSlug(book)}-${c}.${h}.json`, payload);
    manifest.chapters[`${book} ${c}`] = h;
  }
}

const used = new Set([...verses.keys()]);
const shards = new Map();
let stubs = 0;
for (const num of [...used].sort()) {
  const d = dict[num];
  const step = stepLex.get(num);
  const top = (map, n) => [...(map.get(num) ?? new Map())].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
  const codes = [...verses.get(num)].sort((a, b) => a - b);
  const entry = {
    // STEP's grammatical numbers (H9001+) can carry a morphology code instead of a word.
    l: d?.lemma ?? (/[\u0590-\u05FF\u0370-\u03FF\u1F00-\u1FFF]/.test(step?.lemma ?? "") ? step.lemma : ""),
    x: d?.xlit ?? d?.translit ?? "",
    ...(d?.pron ? { p: d.pron } : {}),
    ...(d?.derivation ? { d: d.derivation.trim() } : {}),
    s: (d?.strongs_def ?? "").trim(),
    k: (d?.kjv_def ?? "").trim(),
    ...(step?.gloss ? { g: step.gloss.trim() } : {}),
    ...(top(pos, 1)[0] ? { t: top(pos, 1)[0][0] } : {}),
    // Most common spelling of each rendering ("God", "LORD", "love").
    r: top(renderings, 12).map(([w, n]) => [[...casing.get(w)].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0], n]),
    v: codes.map((code, i) => code - (codes[i - 1] ?? 0)),
  };
  if (!d) { stubs++; entry.n = 1; }
  const shard = shardOf(num);
  if (!shards.has(shard)) shards.set(shard, {});
  shards.get(shard)[num] = entry;
}
for (const [shard, data] of [...shards].sort()) {
  const payload = JSON.stringify(data);
  const h = short(payload);
  await write(`lexicon/${shard}.${h}.json`, payload);
  manifest.lexicon[shard] = h;
}
manifest.stats = { chapters: Object.keys(manifest.chapters).length, entries: used.size, stubs, kjvTags, alignedTags: aligned, otWords: report.otWords, ntWords: report.ntWords, bytes, gzipBytes, foldedVerses: report.folded };
manifest.sources = Object.entries(SOURCES).map(([file, sha256]) => ({ file, sha256 }));
await fs.writeFile(new URL("manifest.json", out), JSON.stringify(manifest));
console.log(manifest.stats, { files: Object.keys(manifest.chapters).length + shards.size });
