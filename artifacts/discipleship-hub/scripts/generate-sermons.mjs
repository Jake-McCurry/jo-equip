// Explicit maintenance command, never a network-dependent part of normal builds.
// Usage:
//   bash scripts/fetch-sermon-sources.sh /tmp/sermon-sources
//   python3 scripts/verify-sermons.py /tmp/sermon-sources          (Spurgeon: writes scripts/data/sermon-verification.json)
//   python3 scripts/verify-wesley-sermons.py /tmp/sermon-sources   (Wesley: writes scripts/data/wesley-verification.json)
//   node scripts/generate-sermons.mjs /tmp/sermon-sources
// Publishes only the sermons listed as verified in the two verification files.
// Writes:
//   src/data/sermons/sermons.json       sermon list (build-time: index and sermon pages)
//   src/data/sermons/bodies/<slug>.json sermon text, one file per sermon (build-time)
//   src/data/sermons/manifest.json      hashes, counts and source details
//   public/bible-data/sermons/          content-hashed chapter index for the reader
// See scripts/data/bible-search-sources.md for sources and licenses.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { decodeHTML } from "entities";
import { BOOKS as CATALOG, canonicalBook } from "../worker/bible-catalog.js";
import { BOOKS, bookIndexOfAbbr, code, decode, validRange } from "./lib/scripture-refs.mjs";
import { laterSermonWords, modernRef, parseLaterSermon, parseSermon, sermonWords, splitLaterSermons, splitSermons, titleCase, volumeFootnotes } from "./lib/wesley-sermons.mjs";

const src = process.argv[2];
if (!src) throw new Error("Usage: node scripts/generate-sermons.mjs <sources directory>");
const root = new URL("../", import.meta.url);
const at = p => new URL(p, root);
const sha = buf => createHash("sha256").update(buf).digest("hex");
const fail = msg => { throw new Error(msg); };

const verification = JSON.parse(fs.readFileSync(at("scripts/data/sermon-verification.json"), "utf8"));
const scans = new Map(JSON.parse(fs.readFileSync(at("scripts/data/sermon-scan-sources.json"), "utf8")).map(s => [s.id, s]));
const tarball = fs.readFileSync(path.join(src, "spurgeon.tar.gz"));
if (sha(tarball) !== verification.edition.sha256) fail(`spurgeon.tar.gz digest changed (${sha(tarball)}). Re-run verify-sermons.py after reviewing the new source.`);

/** Minimal ustar reader: { "volume-1/sermon-1.md": text }. */
function untar(buf) {
  const out = {};
  let longName = null;
  for (let off = 0; off + 512 <= buf.length;) {
    const h = buf.subarray(off, off + 512);
    if (h.every(b => b === 0)) break;
    const str = (a, b) => h.subarray(a, b).toString("utf8").replace(/\0.*$/s, "");
    const size = parseInt(str(124, 136).trim() || "0", 8);
    const type = String.fromCharCode(h[156] || 48);
    const prefix = str(345, 500);
    let name = longName ?? (prefix ? `${prefix}/${str(0, 100)}` : str(0, 100));
    longName = null;
    const body = buf.subarray(off + 512, off + 512 + size);
    if (type === "L") longName = body.toString("utf8").replace(/\0.*$/s, "");
    else if (type === "0" || type === "\0") out[name.split("/").slice(1).join("/")] = body.toString("utf8");
    off += 512 + Math.ceil(size / 512) * 512;
  }
  return out;
}
const files = untar(zlib.gunzipSync(tarball));

// ---------- KJV text (the repository's own copy) for checking each sermon's text ----------
const kjvManifest = JSON.parse(fs.readFileSync(at("public/knowing-god/bible-search/manifest.json"), "utf8"));
const kjv = new Map();
for (const f of kjvManifest.translations.kjv.files) {
  const b = BOOKS.indexOf(f.book) + 1 || fail(`KJV book ${f.book}`);
  for (const [c, v, t] of JSON.parse(fs.readFileSync(at(`public/knowing-god/bible-search/${f.file}`), "utf8"))) kjv.set(code(b, c, v), t);
}
const versesOf = (from, to) => {
  const out = [];
  const { b, c, v } = decode(from);
  if (!v) { for (let i = 1; kjv.has(code(b, c, i)); i++) out.push(code(b, c, i)); return out; }
  for (let x = from; x <= (to ?? from); ) {
    if (kjv.has(x)) { out.push(x); x++; } else { const n = (Math.floor(x / 1000) + 1) * 1000 + 1; if (n > (to ?? from)) break; x = n; }
  }
  return out;
};
const words = s => (s.toLowerCase().match(/[a-z]+/g) ?? []);
/** Share of the quoted words that appear, in order, in the KJV text of the references. */
function kjvAgreement(quote, refs) {
  const a = words(quote), b = words(refs.flatMap(([f, t]) => versesOf(f, t)).map(c => kjv.get(c)).join(" "));
  if (!a.length || !b.length) return 0;
  let prev = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Uint16Array(b.length + 1);
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length] / a.length;
}

