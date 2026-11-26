// Build-time validation of the generated Bible maps and timeline data
// (scripts/generate-bible-maps.mjs). Runs offline against committed files.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { CHAPTER_VERSES } from "../worker/bible-catalog.js";
import { BOOKS, validRange } from "./lib/scripture-refs.mjs";

const root = new URL("../", import.meta.url);
const read = p => fs.readFileSync(new URL(p, root), "utf8");
const manifest = JSON.parse(read("src/data/bible-maps/manifest.json"));
const places = JSON.parse(read("src/data/bible-maps/places.json"));
const timeline = JSON.parse(read("src/data/bible-maps/timeline.json"));
const file = (name, ext) => `public/bible-data/maps/${name}.${manifest.files[name]}.${ext}`;
const index = JSON.parse(read(file("places", "json")));
const chapters = JSON.parse(read(file("chapters", "json")));
const { projection: P } = manifest;
const COS = Math.cos((32 * Math.PI) / 180);
const project = (lon, lat) => [(lon - P.lonMin) * 10 * COS, (P.latMax - lat) * 10];

test("hashed files exist, match their content hash, and nothing stale is left", () => {
  const expected = new Set();
  for (const [name, ext] of [["places", "json"], ["chapters", "json"], ["basemap", "svg"], ["events", "json"]]) {
    const body = fs.readFileSync(new URL(file(name, ext), root));
    assert.equal(createHash("sha256").update(body).digest("hex").slice(0, 10), manifest.files[name], name);
    expected.add(`${name}.${manifest.files[name]}.${ext}`);
  }
  assert.deepEqual(new Set(fs.readdirSync(new URL("public/bible-data/maps/", root))), expected);
  assert.ok(manifest.sources.length >= 8 && manifest.sources.every(s => /^[0-9a-f]{64}$/.test(s.sha256)), "pinned source digests");
});

test("places: unique URL-safe slugs, sane scores, coordinates inside the map", () => {
  assert.ok(places.length > 1200);
  assert.equal(new Set(places.map(p => p.slug)).size, places.length);
  for (const p of places) {
    assert.match(p.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, p.slug);
    assert.ok(p.name && p.label && p.verses.length, p.slug);
    assert.ok(p.score >= 0 && p.score <= 1000, p.slug);
    if (p.lon !== null) assert.ok(p.lon >= P.lonMin && p.lon <= P.lonMax && p.lat >= P.latMin && p.lat <= P.latMax, p.slug);
    else assert.equal(p.lat, null);
  }
  const located = places.filter(p => p.lon !== null).length;
  assert.ok(located / places.length > 0.95, `${located} located`);
});

test("well-known places sit where they should with honest confidence", () => {
  const by = slug => places.find(p => p.slug === slug);
  const jer = by("jerusalem");
  assert.ok(Math.abs(jer.lon - 35.23) < 0.05 && Math.abs(jer.lat - 31.78) < 0.05);
  assert.equal(jer.score, 1000);
  assert.ok(jer.verses.length > 700);
  const emmaus = by("emmaus");
  assert.ok(emmaus.score < 700 && emmaus.alts.length >= 2, "Emmaus is disputed and keeps its alternatives");
  assert.ok(by("nazareth").score >= 700);
});

test("every place verse is a real KJV verse and the chapter index round-trips", () => {
  const fromIndex = new Map();
  for (const [key, rows] of Object.entries(chapters)) {
    const [, book, c] = /^(.+) (\d+)$/.exec(key);
    assert.ok(CHAPTER_VERSES[book], key);
    for (const [i, vs] of rows) {
      assert.ok(index[i], key);
      for (const v of vs) {
        assert.ok(v >= 1 && v <= CHAPTER_VERSES[book][Number(c) - 1], `${key}:${v}`);
        const code = (BOOKS.indexOf(book) + 1) * 1e6 + Number(c) * 1000 + v;
        fromIndex.set(i, [...(fromIndex.get(i) ?? []), code]);
      }
    }
  }
  places.forEach((p, i) => {
    for (const v of p.verses) assert.ok(validRange(v), `${p.slug} ${v}`);
    assert.deepEqual([...fromIndex.get(i)].sort((a, b) => a - b), p.verses, p.slug);
  });
  assert.ok(chapters["Genesis 12"].some(([i]) => index[i][0] === "bethel-1"), "Bethel in Genesis 12");
});

