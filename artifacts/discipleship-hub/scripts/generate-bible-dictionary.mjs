// Explicit maintenance command, never a network-dependent part of normal builds.
// Usage:
//   bash scripts/fetch-dictionary-sources.sh /tmp/dictionary-sources
//   node scripts/generate-bible-dictionary.mjs /tmp/dictionary-sources
//   node scripts/verify-easton-scan.mjs /tmp/dictionary-sources
// Writes Easton's Bible Dictionary page data to src/data/bible-dictionary/ and
// the content-hashed reader index, entry text and full-text search file to
// public/bible-data/dictionary/. (The search file alone can be rebuilt offline
// with node scripts/build-dictionary-search.mjs.)
// See scripts/data/bible-search-sources.md.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { readZLD } from "./lib/sword-zld.mjs";
import { dictionarySearchFile } from "./lib/dictionary-search.mjs";
import { BOOKS, bookIndexOfAbbr, code, decode, parseOsis, validRange } from "./lib/scripture-refs.mjs";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/generate-bible-dictionary.mjs <sources directory>");
const root = new URL("../", import.meta.url);
const at = p => new URL(p, root);
const sha = buf => createHash("sha256").update(buf).digest("hex");
const fail = msg => { throw new Error(msg); };

// Pinned digest. If the module is re-downloaded and differs, review the change
// and then update the digest and the sources notes.
const SOURCE = { file: "Easton.zip", url: "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/Easton.zip", sha256: "f6dd054554764e2e97d5d189a697eb26039054578a9ccf98ce668ab810341c6e" };
const actual = sha(fs.readFileSync(path.join(src, SOURCE.file)));
if (actual !== SOURCE.sha256) fail(`${SOURCE.file} digest changed (${actual}). Review the new source before updating SOURCE.`);
const raw = readZLD(path.join(src, "Easton"));
if (raw.length !== 3963) fail(`Expected 3963 Easton entries, found ${raw.length}`);