// ---------- reference lines ("Malachi 3:6", "Romans 8:28,29; 9:1", "Solomon's Song 2:4") ----------
const singleChapter = b => CATALOG[b - 1].chapters === 1;
function parseRefLine(line) {
  const refs = [];
  const text = line.replace(/Solomon'?s Song/gi, "Song of Solomon").replace(/\s*-\s*/g, "-").replace(/\.$/, "");
  for (const part of text.split(/\s+and\s+/)) {
    const m = /^((?:[1-3] )?[A-Za-z][A-Za-z ]*?)\s+(\d[\d:,;\-\s]*)$/.exec(part.trim());
    const name = m && (canonicalBook(m[1]) ?? BOOKS[(bookIndexOfAbbr(m[1]) ?? 0) - 1]);
    if (!name) return null;
    const b = BOOKS.indexOf(name) + 1;
    let chapter = null;
    for (const seg of m[2].split(";")) {
      let s = seg.trim();
      if (!s) continue;
      const cm = /^(\d+):(.*)$/.exec(s);
      if (cm) { chapter = Number(cm[1]); s = cm[2]; }
      else if (singleChapter(b)) chapter = 1;
      else { // whole chapters ("Psalm 23", "Romans 5; 6")
        for (const c of s.split(",")) { const n = Number(c.trim()); if (!n) return null; refs.push([code(b, n, 0)]); }
        chapter = null;
        continue;
      }
      for (const item of s.split(",")) {
        const r = /^(\d+)(?:-(\d+)(?::(\d+))?)?$/.exec(item.trim());
        if (!r) return null;
        const from = code(b, chapter, Number(r[1]));
        let to;
        if (r[3]) { to = code(b, Number(r[2]), Number(r[3])); chapter = Number(r[2]); }
        else if (r[2]) to = code(b, chapter, Number(r[2]));
        refs.push(to && to !== from ? [from, to] : [from]);
      }
    }
  }
  // Merge adjacent verses: 7:50, 7:51 -> 7:50-51.
  const merged = [];
  for (const r of refs) {
    const last = merged[merged.length - 1];
    const lastEnd = last && (last[1] ?? last[0]);
    if (last && decode(r[0]).v && decode(lastEnd).v && r[0] === lastEnd + 1) last[1] = r[1] ?? r[0];
    else merged.push([...r]);
  }
  return merged.length && merged.every(([f, t]) => validRange(f, t)) ? merged : null;
}

// ---------- markdown -> blocks ----------
const AGES = /^Adapted from The C\.\s?H\. Spurgeon Collection/i;
function parse(md, file) {
  const lines = decodeHTML(md).replace(/\r/g, "").split("\n");
  const h = /^# Sermon (\d+(?: ?(?:&|-|and) ?\d+)?) \| (.+)$/.exec(lines[0]) ?? fail(`${file}: heading`);
  let i = 1;
  while (i < lines.length && !lines[i].trim()) i++;
  const readQuote = () => { const out = []; while (i < lines.length && lines[i].startsWith(">")) out.push(lines[i++].replace(/^>\s?/, "").trim()); return out; };
  let head = readQuote();
  const preface = [];
  // A letter or note printed before the text (e.g. a letter from Spurgeon during illness):
  // keep it as an opening quotation and read the text from the next quotation.
  if (head.length >= 2 && !parseRefLine(head[head.length - 1])) {
    let j = i; while (j < lines.length && !lines[j].trim()) j++;
    if (lines[j]?.startsWith(">")) { i = j; const next = readQuote(); if (next.length >= 2 && parseRefLine(next[next.length - 1])) { preface.push({ q: head.filter(Boolean) }); head = next; } else i = j; }
  }
  // A few sermons have several texts and no single heading text.
  const refLine = head.length >= 2 ? head.pop() : null;
  if (head.length === 1 && refLine === null) fail(`${file}: unexpected heading quote`);
  const quote = head.join(" ").replace(/\s+/g, " ").trim();
  const blocks = [...preface];
  let para = [], q = [];
  const flush = () => {
    if (para.length) blocks.push({ p: para.join(" ").replace(/\s+/g, " ").trim() });
    if (q.length) blocks.push({ q: q.slice() });
    para = []; q = [];
  };
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) { flush(); continue; }
    if (AGES.test(l.trim())) { flush(); continue; }
    if (/^#{2,4} /.test(l)) { flush(); blocks.push({ h: l.replace(/^#+\s*/, "").trim() }); continue; }
    if (l.startsWith(">")) { if (para.length) flush(); q.push(l.replace(/^>\s?/, "").trim()); continue; }
    if (q.length) flush();
    para.push(l.trim());
  }
  flush();
  // Drop empty quote lines at block edges.
  for (const b of blocks) if (b.q) { while (b.q.length && !b.q[0]) b.q.shift(); while (b.q.length && !b.q[b.q.length - 1]) b.q.pop(); }
  const [n1, n2] = h[1].split(/ ?(?:&|and|-) ?/);
  // "154-55" / "1162-3" -> "154–155" / "1162–1163"
  const number = n2 ? `${n1}–${n2.length < n1.length ? n1.slice(0, n1.length - n2.length) + n2 : n2}` : n1;
  return { number, title: h[2].trim(), quote, refLine, blocks: blocks.filter(b => !b.q || b.q.length) };
}

