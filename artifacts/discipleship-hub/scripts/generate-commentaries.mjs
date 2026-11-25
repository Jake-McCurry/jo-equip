// Explicit maintenance command, never a network-dependent part of normal builds.
// Usage:
//   bash scripts/fetch-commentary-sources.sh /tmp/commentary-sources
//   node scripts/generate-commentaries.mjs /tmp/commentary-sources
// Writes content-hashed commentary and cross-reference data to
// public/bible-data/commentary/. See scripts/data/bible-search-sources.md.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { CHAPTER_VERSES } from "../worker/bible-catalog.js";
import { readZCom } from "./lib/sword-zcom.mjs";
import { BOOKS, code, parseOsis, parseRefList, sameBookEnd, validRange } from "./lib/scripture-refs.mjs";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/generate-commentaries.mjs <sources directory>");
const root = new URL("../", import.meta.url);
const out = new URL("public/bible-data/commentary/", root);
const sha = text => createHash("sha256").update(text).digest("hex");
const fail = msg => { throw new Error(msg); };
const bookSlug = book => book.toLowerCase().replace(/\s+/g, "-");

// Pinned digests. If a source is re-downloaded and differs, review the change
// and then update the digest and the sources notes.
const SOURCES = {
  "MHC.zip": "6bcb936873ca144e317805e5c1677940fd86e2403f7c14517752e44f25c8882b",
  "JFB.zip": "f1e31fdf3281d7e69956341c8a3aa28f65dca77deb6853038f27c3a8e1085d9e",
  "Barnes.zip": "9e8edc0333875c214124371b3862df118ad3a76ade7753cb2faeed3484615baf",
  "TSK.zip": "6784c7099465995a8e66f02ead82b0bca66603c1bdeaf8332949774b7bfd4293",
  "cross_references.txt": "d548f9ca1c66008f88bc3f175d1a403cd1c9b528fe8fe8460d0ef4592ba5e471",
};
for (const [name, digest] of Object.entries(SOURCES)) {
  const actual = sha(await fs.readFile(path.join(src, name)));
  if (actual !== digest) throw new Error(`${name} digest changed (${actual}). Review the new source before updating SOURCES.`);
}

// Source references that do not exist in KJV versification are left as plain
// text (never linked). More than this many per source means the parser or the
// source has changed and needs review.
const MAX_INVALID = { mhc: 400, jfb: 150, barnes: 50, tsk: 100, openbible: 25 };
const invalid = Object.fromEntries(Object.keys(MAX_INVALID).map(k => [k, []]));

// ---- Markup -> paragraphs ----------------------------------------------------
const decodeEntities = s => s.replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (_, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
    : { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " " }[e.toLowerCase()]);
const attr = (tag, name) => new RegExp(`\\b${name}="([^"]*)"`).exec(tag)?.[1];

/**
 * Converts one SWORD entry (OSIS or ThML) into { book, intro, body } paragraph
 * lists: book introduction, chapter introduction (<div type="introduction">),
 * and the comment itself.
 */
