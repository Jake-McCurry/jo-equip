// Build-time validation of the generated classic sermon data
// (scripts/generate-sermons.mjs). Runs offline against committed files.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import { BOOKS, code, decode, validRange } from "./lib/scripture-refs.mjs";

const root = new URL("../", import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), "utf8");
const manifest = JSON.parse(read("src/data/sermons/manifest.json"));
const sermons = JSON.parse(read("src/data/sermons/sermons.json"));
const verification = JSON.parse(read("scripts/data/sermon-verification.json"));
const wesleyVerification = JSON.parse(read("scripts/data/wesley-verification.json"));
const wesleySources = JSON.parse(read("scripts/data/wesley-sources.json"));
const scans = new Map(JSON.parse(read("scripts/data/sermon-scan-sources.json")).map(s => [s.id, s]));
const indexFile = `public/bible-data/sermons/index.${manifest.files.index}.json`;
const index = JSON.parse(read(indexFile));

const kjv = new Map();
for (const f of JSON.parse(read("public/knowing-god/bible-search/manifest.json")).translations.kjv.files) {
  const b = BOOKS.indexOf(f.book) + 1;
  for (const [c, v, t] of JSON.parse(read(`public/knowing-god/bible-search/${f.file}`))) kjv.set(code(b, c, v), t);
}
const versesOf = ([from, to]) => {
  const { b, c, v } = decode(from);
  if (!v) { const out = []; for (let i = 1; kjv.has(code(b, c, i)); i++) out.push(code(b, c, i)); return out; }
  const out = [];
  for (let x = from; x <= (to ?? from); x++) {
    if (kjv.has(x)) out.push(x);
    else { const n = (Math.floor(x / 1000) + 1) * 1000; if (n >= (to ?? from)) break; x = n; }
  }
  return out;
};
const words = s => s.toLowerCase().match(/[a-z]+/g) ?? [];
function inOrderShare(a, b) {
  let prev = new Uint16Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    const cur = new Uint16Array(b.length + 1);
    for (let j = 1; j <= b.length; j++) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    prev = cur;
  }
  return prev[b.length] / a.length;
}

test("hashed reader index matches its content hash and nothing stale is left", () => {
  const body = fs.readFileSync(new URL(indexFile, root));
  assert.equal(createHash("sha256").update(body).digest("hex").slice(0, 10), manifest.files.index);
  assert.deepEqual(fs.readdirSync(new URL("public/bible-data/sermons/", root)), [`index.${manifest.files.index}.json`]);
  const bodies = new Set(fs.readdirSync(new URL("src/data/sermons/bodies/", root)));
  assert.deepEqual(bodies, new Set(sermons.map(s => `${s.slug}.json`)));
});

