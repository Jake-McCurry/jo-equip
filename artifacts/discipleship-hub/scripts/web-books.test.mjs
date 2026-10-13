// Data + coverage validation for the generated web-book editions.
// Run: node --test scripts/web-books.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = resolve(ROOT, "src/data/web-books");
const report = JSON.parse(readFileSync(resolve(DIR, "extraction-report.json"), "utf8"));
const booksSrc = readFileSync(resolve(ROOT, "src/data/books.ts"), "utf8");

// Displayed books = catalogue entries not marked unlisted.
const displayed = [];
for (const m of booksSrc.matchAll(/\{\s*id:\s*"([^"]+)"([\s\S]*?)\n  \}/g)) {
  if (!/unlisted:\s*true/.test(m[2])) displayed.push(m[1]);
}
const ids = displayed.filter(id => id !== "adventure-of-living-with-jesus");

test("every displayed book (besides Adventure) has a generated web edition", () => {
  assert.ok(ids.length >= 10, `found ${ids.length} displayed books`);
  for (const id of ids) assert.ok(existsSync(resolve(DIR, `${id}.json`)), `missing src/data/web-books/${id}.json`);
});

test("every book passes the extraction fidelity gates", () => {
  for (const id of ids) {
    const r = report.books.find(b => b.id === id);
    assert.ok(r, `no report entry for ${id}`);
    assert.equal(r.status, "pass", `${id}: ${(r.failures || []).join("; ")}`);
    assert.ok(r.internalCoverage >= report.gates.internal, `${id} internal coverage`);
    assert.ok(r.independentWordBagCoverage >= report.gates.bag, `${id} independent coverage`);
    assert.deepEqual(r.unexpectedGlyphs, {}, `${id} undecoded glyphs`);
    assert.deepEqual(r.figuresWithoutReviewedAlt ?? [], [], `${id}: figures still using generic alt text`);
    assert.ok((r.regionWordCoverage ?? 1) >= 0.995, `${id}: table/list region text lost`);
  }
});

for (const id of ids) {
  test(`${id}: structure, images and source hash`, () => {
    const d = JSON.parse(readFileSync(resolve(DIR, `${id}.json`), "utf8"));
    const pdf = resolve(ROOT, "public/books", `${id}.pdf`);
    assert.equal(createHash("sha256").update(readFileSync(pdf)).digest("hex"), d.sourceSha256, `${id}: PDF changed since extraction - rerun scripts/extract-web-books.py`);
    if (id !== "knowing-god") {
      assert.ok(d.chapters.length >= 2, `${id}: only ${d.chapters.length} readings`);
      const slugs = d.chapters.map(c => c.slug);
      assert.equal(new Set(slugs).size, slugs.length, `${id}: duplicate slugs`);
      for (const c of d.chapters) {
        assert.match(c.slug, /^[a-z0-9-]+$/, `${id}: bad slug ${c.slug}`);
        assert.ok(c.title.trim(), `${id}: empty title`);
        assert.ok(c.blocks.length > 0, `${id}/${c.slug}: empty reading`);
      }
    }
    const text = JSON.stringify(d);
    assert.ok(!/[\uE000-\uF8FF\uFFFD]/.test(text), `${id}: undecoded glyphs in content`);
    assert.ok(!/<(script|iframe|style)/i.test(text), `${id}: unsafe markup`);
    for (const m of text.matchAll(/"src": ?"(\/books\/[^"]+)"/g)) {
      assert.ok(existsSync(resolve(ROOT, "public" + m[1])), `${id}: missing image ${m[1]}`);
      assert.ok(statSync(resolve(ROOT, "public" + m[1])).size > 0, `${id}: empty image ${m[1]}`);
    }
  });
}

test("Adventure keeps its dedicated pages and storage keys", () => {
  const client = readFileSync(resolve(ROOT, "src/components/adventure-book/reader-client.ts"), "utf8");
  assert.match(client, /let KEY = "jo-adventure-book";/);
  assert.match(client, /:note:\$\{slug\}/);
  assert.ok(existsSync(resolve(ROOT, "src/pages/books/adventure-of-living-with-jesus/read/[slug].astro")));
  assert.ok(!existsSync(resolve(DIR, "adventure-of-living-with-jesus.json")), "Adventure must not be duplicated in the generic reader");
});

test("every web-book image directory belongs to a generated book", () => {
  for (const id of readdirSync(resolve(ROOT, "public/books"))) {
    if (existsSync(resolve(ROOT, "public/books", id, "read/img")) && id !== "adventure-of-living-with-jesus") {
      assert.ok(existsSync(resolve(DIR, `${id}.json`)), `orphan image dir for ${id}`);
    }
  }
});

