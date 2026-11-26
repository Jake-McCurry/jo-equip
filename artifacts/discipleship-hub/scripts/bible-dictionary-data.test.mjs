// Build-time validation of the generated Easton's Bible Dictionary data
// (scripts/generate-bible-dictionary.mjs). Runs offline against committed files.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { BOOKS, code, validCode, validRange } from "./lib/scripture-refs.mjs";
import { dictionarySearchFile, dictEntryPlainText } from "./lib/dictionary-search.mjs";

const root = new URL("../", import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), "utf8");
const manifest = JSON.parse(read("src/data/bible-dictionary/manifest.json"));
const entries = JSON.parse(read("src/data/bible-dictionary/entries.json"));
const placeEntries = JSON.parse(read("src/data/bible-dictionary/place-entries.json"));
const places = new Set(JSON.parse(read("src/data/bible-maps/places.json")).map(p => p.slug));
const scanCheck = JSON.parse(read("scripts/data/easton-scan-check.json"));
const bySlug = new Map(entries.map(e => [e.slug, e]));
const hash10 = buf => createHash("sha256").update(buf).digest("hex").slice(0, 10);
const PINNED = "f6dd054554764e2e97d5d189a697eb26039054578a9ccf98ce668ab810341c6e";

test("the source module is pinned by checksum", () => {
  assert.equal(manifest.source.sha256, PINNED);
  assert.match(read("scripts/generate-bible-dictionary.mjs"), new RegExp(`sha256: "${PINNED}"`));
  assert.match(read("scripts/fetch-dictionary-sources.sh"), new RegExp(PINNED));
  assert.match(read("scripts/data/bible-search-sources.md"), new RegExp(PINNED));
});

test("entries have unique, URL-safe slugs and titles", () => {
  assert.equal(entries.length, manifest.stats.entries);
  assert.ok(entries.length > 3900);
  assert.equal(bySlug.size, entries.length);
  for (const e of entries) {
    assert.match(e.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, e.slug);
    assert.ok(e.title.trim() && e.title === e.title.trim(), e.slug);
    assert.ok(e.paras.length > 0, e.slug);
  }
});

test("every scripture link is a valid KJV reference and every entry link resolves", () => {
  let refs = 0;
  for (const e of entries) for (const p of e.paras) {
    assert.ok(p[0] === "p" || p[0] === "h", `${e.slug}: paragraph kind ${p[0]}`);
    for (const s of p.slice(1)) {
      if (typeof s === "string") continue;
      assert.equal(typeof s[0], "string");
      assert.ok(s[1] === 0 || s[1] === 1, `${e.slug}: flags`);
      if (s.length === 2) continue;
      if (typeof s[2] === "string") { assert.ok(bySlug.has(s[2]) && s[2] !== e.slug, `${e.slug}: link to ${s[2]}`); continue; }
      assert.ok(validRange(s[2], s[3]), `${e.slug}: invalid reference ${s[0]} -> ${s[2]}${s[3] ? `-${s[3]}` : ""}`);
      refs++;
    }
  }
  assert.ok(refs > 23000, `${refs} scripture links`);
  assert.ok(manifest.stats.refsDropped <= 100, `${manifest.stats.refsDropped} references left unlinked`);
});