function convert(raw, ctx, source, { dropScripture = false } = {}) {
  const res = { book: [], intro: [], body: [] };
  let sawIntro = false, paras = res.body, para = null, flags = [], ref = null, refText = "", inNote = 0, noteSegs = null, skipTitle = 0;
  const notes = [];
  const flush = () => {
    if (para) {
      const segs = mergeSegs(para.segs);
      const text = segs.map(s => (typeof s === "string" ? s : s[0])).join("").trim();
      const scripture = dropScripture && para.super;
      const chapterHeading = para.kind === "h" && /^(CHAPTER|PSALM) [\dIVXLC]+\.?$/i.test(text);
      if (text && !scripture && !chapterHeading) paras.push([para.kind, ...trimSegs(segs)]);
    }
    para = null;
  };
  const open = (kind = "p") => { flush(); para = { kind, segs: [], super: false }; };
  const curFlags = () => flags.reduce((a, f) => a | f, 0);
  const push = text => {
    if (!text) return;
    if (inNote) { noteSegs.push(text); return; }
    if (ref) { refText += text; return; }
    if (!para) open();
    const f = curFlags();
    para.segs.push(f ? [text, f] : text);
  };
  const pushRefs = (text, parsed) => {
    if (!para) open();
    const f = curFlags();
    let at = 0;
    for (const r of parsed) {
      if (!validRange(r.from, r.to)) { invalid[source].push(text.slice(r.start, r.end)); continue; }
      if (r.start > at) para.segs.push(f ? [text.slice(at, r.start), f] : text.slice(at, r.start));
      para.segs.push(r.to ? [text.slice(r.start, r.end), f, r.from, r.to] : [text.slice(r.start, r.end), f, r.from]);
      at = r.end;
    }
    if (at < text.length) para.segs.push(f ? [text.slice(at), f] : text.slice(at));
  };
  const closeRef = () => {
    const text = decodeEntities(refText);
    const r = ref; ref = null; refText = "";
    if (inNote) { noteSegs.push(text); return; }
    if (r.osis) {
      const p = parseOsis(r.osis);
      if (p) p.to = sameBookEnd(p.from, p.to);
      pushRefs(text, p ? [{ start: 0, end: text.length, ...p }] : []);
      if (!p) invalid[source].push(r.osis);
    } else if (r.passage && r.passage.trim() !== text.trim()) {
      const p = parseRefList(r.passage, ctx)[0];
      pushRefs(text, p ? [{ ...p, start: 0, end: text.length }] : []);
    } else {
      pushRefs(text, parseRefList(text, ctx));
    }
  };

  for (const tok of raw.replace(/\r/g, "").split(/(<[^>]+>)/)) {
    if (!tok) continue;
    if (tok[0] !== "<") {
      if (skipTitle) continue;
      if (para && tok.trim()) para.lastBr = false;
      push(decodeEntities(tok.replace(/\s+/g, " ")));
      continue;
    }
    const name = /^<\/?([a-zA-Z]+)/.exec(tok)?.[1]?.toLowerCase() ?? "";
    const closing = tok[1] === "/";
    const type = attr(tok, "type");
    const sID = attr(tok, "sID"), eID = attr(tok, "eID");
    if (name === "div") {
      if (type === "introduction") {
        flush();
        if (sID) { sawIntro = true; paras = res.intro; continue; }
        // The introduction started in the previous entry: what came before belongs to it.
        if (!sawIntro && paras === res.body) { res.intro.push(...res.body); res.body.length = 0; }
        // JFB book introductions run on past the div until the first chapter heading.
        if (paras !== res.book) paras = res.body;
      }
      else if (type === "x-p") { if (sID) open(para?.kind === "q" ? "q" : "p"); else flush(); }
      continue;
    }
    if (name === "title") {
      if (closing) { if (skipTitle) skipTitle--; else flush(); continue; }
      // Book titles and "CHAPTER 3" headings repeat what the reader already shows.
      // A book title (Matthew Henry) or "INTRODUCTION" (JFB) starts the book introduction.
      if (type === "x-ms" || type === "x-IS") { flush(); paras = res.book; skipTitle++; continue; }
      if (paras === res.book) { flush(); paras = res.body; }
      if (type === "main" || type === "x-s2") { skipTitle++; continue; }
      open("h");
      continue;
    }
    if (name === "note") {
      if (closing) { inNote--; if (!inNote) { const t = noteSegs.join("").replace(/\s+/g, " ").trim(); if (t) notes.push(["n", t]); } }
      else { inNote++; noteSegs = []; }
      continue;
    }
    if (name === "lg") { if (sID || (!closing && !eID)) open("q"); else flush(); continue; }
    if (name === "l") { if (eID || closing) push("\n"); continue; }
    if (name === "blockquote") { if (closing) flush(); else open("q"); continue; }
    if (name === "br") {
      // ThML: a blank line (two <br>) starts a new paragraph.
      if (para && para.lastBr) { const kind = para.kind; flush(); open(kind === "q" ? "q" : "p"); }
      else if (para) { para.lastBr = true; push("\n"); }
      continue;
    }
    if (para) para.lastBr = false;
    if (name === "reference" || name === "scripref") {
      if (closing) { if (ref) closeRef(); }
      else ref = { osis: attr(tok, "osisRef"), passage: attr(tok, "passage") };
      continue;
    }
    if (name === "hi" || name === "i" || name === "b" || name === "em" || name === "strong") {
      if (closing) { flags.pop(); continue; }
      if (type === "super") { if (para) para.super = true; flags.push(0); continue; }
      flags.push(type === "bold" || name === "b" || name === "strong" ? 2 : type === "small-caps" ? 4 : type === "italic" || name === "i" || name === "em" ? 1 : 0);
      continue;
    }
    // chapter, milestone, verse, x-milestone divs, font, etc.: no content.
  }
  flush();
  res.body.push(...notes);
  for (const list of [res.book, res.intro, res.body]) for (const p of list) if (p[0] === "p" || p[0] === "q") cleanLines(p);
  return res;
}
function mergeSegs(segs) {
  const out = [];
  for (const s of segs) {
    const prev = out[out.length - 1];
    if (typeof s === "string" && typeof prev === "string") out[out.length - 1] = prev + s;
    else if (Array.isArray(s) && s.length === 2 && Array.isArray(prev) && prev.length === 2 && prev[1] === s[1]) prev[0] += s[0];
    else out.push(Array.isArray(s) ? [...s] : s);
  }
  return out;
}
function trimSegs(segs) {
  const text = s => (typeof s === "string" ? s : s[0]);
  const set = (i, t) => { if (typeof segs[i] === "string") segs[i] = t; else segs[i][0] = t; };
  const squash = t => t.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n");
  segs.forEach((s, i) => set(i, squash(text(s))));
  if (segs.length) { set(0, text(segs[0]).replace(/^\s+/, "")); set(segs.length - 1, text(segs[segs.length - 1]).replace(/\s+$/, "")); }
  return segs.filter(s => text(s) !== "");
}
function cleanLines(p) {
  // Collapse runs of newlines left by <br> and poetry markup.
  for (let i = 1; i < p.length; i++) {
    const s = p[i];
    const t = (typeof s === "string" ? s : s[0]).replace(/\n{2,}/g, "\n");
    if (typeof s === "string") p[i] = t; else s[0] = t;
  }
}