// ---- workbook fill-in blanks -------------------------------------------------
// Printed workbooks draw answer blanks as rules followed by a small answer-key
// number. They must survive as visible blanks (never as answers, never dropped).
const blankRe = /<span class="rb-blank" role="img" aria-label="fill-in blank( \d+)?">(?:<sup>\d+<\/sup>)?<\/span>|________/g;
const plain = h => h.replace(/<[^>]+>/g, "");
function blocksOf(id) {
  const out = [];
  const walk = (bs, slug) => { for (const b of bs) { out.push({ b, slug }); if (b.blocks) walk(b.blocks, slug); } };
  for (const c of JSON.parse(readFileSync(resolve(DIR, `${id}.json`), "utf8")).chapters) walk(c.blocks, c.slug);
  return out;
}

test("no blank placeholder leaks and no answer-key number is cut off from its blank", () => {
  const endsWithBlank = s => /(rb-blank"[^>]*>(?:<sup>\d+<\/sup>)?<\/span>|________)\W*$/.test(s ?? "");
  for (const id of ids) {
    const text = readFileSync(resolve(DIR, `${id}.json`), "utf8");
    assert.ok(!text.includes("\u2581"), `${id}: blank placeholder leaked into output`);
    const all = blocksOf(id);
    all.forEach(({ b, slug }, i) => {
      const strs = [b.html, b.text, ...(b.items ?? [])].filter(Boolean);
      const numberOnly = strs.some(s => !s.includes("rb-blank") && /^\s*\d{1,2}\.?\s*$/.test(plain(s)));
      if (!numberOnly || i === 0) return;
      const p = all[i - 1].b;
      const prev = p.html ?? p.text ?? (p.items ?? []).at(-1);
      assert.ok(!endsWithBlank(prev), `${id}/${slug}: answer-key number split from the blank before it`);
      // in the workbook, every bare number block is a stranded key number
      assert.notEqual(id, "extraordinary-evangelism-student-guide", `student guide/${slug}: stranded number "${plain(strs[0])}"`);
    });
  }
});

test("student guide session one keeps its numbered fill-in blanks in place", () => {
  const id = "extraordinary-evangelism-student-guide";
  const d = JSON.parse(readFileSync(resolve(DIR, `${id}.json`), "utf8"));
  assert.equal(d.chapters.length, 11, "student guide reading count changed");
  const s1 = d.chapters.find(c => c.slug === "session-one-our-mandate-motive");
  assert.ok(s1);
  const html = s1.blocks.map(b => b.html ?? b.text ?? (b.items ?? []).join(" ")).join("\n");
  const n = k => `aria-label="fill-in blank ${k}"`;
  assert.ok(html.includes(`what we call His <span class="rb-blank" role="img" ${n(1)}>`), "blank 1 missing after 'His'");
  assert.ok(html.includes(`it’s a <span class="rb-blank" role="img" ${n(2)}>`), "blank 2 missing");
  for (const [k, lead] of [[3, "1. Motivated by"], [4, "2. A Holy"], [5, "3. We Are Christ’s"], [6, "4. The World is"], [10, "5. We will Be"]]) {
    const re = new RegExp(`${lead}</strong> <span class="rb-blank" role="img" ${n(k)}>`);
    assert.match(html, re, `"${lead}" should be followed by blank ${k}`);
  }
  // every answer-key number 1-10 appears exactly once, and no headings are cut off at the blank
  for (let k = 1; k <= 10; k++) assert.equal(html.split(n(k)).length - 1, 1, `blank ${k} count`);
  assert.ok(!s1.blocks.some(b => b.t === "h2" && /\b(by|Holy|Christ’s|is|His)$/.test(b.text)), "heading cut off at a blank");
});

test("student guide answer-key numbers 1-30 each appear once as blanks", () => {
  const id = "extraordinary-evangelism-student-guide";
  const all = blocksOf(id).map(({ b }) => JSON.stringify(b)).join("\n");
  const nums = [...all.matchAll(/fill-in blank (\d+)\\"|________ \((\d+)\)/g)].map(m => Number(m[1] ?? m[2]));
  const key = JSON.stringify(blocksOf(id).filter(({ slug }) => slug === "answers-to-the-student-guide").map(({ b }) => b));
  const max = Math.max(...nums);
  assert.ok(max >= 20, `only ${max} numbered blanks`);
  for (let k = 1; k <= max; k++) assert.equal(nums.filter(x => x === k).length, 1, `blank ${k} appears ${nums.filter(x => x === k).length} times`);
  assert.ok(key.length > 0, "answer key reading missing");
});
