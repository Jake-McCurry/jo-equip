// Build-time validation of the generated classic sermon data
// (scripts/generate-sermons.mjs). Runs offline against committed files.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { BOOKS, code, decode, validRange } from "./lib/scripture-refs.mjs";

const root = new URL("../", import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), "utf8");
const manifest = JSON.parse(read("src/data/sermons/manifest.json"));
const sermons = JSON.parse(read("src/data/sermons/sermons.json"));
const verification = JSON.parse(read("scripts/data/sermon-verification.json"));
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
  const verified = new Map(verification.verified.map(v => [v.file, v]));
  const { minCoverage, maxCasePer1000, maxArchaicPer1000 } = verification.criteria;
  assert.ok(sermons.length >= 250, `${sermons.length} sermons`);
  assert.equal(manifest.counts.published, sermons.length);
  assert.equal(new Set(sermons.map(s => s.slug)).size, sermons.length);
  const bySource = new Set(verification.verified.map(v => `${v.source}|${v.words}`));
  for (const s of sermons) {
    assert.match(s.slug, /^spurgeon-[0-9]+(-[0-9]+)?-[a-z0-9]+(-[a-z0-9]+)*$/, s.slug);
    assert.ok(scans.has(s.scan.id), `${s.slug}: unpinned scan ${s.scan.id}`);
    assert.ok(bySource.has(`${s.scan.id}|${s.words}`), `${s.slug}: not in the verification results`);
    assert.ok(s.scan.coverage >= minCoverage, s.slug);
    if (s.date) assert.match(s.date, /^18[5-9]\d-\d\d-\d\d$/, s.slug);
  }
  for (const v of verified.values()) assert.ok(v.coverage >= minCoverage && v.case <= maxCasePer1000 && v.archaic <= maxArchaicPer1000, v.file);
});

test("every sermon text is a real KJV passage and the quoted words match it", () => {
  for (const s of sermons) {
    for (const r of s.refs) {
      assert.ok(validRange(r[0], r[1]), `${s.slug}: invalid reference ${r}`);
      assert.ok(versesOf(r).length > 0, `${s.slug}: ${r} has no KJV verses`);
    }
    if (!s.refs.length) continue;
    const share = inOrderShare(words(s.quote), words(s.refs.flatMap(versesOf).map(c => kjv.get(c)).join(" ")));
    assert.ok(share >= 0.8, `${s.slug}: quoted text matches KJV ${(share * 100).toFixed(0)}%`);
  }
});

test("sermon bodies are clean, non-trivial text", () => {
  for (const s of sermons) {
    const blocks = JSON.parse(read(`src/data/sermons/bodies/${s.slug}.json`));
    const text = blocks.map(b => b.p ?? b.h ?? b.q.join(" ")).join(" ");
    assert.ok(words(text).length >= 1500, `${s.slug}: body too short`);
    assert.doesNotMatch(text, /&[a-z]+;|<\/?[a-z]|Ages Software|C\.\s?H\. Spurgeon Collection/i, s.slug);
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