// ---- Commentaries ------------------------------------------------------------
const MODULES = { mhc: "MHC", jfb: "JFB", barnes: "Barnes" };
const NT_ONLY = new Set(["barnes"]);
const commentaries = {};
const report = {};
for (const [id, dir] of Object.entries(MODULES)) {
  const books = {};
  let entries = 0, words = 0;
  for (const e of readZCom(path.join(src, dir))) {
    const b = BOOKS.indexOf(e.book) + 1;
    const ctx = { b, c: Math.max(e.chapter, 1) };
    const { book: bookIntro, intro, body } = convert(e.text, ctx, id, { dropScripture: id === "mhc" });
    const book = (books[e.book] ??= { intro: [], chapters: new Map() });
    const chapter = c => { if (!book.chapters.has(c)) book.chapters.set(c, { i: [], e: [] }); return book.chapters.get(c); };
    book.intro.push(...bookIntro);
    if (e.chapter === 0) { book.intro.push(...intro, ...body); continue; }
    const ch = chapter(e.chapter);
    ch.i.push(...intro);
    if (!body.length) continue;
    if (e.verse === 0) { ch.i.push(...body); continue; }
    const max = CHAPTER_VERSES[e.book][e.chapter - 1];
    const to = Math.min(e.to ?? e.verse, max);
    if (e.verse > max) fail(`${id}: ${e.book} ${e.chapter}:${e.verse} is outside KJV versification`);
    ch.e.push([code(b, e.chapter, e.verse), code(b, e.chapter, to), body]);
    entries++; words += JSON.stringify(body).length;
  }
  // Multi-verse sections (Matthew Henry) run until the next comment starts.
  for (const book of Object.values(books)) {
    for (const ch of book.chapters.values()) {
      ch.e.sort((a, b) => a[0] - b[0]);
      ch.e.forEach((entry, i) => {
        const next = ch.e[i + 1];
        if (id === "mhc" && entry[1] === entry[0] && next) entry[1] = Math.max(entry[0], next[0] - 1);
        if (id === "mhc" && !next) entry[1] = entry[0] - (entry[0] % 1000) + CHAPTER_VERSES[BOOKS[Math.floor(entry[0] / 1e6) - 1]][Math.floor(entry[0] / 1000) % 1000 - 1];
      });
    }
  }
  // Coverage: every chapter of every covered book must have content.
  const covered = NT_ONLY.has(id) ? BOOKS.slice(39) : BOOKS;
  for (const name of covered) {
    const book = books[name] ?? fail(`${id}: no commentary for ${name}`);
    for (let c = 1; c <= CHAPTER_VERSES[name].length; c++) {
      const ch = book.chapters.get(c);
      if (!ch || (!ch.e.length && !ch.i.length)) fail(`${id}: no commentary for ${name} ${c}`);
    }
  }
  if (NT_ONLY.has(id) && BOOKS.slice(0, 39).some(b => books[b])) fail(`${id}: unexpected Old Testament content`);
  commentaries[id] = books;
  report[id] = { entries, mb: +(words / 1e6).toFixed(1), invalidRefs: invalid[id].length };
}