test("no markup is left in entry text", () => {
  for (const e of entries) {
    const text = [e.title, ...e.paras.map(p => p.slice(1).map(s => (typeof s === "string" ? s : s[0])).join(""))].join("\n");
    assert.doesNotMatch(text, /<\/?[a-z][^>]*>|&(?:[a-z]+|#\d+|#x[0-9a-f]+);|\]\(|osisRef|Easton:|\(q\.v\.\)\s*\(/i, e.slug);
    assert.doesNotMatch(text, / {2,}|\u0000|^ | $/m, e.slug);
  }
});

test("hashed reader files match their content and nothing stale is left", () => {
  const dir = new URL("public/bible-data/dictionary/", root);
  const expected = [`index.${manifest.files.index}.json`, `search.${manifest.files.search}.json`, ...Object.entries(manifest.files.letters).map(([l, h]) => `${l}.${h}.json`)];
  assert.deepEqual(new Set(fs.readdirSync(dir)), new Set(expected));
  for (const f of expected) assert.equal(hash10(fs.readFileSync(new URL(f, dir))), f.split(".")[1], f);
  // Letter files hold exactly the entries' paragraphs.
  let n = 0;
  for (const [l, h] of Object.entries(manifest.files.letters)) {
    const all = JSON.parse(fs.readFileSync(new URL(`${l}.${h}.json`, dir), "utf8"));
    for (const [slug, paras] of Object.entries(all)) { assert.equal(slug[0], l); assert.deepEqual(paras, bySlug.get(slug)?.paras, slug); n++; }
  }
  assert.equal(n, entries.length);
});

test("the chapter index lists real entries on real verses", () => {
  const index = JSON.parse(read(`public/bible-data/dictionary/index.${manifest.files.index}.json`));
  assert.deepEqual(index.entries, entries.map(e => [e.slug, e.title]));
  const keys = Object.keys(index.chapters);
  assert.ok(keys.length > 1150, `${keys.length} chapters`);
  for (const k of keys) {
    const m = /^(.+) (\d+)$/.exec(k);
    const b = BOOKS.indexOf(m[1]) + 1;
    assert.ok(b > 0 && validCode(code(b, Number(m[2]), 0)), k);
    for (const [i, verses] of index.chapters[k]) {
      assert.ok(index.entries[i], `${k}: entry ${i}`);
      assert.ok(verses.length && verses.every(v => validCode(code(b, Number(m[2]), v)) && v > 0), `${k}: verses`);
    }
  }
  const john3 = index.chapters["John 3"].map(([i]) => index.entries[i][0]);
  for (const s of ["nicodemus", "jordan", "salim"]) assert.ok(john3.includes(s), `John 3 lists ${s}`);
  for (const [slug, list] of Object.entries(index.places)) assert.deepEqual(list, bySlug.get(slug).places);
});

test("the full-text search file holds every entry's readable text", () => {
  assert.match(manifest.files.search ?? "", /^[0-9a-f]{10}$/);
  const raw = read(`public/bible-data/dictionary/search.${manifest.files.search}.json`);
  // Rebuilt from the committed entries, it is byte-identical (so it cannot drift from the pages).
  assert.equal(raw, dictionarySearchFile(entries).payload);
  const rows = JSON.parse(raw);
  assert.deepEqual(rows.map(([slug, title]) => [slug, title]), entries.map(e => [e.slug, e.title]));
  for (const [slug, , text] of rows) {
    assert.ok(text.length > 0 && text === text.trim(), slug);
    assert.doesNotMatch(text, /\s{2,}|<\/?[a-z]/i, slug);
  }
  const byText = new Map(rows.map(([slug, , text]) => [slug, text]));
  assert.ok(byText.get("aaron").startsWith("The eldest son of Amram and Jochebed, a daughter of Levi (Ex. 6:20)."));
  assert.equal(byText.get("nicodemus"), dictEntryPlainText(bySlug.get("nicodemus")));
  // Topics named only inside articles are findable (the reason for the file).
  const find = re => rows.filter(([, , text]) => re.test(text)).map(([slug]) => slug);
  assert.ok(find(/Amarna/).length >= 15, "Amarna tablets");
  assert.ok(find(/Tell Amarna/).length >= 3 && find(/Tell-el-Amarna/).length >= 3, "Tell Amarna spellings");
  assert.ok(find(/phylacter/i).includes("frontlets"), "phylactery in Frontlets");
  // Fetched only when a reader searches inside articles; keep it from growing unnoticed.
  assert.ok(raw.length < 3_000_000, `${raw.length} bytes`);
  assert.match(read("public/_headers"), /\/bible-data\/dictionary\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
});

test("place links point to Bible map pages both ways", () => {
  assert.ok(Object.keys(placeEntries).length > 400);
  for (const [place, slug] of Object.entries(placeEntries)) {
    assert.ok(places.has(place), place);
    assert.ok(bySlug.get(slug)?.places?.includes(place), `${slug} -> ${place}`);
  }
  for (const e of entries) for (const p of e.places ?? []) assert.equal(placeEntries[p], e.slug);
});

test("the transcription was spot-checked against a pinned scan", () => {
  assert.equal(scanCheck.scan.md5, "f6ba3e308d3295acbad4c22505860f92");
  assert.ok(scanCheck.results.length >= 50);
  for (const r of scanCheck.results) assert.ok(bySlug.has(r.slug), r.slug);
  assert.ok(scanCheck.passRate >= 0.85, `pass rate ${scanCheck.passRate}`);
});