// ---------- TEI entry -> paragraphs ----------
// Segment: "text" | [text, flags] | [text, flags, from, to?] (scripture link) | [text, flags, "slug"] (entry link).
const decodeEntities = s => s.replace(/&(#\d+|#x[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (_, e) =>
  e[0] === "#" ? String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : Number(e.slice(1)))
    : { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" }[e.toLowerCase()]);
const stats = { refs: 0, refsFromText: 0, refsDropped: 0, refsCorrected: 0, entryLinks: 0 };
const dropped = [], corrections = [];
const BARE = /^(\d+)(?::(\d+))?(?:\s*[-–]\s*(\d+)(?::(\d+))?)?$/;

/**
 * Resolves one <ref>. References that name a book keep the module's osisRef
 * (its book must agree with the abbreviation when we know it). Bare numbers
 * ("Rev. 1:8, 11; 21:6") continue the previous reference: the module often
 * links them to Genesis, so they are re-read from the printed text.
 */
function resolveRef(osis, text, ctx) {
  const t = text.trim().replace(/\.$/, "");
  const p = parseOsis(osis.replace(/^Bible:/, ""));
  const bm = /^((?:[1-3]\s?)?[A-Za-z]+)\.?\s+\d/.exec(t);
  if (bm) {
    if (!p) return null;
    const b = bookIndexOfAbbr(bm[1]);
    if (b && Math.floor(p.from / 1e6) !== b) return null; // e.g. "Lev. 42:6" linked to Numbers
    return p;
  }
  const m = BARE.exec(t);
  if (!m || !ctx) return null;
  const n = m.slice(1).map(x => (x === undefined ? undefined : Number(x)));
  let from, to;
  if (n[1] !== undefined) { // c:v[-v | -c:v]
    from = code(ctx.b, n[0], n[1]);
    if (n[3] !== undefined) to = code(ctx.b, n[2], n[3]); else if (n[2] !== undefined) to = code(ctx.b, n[0], n[2]);
  } else if (ctx.v === 0) { // after a chapter reference, a bare number is a chapter
    from = code(ctx.b, n[0], 0);
  } else { // verse (or verse range) in the current chapter
    from = code(ctx.b, ctx.c, n[0]);
    if (n[2] !== undefined) to = code(ctx.b, ctx.c, n[2]);
  }
  const r = { from, ...(to && to !== from ? { to } : {}) };
  // Same book as the context: the module read the list itself (often "12:38; 22; 23-26",
  // where the bare numbers are whole chapters), so its link is kept.
  if (p && Math.floor(p.from / 1e6) === ctx.b) return p;
  if (p && Math.floor(p.from / 1e6) !== 1 && (p.from !== r.from || (p.to ?? 0) !== (r.to ?? 0))) { stats.refsCorrected++; corrections.push(`${ctx.where}: ${t} module ${osis} -> ${r.from}${r.to ? "-" + r.to : ""}`); }
  stats.refsFromText++;
  return r;
}

function convert(xml, where) {
  const paras = [];
  for (const pm of xml.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const segs = [];
    let ctx = null;
    let flags = 0;
    for (const tok of pm[1].split(/(<ref [^>]*>[^<]*<\/ref>|<\/?foreign[^>]*>)/)) {
      if (!tok) continue;
      const see = /^<ref target="Easton:([^"]*)">([^<]*)<\/ref>$/.exec(tok);
      if (see) { segs.push([decodeEntities(see[2]), flags, `@${decodeEntities(see[1])}`]); continue; }
      const ref = /^<ref osisRef="([^"]*)">([^<]*)<\/ref>$/.exec(tok);
      if (ref) {
        const text = decodeEntities(ref[2]);
        const r = resolveRef(ref[1], text, ctx);
        stats.refs++;
        if (r && validRange(r.from, r.to)) {
          segs.push(r.to ? [text, flags, r.from, r.to] : [text, flags, r.from]);
          const d = decode(r.to ?? r.from);
          ctx = { b: d.b, c: d.c, v: decode(r.from).v, where };
        } else { segs.push(flags ? [text, flags] : text); stats.refsDropped++; dropped.push(`${where}: ${text} (${ref[1]})`); }
        continue;
      }
      if (/^<foreign/.test(tok)) { flags = 1; continue; }
      if (tok === "</foreign>") { flags = 0; continue; }
      if (/[<>]/.test(tok)) fail(`${where}: unexpected markup ${tok.slice(0, 60)}`);
      const text = decodeEntities(tok).replace(/\s+/g, " ").replace(/_/g, "");
      segs.push(flags ? [text, flags] : text);
    }
    const merged = [];
    for (const s of segs) {
      const prev = merged[merged.length - 1];
      if (typeof s === "string" && typeof prev === "string") merged[merged.length - 1] = prev + s;
      else if (Array.isArray(s) && s.length === 2 && Array.isArray(prev) && prev.length === 2 && prev[1] === s[1]) prev[0] += s[0];
      else merged.push(s);
    }
    const txt = s => (typeof s === "string" ? s : s[0]);
    if (merged.length) {
      const first = merged[0], last = merged[merged.length - 1];
      if (typeof first === "string") merged[0] = first.replace(/^\s+/, ""); else first[0] = first[0].replace(/^\s+/, "");
      if (typeof last === "string") merged[merged.length - 1] = last.replace(/\s+$/, ""); else last[0] = last[0].replace(/\s+$/, "");
    }
    const kept = merged.filter(s => txt(s) !== "");
    if (kept.length) paras.push(["p", ...kept]);
  }
  return paras;
}

// ---------- Entries ----------
const slugify = t => t.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/Æ/g, "AE").replace(/æ/g, "ae")
  .toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const byTitle = new Map();