// ---- Cross references: TSK + OpenBible.info -----------------------------------
const xrefs = new Map(); // verse code -> { words: [], rows: Map(from -> row) }
const xref = v => { if (!xrefs.has(v)) xrefs.set(v, { words: [], rows: new Map() }); return xrefs.get(v); };
let tskRefs = 0, obRefs = 0, obSkipped = 0;
for (const e of readZCom(path.join(src, "TSK"))) {
  if (e.chapter === 0 || e.verse === 0) continue;
  const b = BOOKS.indexOf(e.book) + 1;
  const here = code(b, e.chapter, e.verse);
  const x = xref(here);
  let word = -1;
  for (const line of e.text.replace(/\r/g, "").split(/<br\s*\/?>|\n/)) {
    if (/<scripRef[^>]*passage=/.test(line)) continue; // chapter outline at verse 1
    const refs = [...line.matchAll(/<scripRef>([^<]*)<\/scripRef>/g)];
    const plain = decodeEntities(line.replace(/<[^>]+>/g, "")).trim();
    if (!refs.length) {
      if (plain) { x.words.push(plain.replace(/\.$/, "")); word = x.words.length - 1; }
      continue;
    }
    for (const m of refs) {
      for (const r of parseRefList(decodeEntities(m[1]), { b, c: e.chapter })) {
        if (!validRange(r.from, r.to)) { invalid.tsk.push(`${e.book} ${e.chapter}:${e.verse} → ${m[1].slice(r.start, r.end)}`); continue; }
        if (r.from === here) continue;
        if (!x.rows.has(r.from)) { x.rows.set(r.from, [r.from, r.to ?? 0, -1, word, x.rows.size]); tskRefs++; }
      }
    }
  }
}
for (const line of (await fs.readFile(path.join(src, "cross_references.txt"), "utf8")).split("\n")) {
  const [a, z, votes] = line.replace(/\r$/, "").split("\t");
  if (!a || a.startsWith("From") || a.startsWith("#")) continue;
  const from = parseOsis(a), to = parseOsis(z ?? "");
  if (to) to.to = sameBookEnd(to.from, to.to);
  if (!from || !to || !validRange(from.from) || !validRange(to.from, to.to)) { invalid.openbible.push(line); continue; }
  const n = Number(votes);
  if (!Number.isFinite(n) || n < 0) { obSkipped++; continue; } // community voted it down
  if (to.from === from.from) continue;
  const x = xref(from.from);
  const row = x.rows.get(to.from);
  if (row) { row[2] = Math.max(row[2], n); if (to.to && to.to > row[1]) row[1] = to.to; }
  else { x.rows.set(to.from, [to.from, to.to ?? 0, n, -1, Infinity]); }
  obRefs++;
}

