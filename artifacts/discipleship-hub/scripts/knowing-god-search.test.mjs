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
