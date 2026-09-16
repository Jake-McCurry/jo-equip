import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import { formatNetPassage, formatSourcePassage, netPassageQuery, passageRanges } from "../src/components/knowing-god/passage-format.ts";

const reference = "Psalm 103:1-5, 11-14";
const verses = [1, 2, 3, 4, 5, 11, 12, 13, 14];
const rows = verses.map(verse => ({
  bookname: "Psalms", chapter: "103", verse: String(verse), text: `Verse ${verse} text.`,
}));

test("NET queries repeat the book and chapter for each range", () => {
  assert.equal(netPassageQuery(reference), "Psalm 103:1-5; Psalm 103:11-14");
  assert.equal(netPassageQuery("Philemon 1, 10-12, 17-20"), "Philemon 1:1; Philemon 1:10-12; Philemon 1:17-20");
  assert.equal(netPassageQuery("John 3:16"), "John 3:16");
});

test("NET separates disjoint ranges and retains verse 11's number", () => {
  const text = formatNetPassage(reference, rows);
  assert.match(text, /5 Verse 5 text\.\n\n11 Verse 11 text\./);
  assert.equal(text, formatNetPassage(reference, [...rows].reverse()));
});

test("NET rejects wrong chapters, missing verses, duplicate verses and empty responses", () => {
  assert.throws(() => formatNetPassage(reference, rows.map(row => row.verse === "11" ? { ...row, chapter: "11" } : row)));
  assert.throws(() => formatNetPassage(reference, rows.slice(1)));
  assert.throws(() => formatNetPassage(reference, [...rows.slice(0, -1), rows[0]]));
  assert.throws(() => formatNetPassage(reference, []));
});

test("source KJV paragraph breaks preserve every word", () => {
  const text = "Bless the LORD. 2 Bless him. 3 Forgiven. 4 Redeemed. 5 Renewed. 11 For as the heaven is high. 12 As far as the east.";
  assert.equal(formatSourcePassage(reference, text), text.replace(" 11 For", "\n\n11 For"));
  assert.equal(formatSourcePassage("Psalm 103:1-5", text), text);
});

test("all source references retain their wording and every split range gets a paragraph in both translations", () => {
  const dir = new URL("../public/knowing-god/data/", import.meta.url);
  for (const file of readdirSync(dir).filter(file => /^topics-.*\.json$/.test(file))) {
    const { topics } = JSON.parse(readFileSync(new URL(file, dir), "utf8"));
    for (const topic of topics) for (const passage of topic.passages) {
      const ranges = passageRanges(passage.reference);
      const formatted = formatSourcePassage(passage.reference, passage.text);
      assert.ok(ranges.length > 0, passage.reference);
      assert.equal(
        formatted.replace(/\s+/g, ""),
        passage.text.replace(/\s+/g, ""),
        `${topic.title}: ${passage.reference}`,
      );
      if (ranges.length > 1) {
        assert.equal(formatted.split("\n\n").length, ranges.length, `KJV breaks: ${topic.title}: ${passage.reference}`);
        const response = ranges.flatMap(range => Array.from(
          { length: range.end - range.start + 1 },
          (_, i) => ({ bookname: range.book, chapter: range.chapter, verse: range.start + i, text: "Verse text." }),
        ));
        assert.equal(formatNetPassage(passage.reference, response).split("\n\n").length, ranges.length, `NET breaks: ${passage.reference}`);
      }
    }
  }
});