for (const [k, list] of Object.entries(invalid)) {
  report[k] = { ...(report[k] ?? {}), invalidRefs: list.length };
  if (list.length > MAX_INVALID[k]) fail(`${k}: ${list.length} references outside KJV versification (max ${MAX_INVALID[k]}), e.g. ${list.slice(0, 5).join(" | ")}`);
}

// Ranking: references in both sources first, then by community votes, then TSK order.
const score = r => (r[2] >= 0 ? r[2] : 0) + (r[4] !== Infinity ? 25 : 0) + (r[2] >= 0 && r[4] !== Infinity ? 50 : 0);

// ---- Write output ---------------------------------------------------------------
await fs.rm(out, { recursive: true, force: true });
const short = text => sha(text).slice(0, 10);
const manifest = { schemaVersion: 1, commentaries: {}, xrefs: {}, stats: {}, sources: [] };
let bytes = 0, gzipBytes = 0, files = 0;
const write = async (rel, payload) => {
  const file = new URL(rel, out);
  await fs.mkdir(new URL("./", file), { recursive: true });
  await fs.writeFile(file, payload); files++;
  bytes += Buffer.byteLength(payload); gzipBytes += gzipSync(payload).length;
};
for (const [id, books] of Object.entries(commentaries)) {
  const m = (manifest.commentaries[id] = { books: {} });
  for (const name of BOOKS) {
    const book = books[name];
    if (!book) continue;
    const entry = (m.books[name] = { chapters: [] });
    if (book.intro.length) {
      const payload = JSON.stringify(book.intro);
      entry.intro = short(payload);
      await write(`${id}/${bookSlug(name)}-intro.${entry.intro}.json`, payload);
    }
    for (let c = 1; c <= CHAPTER_VERSES[name].length; c++) {
      const ch = book.chapters.get(c);
      const payload = JSON.stringify({ ...(ch.i.length ? { i: ch.i } : {}), e: ch.e });
      const h = short(payload);
      await write(`${id}/${bookSlug(name)}-${c}.${h}.json`, payload);
      entry.chapters.push(h);
    }
  }
}
let xrefRows = 0;
for (const [bi, name] of BOOKS.entries()) {
  for (let c = 1; c <= CHAPTER_VERSES[name].length; c++) {
    const data = {};
    for (let v = 1; v <= CHAPTER_VERSES[name][c - 1]; v++) {
      const x = xrefs.get(code(bi + 1, c, v));
      if (!x || !x.rows.size) continue;
      const rows = [];
      for (const r of [...x.rows.values()].sort((a, b) => score(b) - score(a) || a[4] - b[4] || a[0] - b[0])) {
        // Drop a verse already covered by a higher-ranked range ("Ps 89:11-12" then "Ps 89:12").
        if (rows.some(o => o[1] && r[0] >= o[0] && (r[1] || r[0]) <= o[1])) continue;
        rows.push([r[0], r[1], r[2], r[3]]);
      }
      const used = [...new Set(rows.map(r => r[3]).filter(w => w >= 0))];
      const words = used.map(w => x.words[w]);
      for (const r of rows) r[3] = r[3] >= 0 ? used.indexOf(r[3]) : -1;
      data[v] = words.length ? { w: words, r: rows } : { r: rows };
      xrefRows += rows.length;
    }
    if (!Object.keys(data).length) fail(`No cross references for ${name} ${c}`);
    const payload = JSON.stringify(data);
    const h = short(payload);
    await write(`xrefs/${bookSlug(name)}-${c}.${h}.json`, payload);
    manifest.xrefs[`${name} ${c}`] = h;
  }
}
manifest.stats = { ...report, tskRefs, openBibleRefs: obRefs, openBibleDownvoted: obSkipped, xrefRows, files, bytes, gzipBytes };
manifest.sources = Object.entries(SOURCES).map(([file, sha256]) => ({ file, sha256 }));
await fs.writeFile(new URL("manifest.json", out), JSON.stringify(manifest));
console.log(JSON.stringify(manifest.stats, null, 1));
for (const [k, list] of Object.entries(invalid)) if (list.length) console.log(k, "invalid sample:", list.slice(0, 8));
