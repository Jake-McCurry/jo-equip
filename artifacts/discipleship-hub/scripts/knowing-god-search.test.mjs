import assert from "node:assert/strict";
import test from "node:test";
import { findTopicResults, findScriptureResults } from "../src/components/knowing-god/search-results.ts";

const topics = [
  { id: "love", title: "Love", letter: "L", passageCount: 1, passages: [{ reference: "John 3:16", text: "For God so loved the world." }] },
  { id: "joy", title: "Joy", letter: "J", passageCount: 2, passages: [{ reference: "John 3:16", text: "For God so loved the world." }, { reference: "Psalm 1:1", text: "Blessed is the man." }] },
];
test("topic results match titles, not verse text", () => {
  assert.deepEqual(findTopicResults(topics, "love").map(t => t.id), ["love"]);
  assert.deepEqual(findTopicResults(topics, "world"), []);
});
test("Scripture results match words and deduplicate passages across topics", () => {
  assert.equal(findScriptureResults(topics, "world").length, 1);
  assert.equal(findScriptureResults(topics, "love").length, 0);
  assert.equal(findScriptureResults(topics, "LOVED").length, 1);
});
test("search accepts phrases and treats punctuation literally", () => {
  assert.equal(findScriptureResults(topics, "God so loved").length, 1);
  assert.equal(findScriptureResults(topics, "[world]").length, 0);
  assert.deepEqual(findScriptureResults(topics, " "), []);
});

test("passage filters restrict Scripture matches using canonical book names and testament", () => {
  const refs = ["Genesis 1:1", "Psalm 1:1", "II Chronicles 25:27", "John 3:16", "1 John 3:16", "Jude 20"];
  const input = [{ ...topics[0], passages: refs.map(reference => ({ reference, text: "God is faithful." })) }];
  const results = filters => findScriptureResults(input, "God", filters).map(p => p.reference);
  assert.deepEqual(results({ testament: "Old Testament" }), ["Genesis 1:1", "II Chronicles 25:27", "Psalm 1:1"]);
  assert.deepEqual(results({ testament: "New Testament" }), refs.slice(3));
  assert.deepEqual(results({ book: "Psalms" }), ["Psalm 1:1"]);
  assert.deepEqual(results({ book: "2 Chronicles" }), ["II Chronicles 25:27"]);
  assert.deepEqual(results({ book: "John" }), ["John 3:16"]);
  assert.deepEqual(results({ book: "John", testament: "Old Testament" }), []);
  assert.equal(results({ book: "All books", testament: "All Testaments" }).length, 6);
  assert.equal(findTopicResults(input, "love").length, 1);
});

test("Scripture results follow Bible book, numeric chapter and starting verse order", () => {
  const references = [
    "Revelation 1:1", "John 10:2", "Jude 20-21", "John 3:16",
    "Psalm 91:1-2", "Genesis 2:1", "John 3:9-4:2", "II Chronicles 25:27-28",
    "1 Corinthians 1:2", "Genesis 1:10", "John 3:2", "Jude 1:3", "Unknown 1:1",
  ];
  const input = references.map((reference, i) => ({
    id: String(i), title: `Topic ${i}`, letter: "T", passageCount: 1,
    passages: [{ reference, text: "God is faithful." }],
  }));
  const expected = [
    "Genesis 1:10", "Genesis 2:1", "II Chronicles 25:27-28", "Psalm 91:1-2",
    "John 3:2", "John 3:9-4:2", "John 3:16", "John 10:2",
    "1 Corinthians 1:2", "Jude 1:3", "Jude 20-21", "Revelation 1:1", "Unknown 1:1",
  ];
  assert.deepEqual(findScriptureResults(input, "God").map(p => p.reference), expected);
  assert.deepEqual(findScriptureResults([...input].reverse(), "God").map(p => p.reference), expected,
    "order is independent of the order topic payloads finish loading");
  assert.deepEqual(input.map(t => t.passages[0].reference), references, "source order is not mutated");
});