for (const [key, xml] of raw) {
  const title = decodeEntities(/<title>([^<]*)<\/title>/.exec(xml)?.[1] ?? fail(`${key}: no title`)).trim()
    .replace(/^AEnon$/, "Ænon");
  const paras = convert(xml, title);
  if (!paras.length) fail(`${title}: empty entry`);
  const slug = slugify(title) || fail(`${title}: empty slug`);
  const e = byTitle.get(slug);
  if (e) e.parts.push(paras); // two articles with the same headword (Kadesh, Salmon) share one page
  else byTitle.set(slug, { slug, title, parts: [paras] });
}
const entries = [...byTitle.values()].map(e => ({
  slug: e.slug, title: e.title,
  paras: e.parts.length === 1 ? e.parts[0] : e.parts.flatMap((p, i) => [["h", `${i + 1}.`], ...p]),
}));
entries.sort((a, b) => a.slug.localeCompare(b.slug));
const entryBySlug = new Map(entries.map(e => [e.slug, e]));
// "(See MOSES.)" cross-references: the printing sets the headword in small capitals;
// shown with the entry's own capitalization and linked when the entry exists.
const slugOfKey = new Map(raw.map(([key, xml]) => [key, slugify(decodeEntities(/<title>([^<]*)<\/title>/.exec(xml)[1]).replace(/^AEnon$/, "Ænon"))]));
const titleCase = t => t.toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
let seeLinks = 0, seeUnlinked = 0;
for (const e of entries) for (const p of e.paras) for (let i = 1; i < p.length; i++) {
  const s = p[i];
  if (!Array.isArray(s) || typeof s[2] !== "string" || s[2][0] !== "@") continue;
  const key = s[2].slice(1);
  const target = slugOfKey.get(key) ?? (entryBySlug.has(slugify(key)) ? slugify(key) : null);
  const shown = s[0] === s[0].toUpperCase() && /[A-Z]/.test(s[0]) ? (target && s[0] === key ? entryBySlug.get(target).title : titleCase(s[0])) : s[0];
  if (target && target !== e.slug) { p[i] = [shown, s[1], target]; seeLinks++; }
  else { p[i] = s[1] ? [shown, s[1]] : shown; seeUnlinked++; }
}
// Re-merge plain strings split by unlinked cross-references.
for (const e of entries) e.paras = e.paras.map(p => {
  const out = [p[0]];
  for (const s of p.slice(1)) {
    if (typeof s === "string" && typeof out[out.length - 1] === "string" && out.length > 1) out[out.length - 1] += s; else out.push(s);
  }
  return out;
});