test("only verified sermons are published, each tied to a pinned scan", () => {
  const spurgeon = sermons.filter(s => s.preacher === "spurgeon");
  const wesley = sermons.filter(s => s.preacher === "wesley");
  assert.equal(spurgeon.length + wesley.length, sermons.length, "unknown preacher");
  assert.ok(spurgeon.length >= 250, `${spurgeon.length} Spurgeon sermons`);
  assert.ok(wesley.length >= 85, `${wesley.length} Wesley sermons`);
  assert.equal(manifest.published, sermons.length);
  assert.equal(manifest.preachers.spurgeon.counts.published, spurgeon.length);
  assert.equal(manifest.preachers.wesley.counts.published, wesley.filter(s => s.published === 1771).length);
  assert.equal(new Set(sermons.map(s => s.slug)).size, sermons.length);

  const { minCoverage, maxCasePer1000, maxArchaicPer1000 } = verification.criteria;
  const bySource = new Set(verification.verified.map(v => `${v.source}|${v.words}`));
  for (const s of spurgeon) {
    assert.match(s.slug, /^spurgeon-[0-9]+(-[0-9]+)?-[a-z0-9]+(-[a-z0-9]+)*$/, s.slug);
    assert.ok(scans.has(s.scan.id), `${s.slug}: unpinned scan ${s.scan.id}`);
    assert.ok(bySource.has(`${s.scan.id}|${s.words}`), `${s.slug}: not in the verification results`);
    assert.ok(s.scan.coverage >= minCoverage, s.slug);
    if (s.date) assert.match(s.date, /^18[5-9]\d-\d\d-\d\d$/, s.slug);
  }
  for (const v of verification.verified) assert.ok(v.coverage >= minCoverage && v.case <= maxCasePer1000 && v.archaic <= maxArchaicPer1000, v.file);

  const wc = wesleyVerification.criteria;
  assert.deepEqual(wc, verification.criteria, "Wesley's 1771 sermons use the Spurgeon criteria");
  const wesleyScans = new Map(wesleySources.volumes.map(v => [v.volume, v.scan.id]));
  const wesleyVerified = new Map(wesleyVerification.verified.map(v => [v.number, v]));
  // Later sermons (1788 volumes 5–8): Jackson's numbering 54–108, one or more pinned scans per volume.
  const later = wesleyVerification.later;
  const lc = later.criteria;
  assert.deepEqual(lc, { minCoverage: wc.minCoverage, maxDivineCapitalsPer1000: 1, maxArchaicPer1000: wc.maxArchaicPer1000 });
  const laterScans = new Map(wesleySources.later.volumes.flatMap(v => v.scans.map(s => [s.id, v.volume])));
  const laterVolumes = new Map(wesleySources.later.volumes.flatMap(v => Array.from({ length: v.sermons[1] - v.sermons[0] + 1 }, (_, k) => [v.sermons[0] + k, v.volume])));
  assert.equal(later.checked, laterVolumes.size);
  // Re-read OCR of a scan's page images (scripts/ocr-wesley-scan.py) is committed and pinned; a result may use it only if listed.
  const reread = wesleySources.later.volumes.flatMap(v => v.scans.filter(s => s.ocr));
  for (const s of reread) {
    const body = zlib.gunzipSync(fs.readFileSync(new URL(`scripts/data/${s.file}`, root)));
    assert.equal(createHash("md5").update(body).digest("hex"), s.md5, `${s.file}: differs from the pinned md5`);
  }
  for (const v of later.verified.filter(v => v.ocr)) assert.ok(reread.some(s => s.id === v.source), `Wesley ${v.number}: unpinned re-read OCR`);
  // Transcription typos corrected to the 1788 printing: the published text carries the correction, and the
  // quoted print reading is in the pinned re-read OCR of that sermon's volume (line breaks and hyphenation joined).
  const rereadText = new Map(wesleySources.later.volumes.map(v => [v.volume, v.scans.filter(s => s.ocr).map(s =>
    zlib.gunzipSync(fs.readFileSync(new URL(`scripts/data/${s.file}`, root))).toString("utf8").replace(/\s+/g, " ").replace(/- /g, "")).join(" ")]));
  const corrections = JSON.parse(read("scripts/data/wesley-corrections.json")).corrections;
  assert.ok(corrections.length >= 1);
  for (const c of corrections) {
    const s = wesley.find(s => s.published === 1788 && Number(s.number) === c.sermon);
    assert.ok(s, `correction for unpublished Wesley ${c.sermon}`);
    const body = JSON.stringify(JSON.parse(read(`src/data/sermons/bodies/${s.slug}.json`)));
    assert.ok(!body.includes(c.from), `${s.slug}: uncorrected "${c.from}"`);
    assert.ok(body.includes(c.to), `${s.slug}: missing "${c.to}"`);
    assert.ok(rereadText.get(s.volume)?.includes(c.print), `${s.slug}: "${c.print}" not in the re-read 1788 OCR`);
  }
  const laterVerified = new Map(later.verified.map(v => [v.number, v]));
  assert.equal(manifest.preachers.wesley.later.counts.published, wesley.filter(s => s.published === 1788).length);
  for (const s of wesley) {
    assert.match(s.slug, /^wesley-[0-9]+-[a-z0-9]+(-[a-z0-9]+)*$/, s.slug);
    const n = Number(s.number);
    if (s.published === 1788) {
      assert.ok(n >= 54 && n <= 108, s.slug);
      const v = laterVerified.get(n);
      assert.ok(v, `${s.slug}: not in the verification results`);
      assert.equal(v.words, s.words, s.slug);
      assert.equal(v.volume, s.volume, s.slug);
      assert.equal(laterVolumes.get(n), s.volume, `${s.slug}: wrong 1788 volume`);
      assert.equal(v.source, s.scan.id, s.slug);
      assert.equal(laterScans.get(s.scan.id), s.volume, `${s.slug}: unpinned scan ${s.scan.id}`);
      assert.ok(s.scan.coverage >= lc.minCoverage, s.slug);
      assert.match(s.note ?? "", /Jackson/, `${s.slug}: the page must say the text follows Jackson's edition`);
      assert.equal(s.date, undefined, s.slug);
      continue;
    }
    assert.equal(s.published, 1771, s.slug);
    assert.ok(n >= 1 && n <= 53, s.slug);
    const v = wesleyVerified.get(n);
    assert.ok(v, `${s.slug}: not in the verification results`);
    assert.equal(v.words, s.words, s.slug);
    assert.equal(v.volume, s.volume, s.slug);
    assert.equal(s.scan.id, wesleyScans.get(s.volume), `${s.slug}: unpinned scan ${s.scan.id}`);
    assert.ok(s.scan.coverage >= wc.minCoverage, s.slug);
    // Pages missing from a volume scan are checked against a pinned separate printing.
    const sup = (wesleySources.supplements ?? []).find(x => x.volume === s.volume && x.sermon === Number(s.number));
    assert.equal(Boolean(s.scan.supplement), Boolean(v.supplement), `${s.slug}: supplement mismatch`);
    if (s.scan.supplement) {
      assert.ok(sup, `${s.slug}: unpinned supplement`);
      assert.equal(s.scan.supplement.id, sup.scan.id, s.slug);
      assert.equal(v.supplement.source, sup.scan.id, s.slug);
      assert.ok(v.supplement.coverage >= wc.minCoverage, `${s.slug}: supplement covers too little`);
    }
    if (s.date) assert.match(s.date, /^17[3-7]\d-\d\d-\d\d$/, s.slug);
  }
  for (const v of wesleyVerification.verified) assert.ok(v.coverage >= wc.minCoverage && v.case <= wc.maxCasePer1000 && v.archaic <= wc.maxArchaicPer1000, `Wesley ${v.number}`);
  for (const v of later.verified) assert.ok(v.coverage >= lc.minCoverage && v.divine <= lc.maxDivineCapitalsPer1000 && v.archaic <= lc.maxArchaicPer1000, `Wesley ${v.number}`);
});

