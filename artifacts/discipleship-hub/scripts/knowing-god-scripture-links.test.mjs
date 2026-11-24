import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { scriptureReaderPath } from "../src/components/knowing-god/scripture-link.ts";

test("all concordance passages and additional references open a valid Bible chapter", () => {
  const dir = new URL("../public/knowing-god/data/", import.meta.url);
  for (const file of fs.readdirSync(dir).filter(f => /^topics-.*\.json$/.test(f))) {
    for (const topic of JSON.parse(fs.readFileSync(new URL(file, dir), "utf8")).topics) {
      const references = [
        ...topic.passages.map(p => p.reference),
        ...topic.additionalScripture.flatMap(s => s.links.flatMap(l => l.queries)),
      ];
      for (const reference of references) {
        for (const translation of ["NET", "KJV"]) {
          const url = new URL(scriptureReaderPath(reference, translation), "https://example.org");
          assert.equal(url.pathname, "/bible");
          assert.equal(url.searchParams.get("translation"), translation.toLowerCase());
          assert.ok(Number(url.searchParams.get("chapter")) >= 1);
          const explicitVerse = reference.match(/:\s*(\d+)/)?.[1];
          if (explicitVerse) assert.equal(url.searchParams.get("verse"), explicitVerse, reference);
        }
      }
    }
  }
});

test("aliases, ranges and single-chapter books resolve correctly", () => {
  for (const [ref, book, chapter, verse] of [
    ["Psalm 91:1-2", "Psalms", "91", "1"],
    ["Jude 20-21", "Jude", "1", "20"],
    ["Jude 1:20-21", "Jude", "1", "20"],
    ["Genesis 1-4", "Genesis", "1", null],
    ["John 3:16-4:2", "John", "3", "16"],
    ["II Chronicles 25:27-28", "2 Chronicles", "25", "27"],
    ["Kings 8:1-6", "1 Kings", "8", "1"],
    ["Kings 1:5-6", "1 Kings", "1", "5"],
  ]) {
    const q = new URL(scriptureReaderPath(ref, "NET"), "https://example.org").searchParams;
    assert.equal(q.get("book"), book);
    assert.equal(q.get("chapter"), chapter);
    assert.equal(q.get("verse"), verse);
  }
});