// "Zalmon (q.v.)" -> link to that entry when the dictionary has it.
const titleKey = t => slugify(t);
for (const e of entries) {
  for (const p of e.paras) {
    for (let i = 1; i < p.length; i++) {
      const s = p[i];
      if (typeof s !== "string" || !s.includes("(q.v.)")) continue;
      const parts = [];
      let last = 0;
      for (const m of s.matchAll(/([A-Z][A-Za-z’'-]*(?:,? [A-Z][A-Za-z’'-]*)?)\s\(q\.v\.\)/g)) {
        let target = null, name = m[1];
        for (const cand of [m[1], m[1].split(/,? /).pop()]) { if (entryBySlug.has(titleKey(cand)) && titleKey(cand) !== e.slug) { target = titleKey(cand); name = cand; break; } }
        if (!target) continue;
        const start = m.index + m[0].indexOf(name);
        if (start > last) parts.push(s.slice(last, start));
        parts.push([name, 0, target]);
        stats.entryLinks++;
        last = start + name.length;
      }
      if (!parts.length) continue;
      if (last < s.length) parts.push(s.slice(last));
      p.splice(i, 1, ...parts);
      i += parts.length - 1;
    }
  }
}
for (const e of entries) {
  const text = e.paras.flatMap(p => p.slice(1).map(s => (typeof s === "string" ? s : s[0]))).join(" ");
  if (/<\/?[a-z]|&[a-z#]+;|\]\(/i.test(text)) fail(`${e.title}: markup left in text`);
}

// ---------- Chapter index: which entries apply to each chapter ----------
const kjvManifest = JSON.parse(fs.readFileSync(at("public/knowing-god/bible-search/manifest.json"), "utf8"));
const kjv = new Map();
for (const f of kjvManifest.translations.kjv.files) {
  const b = BOOKS.indexOf(f.book) + 1 || fail(`KJV book ${f.book}`);
  for (const [c, v, t] of JSON.parse(fs.readFileSync(at(`public/knowing-god/bible-search/${f.file}`), "utf8"))) kjv.set(code(b, c, v), t);
}
const norm = w => w.toLowerCase().replace(/[-’']/g, "").replace(/æ/g, "ae");
// Words of each verse: [normalized, capitalized mid-sentence].
const verseWords = new Map();
const lowerSeen = new Set(), capSeen = new Map(); // over the whole KJV
for (const [c, t] of kjv) {
  const words = [];
  let sentenceStart = true;
  for (const m of t.matchAll(/([A-Za-zÆæ]+(?:[-’'][A-Za-zÆæ]+)*)|([.?!:;,])/g)) {
    if (m[2]) { sentenceStart = m[2] !== ";" ; continue; } // KJV quotations begin with a capital after "," or ":"
    let w = m[1].replace(/['’]s$/, "");
    const n = norm(w);
    const cap = /^[A-ZÆ]/.test(w) && !sentenceStart;
    if (/^[a-z]/.test(w)) lowerSeen.add(n);
    if (cap) capSeen.set(n, (capSeen.get(n) ?? 0) + 1);
    words.push([n, cap]);
    sentenceStart = false;
  }
  verseWords.set(c, words);
}
const plural = w => [w, `${w}s`, `${w}es`, w.endsWith("y") ? `${w.slice(0, -1)}ies` : w];
const chapterOf = c => Math.floor(c / 1000);
const hits = new Map(); // "b c" chapter key (b*1000+c) -> Map(entryIndex -> Set(verse))
const add = (ei, vcode) => {
  const ck = chapterOf(vcode);
  if (!hits.has(ck)) hits.set(ck, new Map());
  const m = hits.get(ck);
  if (!m.has(ei)) m.set(ei, new Set());
  m.get(ei).add(vcode % 1000);
};
const headwordOf = title => title.replace(/\s+I+\.$/, "").replace(/[!.]$/, "").split(",")[0].trim();
let nameEntries = 0, phraseEntries = 0;
entries.forEach((e, ei) => {
  const head = headwordOf(e.title);
  const words = head.split(/\s+/).map(norm);
  if (words.some(w => !w)) return;
  const bare = e.title.replace(/\s+I+\.$/, "").replace(/[!.]$/, "").trim();
  // "Sharon, Saron" / "Put, Phut": spelling variants, each a single word.
  const parts = bare.split(/,\s*/);
  const variants = parts.length > 1 && parts.every(v => /^[A-Z][A-Za-z-]*$/.test(v) && v[0] === parts[0][0]) ? parts.map(norm) : [];
  const qualified = head !== bare && !variants.length; // "Babel, Tower of"
  // 1. Proper names (capitalized in the KJV and never lower case): every verse that names them.
  const single = words.length === 1 && words[0].length > 1;
  const names = (variants.length ? variants : [words[0]]).filter(w => capSeen.has(w) && !lowerSeen.has(w));
  if (single && !qualified && names.length) {
    nameEntries++;
    for (const [c, ws] of verseWords) if (ws.some(([w]) => names.includes(w))) add(ei, c);
    return;
  }
  // 2. Phrases ("Abraham's bosom"): every verse containing the phrase.
  if (words.length > 1 && !qualified) {
    let found = false;
    for (const [c, ws] of verseWords) {
      for (let i = 0; i + words.length <= ws.length; i++) {
        if (words.every((w, j) => ws[i + j][0] === w)) { add(ei, c); found = true; break; }
      }
    }
    if (found) phraseEntries++;
    return;
  }
  // 3. Other terms: verses the entry itself cites that contain the word.
  if (!single) return;
  const forms = new Set(plural(words[0]));
  for (const p of e.paras) for (const s of p) {
    if (!Array.isArray(s) || typeof s[2] !== "number") continue;
    const from = s[2], to = s[3] ?? from;
    if (from % 1000 === 0 || to - from > 40) continue;
    for (let v = from; v <= to; v++) if (verseWords.get(v)?.some(([w]) => forms.has(w))) add(ei, v);
  }
});

// ---------- Places on the Bible maps ----------
const places = JSON.parse(fs.readFileSync(at("src/data/bible-maps/places.json"), "utf8"));
const plain = paras => paras.map(p => p.map(s => (typeof s === "string" ? s : s[0])).join("")).join(" ").replace(/\s+/g, " ").trim();
const entryText = e => plain(e.paras.filter(p => p[0] === "p").map(p => p.slice(1)));
const placeEntries = {}; // place slug -> entry slug
for (const pl of places) {
  if (!pl.easton) continue;
  const first = plain(pl.easton).slice(0, 60).toLowerCase();
  const cands = entries.filter(e => headwordOf(e.title).toLowerCase() === pl.name.toLowerCase() || e.slug === slugify(pl.name));
  const match = cands.find(e => entryText(e).toLowerCase().includes(first.slice(0, 40)));
  if (match) {
    placeEntries[pl.slug] = match.slug;
    (match.places ??= []).push(pl.slug);
  }
}

// ---------- Output ----------
const letterOf = slug => (/^[a-z]/.test(slug) ? slug[0] : "#");
const outPublic = at("public/bible-data/dictionary/");
const outData = at("src/data/bible-dictionary/");
fs.rmSync(outPublic, { recursive: true, force: true });
fs.mkdirSync(outPublic, { recursive: true });
fs.mkdirSync(outData, { recursive: true });
const short = text => sha(text).slice(0, 10);
const files = { letters: {} };
const letters = [...new Set(entries.map(e => letterOf(e.slug)))];
for (const l of letters) {
  const payload = JSON.stringify(Object.fromEntries(entries.filter(e => letterOf(e.slug) === l).map(e => [e.slug, e.paras])));
  const h = short(payload);
  fs.writeFileSync(new URL(`${l}.${h}.json`, outPublic), payload);
  files.letters[l] = h;
}
const chapters = {};
for (const ck of [...hits.keys()].sort((a, b) => a - b)) {
  const b = Math.floor(ck / 1000), c = ck % 1000;
  chapters[`${BOOKS[b - 1]} ${c}`] = [...hits.get(ck)].map(([ei, vs]) => [ei, [...vs].sort((x, y) => x - y)])
    .sort((x, y) => x[1][0] - y[1][0] || entries[x[0]].title.localeCompare(entries[y[0]].title));
}
const index = JSON.stringify({ entries: entries.map(e => [e.slug, e.title]), chapters, places: Object.fromEntries(entries.filter(e => e.places).map(e => [e.slug, e.places])) });
files.index = short(index);
fs.writeFileSync(new URL(`index.${files.index}.json`, outPublic), index);
// Full-text search over the entry text, fetched only when a reader searches inside articles.
const search = dictionarySearchFile(entries);
files.search = search.hash;
fs.writeFileSync(new URL(`search.${search.hash}.json`, outPublic), search.payload);
fs.writeFileSync(new URL("entries.json", outData), JSON.stringify(entries.map(e => ({ slug: e.slug, title: e.title, paras: e.paras, ...(e.places ? { places: e.places } : {}) }))));
fs.writeFileSync(new URL("place-entries.json", outData), JSON.stringify(placeEntries));
const chapterCount = Object.keys(chapters).length;
const manifest = {
  schemaVersion: 1,
  source: SOURCE,
  module: { name: "Easton", version: "2.0.1", textSource: "CCEL", edition: "M. G. Easton, Illustrated Bible Dictionary, third edition (Thomas Nelson, 1897)" },
  files,
  stats: {
    entries: entries.length, sourceEntries: raw.length, ...stats, nameEntries, phraseEntries, seeLinks, seeUnlinked,
    chapters: chapterCount, placeLinks: Object.keys(placeEntries).length,
  },
};
fs.writeFileSync(new URL("manifest.json", outData), JSON.stringify(manifest, null, 1) + "\n");
console.log(JSON.stringify(manifest.stats, null, 1));
console.log("dropped sample:", dropped.slice(0, 12));
if (process.env.SHOW_CORRECTIONS) console.log(corrections.join("\n"));
const total = Object.values(chapters).reduce((n, l) => n + l.length, 0);
console.log(`chapter rows ${total}, avg per chapter ${(total / 1189).toFixed(1)}, chapters with none ${1189 - chapterCount}`);
if (stats.refsDropped > 400) fail(`${stats.refsDropped} references could not be resolved`);
