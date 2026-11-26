// Build-time validation of the generated Bible Atlas (scripts/generate-bible-atlas.mjs).
// Runs offline against committed files.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { validRange } from "./lib/scripture-refs.mjs";
import { ATLAS } from "./data/bible-atlas-maps.mjs";

const root = new URL("../", import.meta.url);
const atlas = JSON.parse(fs.readFileSync(new URL("src/data/bible-atlas/atlas.json", root), "utf8"));
const places = new Set(JSON.parse(fs.readFileSync(new URL("src/data/bible-maps/places.json", root), "utf8")).map(p => p.slug));
const dir = new URL("public/bible-data/atlas/", root);

test("every map definition was rendered, in order, with unique URL-safe slugs", () => {
  assert.deepEqual(atlas.map(m => m.slug), ATLAS.map(m => m.slug));
  assert.equal(new Set(atlas.map(m => m.slug)).size, atlas.length);
  for (const m of atlas) {
    assert.match(m.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(m.title && m.period && m.summary && m.notes, m.slug);
  }
});

test("image files exist, match their content hash, and nothing stale is left", () => {
  const expected = new Set();
  for (const m of atlas) for (const [key, name] of Object.entries(m.files)) {
    const hash = name.match(/\.([0-9a-f]{10})\.(webp|jpg)$/)?.[1];
    assert.ok(hash, `${m.slug} ${key}`);
    const body = fs.readFileSync(new URL(name, dir));
    assert.equal(createHash("sha256").update(body).digest("hex").slice(0, 10), hash, name);
    assert.ok(body.length < 900_000, `${name} is too large`);
    expected.add(name);
  }
  assert.deepEqual(new Set(fs.readdirSync(dir)), expected);
});

test("references are valid verse ranges and places link to real place pages", () => {
  const ok = r => (r.length === 1 ? validRange(r[0]) : validRange(r[0], r[1]));
  for (const m of atlas) {
    assert.ok(ok(m.passage), `${m.slug} passage`);
    for (const p of m.places) assert.ok(places.has(p.slug), `${m.slug}: ${p.slug}`);
    for (const r of m.routes) {
      assert.match(r.color, /^#[0-9a-f]{6}$/);
      assert.ok(r.stops.length >= 2, `${m.slug}: ${r.name}`);
      for (const s of r.stops) {
        assert.ok(places.has(s.slug), `${m.slug}: ${s.slug}`);
        if (s.ref) assert.ok(ok(s.ref), `${m.slug}: ${s.slug} ref`);
      }
    }
  }
});
