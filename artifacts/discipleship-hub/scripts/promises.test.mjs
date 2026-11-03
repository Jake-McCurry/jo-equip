import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  validateBook, splitPassage, passageCopyText, bibleHref,
  viewToHash, hashToView, parseSaved, toggleSaved, unwrap,
} from "../src/components/promises/promise-utils.ts";

const bytes = readFileSync(new URL("../public/promises/book.json", import.meta.url));
const book = validateBook(JSON.parse(bytes));
const topics = book.groups.flatMap(g => g.topics);
const blocks = [...book.introduction, ...book.groups.flatMap(g => [
  ...g.preamble, ...g.topics.flatMap(t => t.blocks),
])];
const passages = blocks.filter(b => b.kind === "passage");
const tight = s => s.replace(/\s/g, "");

test("local corpus is byte-for-byte identical to the supplied dataset", () => {
  assert.equal(createHash("sha256").update(bytes).digest("hex"),
    "f2356cc4c45f240a455e063f8b7a2be263707f9179223cb75ced9116c00e7383");
  assert.deepEqual(book.groups.map(g => [g.id, g.topics.length]), [
    ["situation", 21], ["feelings", 13], ["relationships", 2],
    ["identity", 18], ["future", 13], ["character", 18],
  ]);
  assert.equal(topics.length, 85);
  assert.equal(topics.flatMap(t => t.blocks).filter(b => b.kind === "passage").length, 568);
  assert.equal(new Set(topics.map(t => t.id)).size, 85);
  assert.match(book.sourceTitle, /God’s Promises for a New Year/);
  assert.ok(!bytes.toString().includes(["follow", "jesusonline", "com"].join(".")));
});

test("every rendered quotation and citation preserves all non-whitespace source characters", () => {
  for (const b of passages) {
    const result = splitPassage(b);
    assert.ok(result.citationPrinted, b.reference);
    const citation = `—${b.reference}${result.translationPrinted ? `, ${b.translation}` : ""}`;
    assert.equal(tight(result.quote + citation), tight(b.text), b.reference);
    const copied = passageCopyText(b);
    assert.equal(copied.split(b.reference).length - 1, 1, b.reference);
    assert.ok(copied.includes(b.translation), b.reference);
    assert.equal(tight(copied), tight(unwrap(b.text) + (result.translationPrinted ? "" : `, ${b.translation}`)));
  }
});

test("all introduction and topic Scripture references link locally to the exact first verse", () => {
  for (const b of passages) {
    const raw = b.bibleReference || b.reference;
    const [, , chapter, verse] = raw.match(/^(.+?)\s+(\d+)\s*:\s*(\d+)/);
    const href = bibleHref("/test-prefix/", b);
    assert.ok(href?.startsWith("/test-prefix/bible?"), raw);
    const u = new URL(href, "https://test.invalid");
    assert.equal(u.searchParams.get("chapter"), chapter, raw);
    assert.equal(u.searchParams.get("verse"), verse, raw);
    assert.equal(u.searchParams.get("translation"), "net");
  }
  const corrected = passages.find(b => b.bibleReference);
  assert.equal(corrected.reference, "Corinthians 2:12");
  assert.equal(new URL(bibleHref("", corrected), "https://test.invalid").searchParams.get("book"), "1 Corinthians");
  assert.ok(corrected.referenceNote);
});

test("stable topic and group hashes round-trip, with safe handling of malformed URLs", () => {
  const views = [
    { kind: "intro" }, { kind: "saved" }, { kind: "copyright" },
    ...topics.map(t => ({ kind: "topic", topicId: t.id })),
    ...book.groups.map(g => ({ kind: "group", groupId: g.id })),
  ];
  for (const v of views) assert.deepEqual(hashToView(viewToHash(v), book), v);
  for (const hash of ["#topic=%E0%A4%A", "#topic=missing", "#group=missing", ""])
    assert.deepEqual(hashToView(hash, book), { kind: "intro" });
});

test("saved-study parsing and toggling support repeatable save and unsave", () => {
  assert.deepEqual(parseSaved(null), []);
  assert.deepEqual(parseSaved("{broken"), []);
  assert.deepEqual(parseSaved('["a","a",42,"b"]'), ["a", "b"]);
  const saved = toggleSaved([], topics[0].id);
  assert.deepEqual(parseSaved(JSON.stringify(saved)), saved);
  assert.deepEqual(toggleSaved(saved, topics[0].id), []);
});

test("invalid local content is rejected rather than rendered as empty success", () => {
  for (const bad of [null, {}, { ...book, groups: [] }, { ...book, introduction: [null] }])
    assert.throws(() => validateBook(bad), /malformed/);
});