test("runtime place index mirrors the place data", () => {
  assert.equal(index.length, places.length);
  index.forEach(([slug, label, x, y, score, types, books], i) => {
    const p = places[i];
    assert.equal(slug, p.slug); assert.equal(label, p.label); assert.equal(score, p.score);
    assert.deepEqual(books, [...new Set(p.verses.map(v => Math.floor(v / 1e6)))]);
    assert.deepEqual(types.map(t => manifest.types[t]), p.types);
    if (p.lon === null) assert.equal(x, null);
    else {
      const [px, py] = project(p.lon, p.lat);
      assert.ok(Math.abs(px - x) < 0.01 && Math.abs(py - y) < 0.01, slug);
      assert.ok(x >= 0 && x <= P.width && y >= 0 && y <= P.height, slug);
    }
  });
});

test("Easton dictionary text keeps valid links and no leftover markup", () => {
  let links = 0;
  for (const p of places) for (const para of p.easton ?? []) for (const seg of para) {
    if (typeof seg === "string") assert.doesNotMatch(seg, /\]\(|<\/?[a-z]/i, p.slug);
    else { links++; assert.ok(validRange(seg[1], seg[2]), `${p.slug} ${seg}`); }
  }
  assert.ok(links > 2000);
});

test("timeline: ordered eras, every event linked to real passages", () => {
  const { eras, events } = timeline;
  assert.ok(events.length >= 450);
  assert.equal(new Set(events.map(e => e.id)).size, events.length);
  for (let i = 1; i < eras.length; i++) assert.ok(eras[i].start > eras[i - 1].start);
  const slugs = new Set(places.map(p => p.slug));
  let prevEra = 0;
  for (const e of events) {
    assert.ok(e.era >= prevEra, `${e.title} is out of era order`); prevEra = e.era;
    assert.ok(e.verses.length > 0, e.title);
    for (const [from, to] of e.verses) assert.ok(validRange(from, to), `${e.title} ${from}-${to}`);
    for (const s of e.places) assert.ok(slugs.has(s), `${e.title} -> ${s}`);
    assert.ok(Number.isInteger(e.year) && e.year >= -4003 && e.year <= 100, e.title);
  }
  const creation = events[0];
  assert.equal(creation.title, "Creation of all things");
  assert.equal(creation.year, -4003, "traditional (Ussher) creation date, 4004 BC");
  assert.ok(events.some(e => e.title === "Birth of Jesus" && e.year === -3));
  for (const p of places) for (const id of p.events ?? []) assert.ok(events.some(e => e.id === id && e.places.includes(p.slug)));
});