test("every sermon text is a real KJV passage and the quoted words match it", () => {
  for (const s of sermons) {
    for (const r of s.refs) {
      assert.ok(validRange(r[0], r[1]), `${s.slug}: invalid reference ${r}`);
      assert.ok(versesOf(r).length > 0, `${s.slug}: ${r} has no KJV verses`);
    }
    if (!s.refs.length) continue;
    const share = inOrderShare(words(s.quote), words(s.refs.flatMap(versesOf).map(c => kjv.get(c)).join(" ")));
    // A text quoted from another version (Wesley's Prayer Book Psalter) is named on the page.
    assert.ok(share >= (s.textVersion ? 0.65 : 0.8), `${s.slug}: quoted text matches KJV ${(share * 100).toFixed(0)}%`);
  }
});

test("sermon bodies are clean, non-trivial text", () => {
  for (const s of sermons) {
    const blocks = JSON.parse(read(`src/data/sermons/bodies/${s.slug}.json`));
    const text = blocks.map(b => b.p ?? b.h ?? b.q.join(" ")).join(" ");
    assert.ok(words(text).length >= 1500, `${s.slug}: body too short`);
    assert.doesNotMatch(text, /&[a-z]+;|<\/?[a-z]|Ages Software|C\.\s?H\. Spurgeon Collection/i, s.slug);
    // Gutenberg markup and transcribers' notes must not leak into Wesley's text.
    if (s.preacher === "wesley") assert.doesNotMatch(text, /[♦♠♥♣_|]|replaced with|Illustration:/, s.slug);
    // Footnote anchors [n] must each have a note under "Notes".
    const anchors = new Set((text.split(/ Notes \[1\] /)[0].match(/\[\d+\]/g) ?? []));
    const notes = blocks.filter(b => b.p && /^\[\d+\] /.test(b.p)).map(b => b.p.match(/^\[\d+\]/)[0]);
    for (const a of anchors) assert.ok(notes.includes(a), `${s.slug}: footnote ${a} has no note`);
  }
});

test("reader chapter index agrees with the sermon references", () => {
  assert.equal(index.sermons.length, sermons.length);
  index.sermons.forEach((row, i) => assert.equal(row[0], sermons[i].slug));
  const expected = new Map();
  sermons.forEach((s, i) => {
    for (const [from, to] of s.refs) {
      const a = decode(from), z = decode(to ?? from);
      for (let c = a.c; c <= z.c; c++) expected.set(`${BOOKS[a.b - 1]} ${c}|${i}`, true);
    }
  });
  let n = 0;
  for (const [key, list] of Object.entries(index.chapters)) {
    const [book, chapter] = [key.replace(/ \d+$/, ""), Number(key.match(/\d+$/)[0])];
    const max = versesOf([code(BOOKS.indexOf(book) + 1, chapter, 0)]).length;
    assert.ok(max > 0, key);
    for (const [i, ranges] of list) {
      assert.ok(expected.has(`${key}|${i}`), `${key}: sermon ${i}`);
      for (const [v1, v2] of ranges) assert.ok((v1 === 0 && v2 === 0) || (v1 >= 1 && v1 <= v2 && v2 <= max), `${key}: ${v1}-${v2}`);
      n++;
    }
  }
  assert.equal(n, expected.size);
});