const slugify = s => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const series = volume => (volume <= 6 ? "New Park Street Pulpit" : "Metropolitan Tabernacle Pulpit");

// Text references the edition gets wrong. Each correction must still pass the
// KJV agreement check below, so a mistaken correction cannot be published.
const REF_CORRECTIONS = {
  "volume-5/sermon-239.md": "Romans 9:13",       // edition: Romans 9:15; quote is "Jacob have I loved, but Esau have I hated"
  "volume-10/sermon_591.md": "Ezekiel 11:5",     // edition: Ezekiel 11:15; "Thus saith the Lord" is in 11:5
  "volume-22/sermon_1326.md": "Genesis 3:15",    // edition: Genesis 3:16; the scan prints Genesis iii. 14, 15 and the quote is verse 15
  "volume-6/sermon-294.md": "2 Chronicles 28:10", // edition abbreviates "2 Chron"
};

// Preaching dates are read from scan OCR, where digits are sometimes misread.
// Keep a date only when its weekday agrees with the printed service
// ("Lord's Day morning" must be a Sunday). When the service is unreadable, keep
// only Sunday and Thursday dates, the days Spurgeon's printed sermons were preached.
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
function datedService(v) {
  if (!v.date) return {};
  const day = WEEKDAYS[new Date(`${v.date}T12:00:00Z`).getUTCDay()];
  if (!v.service) return day === "sunday" || day === "thursday" ? { date: v.date } : {};
  const named = /^(lord's day|sabbath|sunday)/i.test(v.service) ? "sunday" : v.service.split(" ")[0].toLowerCase();
  return named === day ? { date: v.date, service: v.service } : {};
}

const spurgeon = [];
const bodies = new Map();
const problems = [];
for (const v of verification.verified) {
  const md = files[v.file] ?? fail(`${v.file} missing from the tarball`);
  const p = parse(md, v.file);
  const refLine = REF_CORRECTIONS[v.file] ?? p.refLine;
  const refs = refLine === null ? [] : parseRefLine(refLine);
  if (!refs) { problems.push(`${v.file}: unparsed reference "${refLine}"`); continue; }
  const agreement = refs.length ? kjvAgreement(p.quote, refs) : 1;
  if (agreement < 0.8) { problems.push(`${v.file}: text "${p.quote.slice(0, 60)}" does not match KJV ${refLine} (${agreement.toFixed(2)})`); continue; }
  const volume = Number(/^volume-(\d+)\//.exec(v.file)[1]);
  const slug = `spurgeon-${p.number.replace("–", "-")}-${slugify(p.title)}`.slice(0, 90).replace(/-$/, "");
  const scan = scans.get(v.source) ?? fail(`${v.source} not pinned`);
  spurgeon.push({
    slug, preacher: "spurgeon", number: p.number, title: p.title, volume, series: series(volume), published: 1854 + volume,
    ...datedService(v),
    refs, quote: p.quote, words: v.words,
    scan: { id: scan.id, title: scan.title, date: scan.date, library: scan.library, coverage: v.coverage },
  });
  bodies.set(slug, p.blocks);
}
const spurgeonProblems = problems.length;
spurgeon.sort((a, b) => Number(a.number.split("–")[0]) - Number(b.number.split("–")[0]));

// ---------- John Wesley: Sermons on Several Occasions (Works, Bristol 1771, vols 1–4) ----------
const wesleySources = JSON.parse(fs.readFileSync(at("scripts/data/wesley-sources.json"), "utf8"));
const wesleyVerification = JSON.parse(fs.readFileSync(at("scripts/data/wesley-verification.json"), "utf8"));
// Sermons printed without a title in 1771 take the title later editions use.
const WESLEY_TITLES = {
  3: "Awake, Thou That Sleepest",
  7: "The Way to the Kingdom",
  47: "Heaviness through Manifold Temptations",
  52: "The Reformation of Manners",
  53: "On the Death of the Rev. Mr. George Whitefield",
};
const UNTITLED = "No title is printed with this sermon in the 1771 edition; the title is the one later editions use.";
const WESLEY_NOTES = {
  3: `Preached by Charles Wesley, John Wesley’s brother; John Wesley included it among his Sermons on Several Occasions. ${UNTITLED}`,
  7: UNTITLED, 47: UNTITLED, 52: UNTITLED,
};
// Same rule as REF_CORRECTIONS above: each correction must pass the KJV check.
const WESLEY_REF_CORRECTIONS = {
  41: "2 Corinthians 10:5", // 1771 prints "2 Cor. x. 4" (checked in the scan); the words are verse 5
};
// Texts Wesley quotes from another version; the agreement floor drops to 0.7 and the page names the version.
// Agreement floor for a text quoted from another version (the Psalter paraphrases more freely than the KJV).
const TEXT_VERSION_FLOOR = 0.65;
const WESLEY_TEXT_VERSIONS = {
  52: "Book of Common Prayer Psalter", // "Who will rise up with me against the wicked?" (KJV: "for me against the evildoers")
};
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** "… on Sunday, January 30, 1763, at …" -> "1763-01-30" (the date as printed; dates before 1752 are Old Style). */
function printedDate(occasion) {
  const m = occasion && new RegExp(`(${MONTH_NAMES.join("|")}) (\\d{1,2}), (1[67]\\d\\d)`).exec(occasion);
  return m ? `${m[3]}-${String(MONTH_NAMES.indexOf(m[1]) + 1).padStart(2, "0")}-${m[2].padStart(2, "0")}` : null;
}
const wesleySupplements = new Map((wesleySources.supplements ?? []).map(x => [`${x.volume}/${x.sermon}`, x]));
const wesley = [];
const wesleyProblems = [];
const volumes = new Map();
for (const vol of wesleySources.volumes) {
  const buf = fs.readFileSync(path.join(src, "wesley", vol.transcription.file));
  if (sha(buf) !== vol.transcription.sha256) fail(`${vol.transcription.file} digest changed (${sha(buf)}). Re-run verify-wesley-sermons.py after reviewing the new source.`);
  const text = buf.toString("utf8");
  volumes.set(vol.volume, { vol, sermons: splitSermons(text), footnotes: volumeFootnotes(text) });
}
for (const v of wesleyVerification.verified) {
  const { vol, sermons: chunks, footnotes } = volumes.get(v.volume) ?? fail(`Wesley volume ${v.volume} not pinned`);
  const lines = chunks.get(v.number) ?? fail(`Wesley sermon ${v.number} missing from volume ${v.volume}`);
  if (sermonWords(lines) !== v.words) fail(`Wesley sermon ${v.number}: ${sermonWords(lines)} words, verified ${v.words}`);
  if (v.source !== vol.scan.id) fail(`Wesley sermon ${v.number}: verified against unpinned scan ${v.source}`);
  // Pages missing from the volume scan, checked against a separate printing of the sermon.
  const sup = v.supplement && (wesleySupplements.get(`${v.volume}/${v.number}`) ?? fail(`Wesley sermon ${v.number}: unpinned supplement`));
  if (sup && sup.scan.id !== v.supplement.source) fail(`Wesley sermon ${v.number}: verified against unpinned supplement ${v.supplement.source}`);
  const p = parseSermon(v.number, lines, footnotes);
  const heading = p.heading ? titleCase(p.heading) : null;
  const base = WESLEY_TITLES[v.number] ?? heading ?? fail(`Wesley sermon ${v.number}: no title`);
  const title = p.discourse ? `${base}: Discourse ${p.discourse}` : base;
  const refLine = WESLEY_REF_CORRECTIONS[v.number] ?? modernRef(p.refLine);
  const refs = refLine && parseRefLine(refLine);
  if (!refs) { wesleyProblems.push(`Wesley ${v.number}: unparsed reference "${p.refLine}"`); continue; }
  const textVersion = WESLEY_TEXT_VERSIONS[v.number];
  const agreement = kjvAgreement(p.quote, refs);
  if (agreement < (textVersion ? TEXT_VERSION_FLOOR : 0.8)) { wesleyProblems.push(`Wesley ${v.number}: text "${p.quote.slice(0, 60)}" does not match KJV ${refLine} (${agreement.toFixed(2)})`); continue; }
  const slug = `wesley-${v.number}-${slugify(title)}`.slice(0, 90).replace(/-$/, "");
  const date = printedDate(p.occasion);
  wesley.push({
    slug, preacher: "wesley", number: String(v.number), title, volume: v.volume, series: wesleySources.edition.series, published: wesleySources.edition.published,
    ...(date ? { date } : {}),
    ...(p.occasion ? { occasion: p.occasion } : {}),
    ...(WESLEY_NOTES[v.number] ? { note: WESLEY_NOTES[v.number] } : {}),
    ...(textVersion ? { textVersion } : {}),
    refs, quote: p.quote, words: v.words,
    scan: {
      id: vol.scan.id, title: vol.scan.title, date: vol.scan.date, library: vol.scan.library, coverage: v.coverage,
      ...(sup ? { supplement: { id: sup.scan.id, title: sup.scan.title, date: sup.scan.date, imprint: sup.scan.imprint, pages: sup.missingPages, coverage: v.supplement.coverage } } : {}),
    },
  });
  bodies.set(slug, p.blocks);
}
// ---------- John Wesley: later sermons (Sermons on Several Occasions, London 1788, vols 5–8) ----------
const later = wesleySources.later;
const laterVerification = wesleyVerification.later;
const laterBuf = fs.readFileSync(path.join(src, "wesley", later.transcription.file));
if (sha(laterBuf) !== later.transcription.sha256) fail(`${later.transcription.file} digest changed (${sha(laterBuf)}). Re-run verify-wesley-sermons.py after reviewing the new source.`);
const laterChunks = splitLaterSermons(laterBuf.toString("utf8"));
const laterScans = new Map(later.volumes.flatMap(v => v.scans.map(s => [s.id, { ...s, volume: v.volume }])));
// "Will the Lord absent himself for ever? And will he be no more entreated?" (KJV: "cast off for ever ... favourable no more")
const LATER_TEXT_VERSIONS = { 86: "Book of Common Prayer Psalter" };
const LATER_NOTE = "Text of Thomas Jackson’s edition of Wesley’s Works (1872), whose numbering this sermon follows; its wording was checked against the 1788 printing.";
for (const v of laterVerification.verified) {
  const chunk = laterChunks.get(v.number) ?? fail(`Wesley sermon ${v.number} missing from ${later.transcription.file}`);
  if (laterSermonWords(chunk.lines) !== v.words) fail(`Wesley sermon ${v.number}: ${laterSermonWords(chunk.lines)} words, verified ${v.words}`);
  const scan = laterScans.get(v.source) ?? fail(`Wesley sermon ${v.number}: verified against unpinned scan ${v.source}`);
  if (scan.volume !== v.volume) fail(`Wesley sermon ${v.number}: scan ${v.source} is not volume ${v.volume}`);
  const p = parseLaterSermon(v.number, chunk);
  const refs = parseRefLine(p.refLine.replace(/^Jam\./, "James").replace(/^((?:[1-3] )?[A-Za-z]+)\.(?= )/, "$1"));
  if (!refs) { wesleyProblems.push(`Wesley ${v.number}: unparsed reference "${p.refLine}"`); continue; }
  const textVersion = LATER_TEXT_VERSIONS[v.number];
  const agreement = kjvAgreement(p.quote, refs);
  if (agreement < (textVersion ? TEXT_VERSION_FLOOR : 0.8)) { wesleyProblems.push(`Wesley ${v.number}: text "${p.quote.slice(0, 60)}" does not match KJV ${p.refLine} (${agreement.toFixed(2)})`); continue; }
  const slug = `wesley-${v.number}-${slugify(p.title)}`.slice(0, 90).replace(/-$/, "");
  const prefatory = p.prefatory.map(t => `Wesley’s note printed with this sermon: “${t.replace(/\s*--\s*/g, " — ").trim()}”`);
  wesley.push({
    slug, preacher: "wesley", number: String(v.number), title: p.title, volume: v.volume, series: later.edition.title, published: later.edition.published,
    ...(p.subtitle ? { occasion: p.subtitle } : {}),
    note: [...prefatory, LATER_NOTE].join(" "),
    ...(textVersion ? { textVersion } : {}),
    refs, quote: p.quote, words: v.words,
    scan: { id: scan.id, title: scan.title, date: scan.date, library: scan.library, coverage: v.coverage },
  });
  bodies.set(slug, p.blocks);
}
wesley.sort((a, b) => Number(a.number) - Number(b.number));
problems.push(...wesleyProblems);
if (problems.length) console.warn(`Skipped ${problems.length}:\n  ${problems.join("\n  ")}`);

const sermons = [...spurgeon, ...wesley];
if (new Set(sermons.map(s => s.slug)).size !== sermons.length) fail("duplicate sermon slugs");

// ---------- reader chapter index: "Malachi 3" -> [[sermon index, [[v1, v2], ...]], ...] (v1 = 0: whole chapter) ----------
const chapters = {};
sermons.forEach((s, i) => {
  const per = new Map();
  for (const [from, to] of s.refs) {
    const a = decode(from), z = decode(to ?? from);
    for (let c = a.c; c <= z.c; c++) {
      const key = `${BOOKS[a.b - 1]} ${c}`;
      const v1 = c === a.c ? a.v : 1, v2 = c === z.c ? (to ? z.v : a.v) : versesOf(code(a.b, c, 0)).length;
      if (!per.has(key)) per.set(key, []);
      per.get(key).push(v1 === 0 ? [0, 0] : [v1, v2]);
    }
  }
  for (const [key, ranges] of per) (chapters[key] ??= []).push([i, ranges]);
});
const list = sermons.map(s => [s.slug, s.title, s.number, s.date ? Number(s.date.slice(0, 4)) : s.published, s.refs, s.preacher]);

const outPublic = at("public/bible-data/sermons/");
const outData = at("src/data/sermons/");
fs.rmSync(outPublic, { recursive: true, force: true });
fs.rmSync(new URL("bodies/", outData), { recursive: true, force: true });
fs.mkdirSync(outPublic, { recursive: true });
fs.mkdirSync(new URL("bodies/", outData), { recursive: true });
const hashed = (name, text) => { const h = sha(text).slice(0, 10); fs.writeFileSync(new URL(`${name}.${h}.json`, outPublic), text); return h; };
const index = JSON.stringify({ sermons: list, chapters });
const manifest = {
  files: { index: hashed("index", index) },
  published: sermons.length,
  preachers: {
    spurgeon: {
      counts: { checked: verification.checked, published: spurgeon.length, rejected: verification.rejected, skippedHere: spurgeonProblems },
      edition: verification.edition,
      criteria: verification.criteria,
    },
    wesley: {
      counts: { checked: wesleyVerification.checked, published: wesley.filter(s => s.published === wesleySources.edition.published).length, rejected: wesleyVerification.rejected, skippedHere: wesleyProblems.length },
      edition: { ...wesleySources.edition, transcriptions: wesleySources.volumes.map(v => ({ volume: v.volume, gutenberg: v.transcription.gutenberg, sha256: v.transcription.sha256 })) },
      criteria: wesleyVerification.criteria,
      later: {
        counts: { checked: laterVerification.checked, published: wesley.filter(s => s.published === later.edition.published).length, rejected: laterVerification.rejected },
        edition: later.edition,
        transcription: { publisher: later.transcription.publisher, page: later.transcription.page, url: later.transcription.url, sha256: later.transcription.sha256 },
        scans: [...laterScans.values()].map(s => ({ volume: s.volume, id: s.id, library: s.library })),
        criteria: laterVerification.criteria,
      },
    },
  },
};
fs.writeFileSync(new URL("manifest.json", outData), JSON.stringify(manifest, null, 1) + "\n");
fs.writeFileSync(new URL("sermons.json", outData), JSON.stringify(sermons) + "\n");
for (const [slug, blocks] of bodies) fs.writeFileSync(new URL(`bodies/${slug}.json`, outData), JSON.stringify(blocks) + "\n");
console.log(`${spurgeon.length} Spurgeon sermons (of ${verification.checked} checked) and ${wesley.length} Wesley sermons (of ${wesleyVerification.checked + laterVerification.checked}) published; ${Object.keys(chapters).length} chapters; index ${(index.length / 1024).toFixed(0)} KB`);