test("reader timeline index mirrors the timeline, chapter by chapter", () => {
  const runtime = JSON.parse(read(file("events", "json")));
  const { events } = timeline;
  assert.deepEqual(runtime.events, events.map(e => [e.id, e.title, e.year, e.years, e.kind]));
  // Rebuild the chapter index from the timeline's own verse runs.
  const expected = {};
  events.forEach((e, i) => {
    const spans = new Map();
    for (const [from, to = from] of e.verses) for (let c = from; c <= to; c++) {
      const key = `${BOOKS[Math.floor(c / 1e6) - 1]} ${Math.floor(c / 1000) % 1000}`;
      const [lo, hi] = spans.get(key) ?? [c % 1000, c % 1000];
      spans.set(key, [Math.min(lo, c % 1000), Math.max(hi, c % 1000)]);
    }
    for (const [key, [lo, hi]] of spans) (expected[key] ??= []).push([i, lo, hi]);
  });
  assert.deepEqual(runtime.chapters, expected);
  for (const [key, rows] of Object.entries(runtime.chapters)) {
    const [, book, c] = /^(.+) (\d+)$/.exec(key);
    const max = CHAPTER_VERSES[book]?.[Number(c) - 1];
    assert.ok(max, key);
    let prev = -1;
    for (const [i, lo, hi] of rows) {
      assert.ok(i > prev, `${key} keeps timeline order`); prev = i;
      assert.ok(lo >= 1 && lo <= hi && hi <= max, `${key}:${lo}-${hi}`);
    }
  }
  assert.ok(runtime.chapters["Genesis 12"].some(([i]) => runtime.events[i][1] === "Abraham enters Canaan"));
  assert.ok(runtime.chapters["Genesis 1"].some(([i]) => runtime.events[i][0] === "e1"), "Creation in Genesis 1");
  assert.ok(runtime.chapters["Luke 2"].some(([i]) => runtime.events[i][1] === "Birth of Jesus"));
});

test("base map is a self-contained SVG in the shared projection", () => {
  const svg = read(file("basemap", "svg"));
  assert.match(svg, new RegExp(`^<svg [^>]*viewBox="0 0 ${Math.round(P.width * 100) / 100} ${Math.round(P.height * 100) / 100}"`));
  assert.doesNotMatch(svg, /https?:\/\/(?!www\.w3\.org)/, "no external references");
  assert.ok(svg.length < 200_000);
});

test("terrain images exist, match their hashes, and cover the map", () => {
  const terrain = JSON.parse(read("src/data/bible-maps/terrain.json"));
  const dir = "public/bible-data/maps-terrain/";
  assert.deepEqual(new Set(fs.readdirSync(new URL(dir, root))), new Set(terrain.tiers.map(t => t.file)), "no stale or missing images");
  for (const t of terrain.tiers) {
    const body = fs.readFileSync(new URL(dir + t.file, root));
    assert.equal(t.file, `terrain-${t.name}.${createHash("sha256").update(body).digest("hex").slice(0, 10)}.webp`);
    assert.equal(body.subarray(8, 12).toString("latin1"), "WEBP", t.file);
    assert.ok(body.length < 300_000, `${t.file} stays small`);
    assert.ok(t.x >= -0.01 && t.y >= -0.01 && t.x + t.width <= P.width + 0.01 && t.y + t.height <= P.height + 0.01, `${t.name} inside the map`);
  }
  const [world] = terrain.tiers;
  assert.ok(world.x <= 0.01 && world.y <= 0.01 && world.width >= P.width - 0.01 && world.height >= P.height - 0.01, "first tier covers the whole map");
  // Jerusalem must sit inside the detailed Holy Land image.
  const [jx, jy] = project(35.2298, 31.7767), hl = terrain.tiers.find(t => t.name === "holyland");
  assert.ok(jx > hl.x && jx < hl.x + hl.width && jy > hl.y && jy < hl.y + hl.height);
  assert.match(read("public/_headers"), /\/bible-data\/maps-terrain\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
});

test("sources are credited and hashed files are cached immutably", () => {
  const doc = read("scripts/data/bible-search-sources.md");
  for (const s of ["Bible-Geocoding-Data", "CC BY 4.0", "theographic-bible-metadata", "CC BY-SA 4.0", "Natural Earth", "Easton", "Terrain Tiles"]) assert.ok(doc.includes(s), s);
  assert.match(read("public/_headers"), /\/bible-data\/maps\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
  const credits = read("src/components/bible-maps/MapSources.astro");
  for (const s of ["openbible.info", "creativecommons.org/licenses/by/4.0", "creativecommons.org/licenses/by-sa/4.0", "naturalearthdata.com", "registry.opendata.aws/terrain-tiles"]) assert.ok(credits.includes(s), s);
});
