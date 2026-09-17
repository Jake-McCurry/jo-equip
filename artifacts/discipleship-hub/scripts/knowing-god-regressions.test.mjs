import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { devotionalGuideCategories } from "../src/data/knowing-god/introduction/devotional-guide.ts";
import { devotionalTopicKey, isDevotionalTopic } from "../src/components/knowing-god/devotional-topics.ts";
import {
  pushTopicHash,
  subscribeToTopicHistory,
  topicIdFromHash,
} from "../src/components/knowing-god/topic-history.mjs";

const dataDirectory = new URL("../public/knowing-god/data/", import.meta.url);

test("devotional selection includes exactly the guide's unique topics", async () => {
  const { topics } = JSON.parse(await readFile(new URL("index.json", dataDirectory), "utf8"));
  const expected = new Set(devotionalGuideCategories.flatMap(category =>
    category.entries.map(entry => devotionalTopicKey(entry.topic))));
  const selected = topics.filter(isDevotionalTopic);
  assert.deepEqual(new Set(selected.map(topic => devotionalTopicKey(topic.title))), expected);
  assert.equal(selected.length, expected.size, "Each guide topic resolves to exactly one index topic");
  for (const id of ["joy", "nonimpossibilitation-of-the-lord", "i-am-declarations"]) {
    assert.ok(selected.some(topic => topic.id === id), `Typography variant ${id} must match`);
  }
  assert.equal(isDevotionalTopic({ title: "Not a source topic" }), false);
  assert.ok(topics.length > selected.length);
});

const loadTopic = async id => {
  const index = JSON.parse(await readFile(new URL("index.json", dataDirectory), "utf8"));
  const item = index.topics.find(topic => topic.id === id);
  assert.ok(item, `Missing topic ${id}`);
  const payload = JSON.parse(await readFile(new URL(item.payload, dataDirectory), "utf8"));
  const topic = payload.topics.find(candidate => candidate.id === id);
  assert.ok(topic, `Missing ${id} from ${item.payload}`);
  return topic;
};

const findRelated = (topic, sourceLabel) => {
  const related = topic.seeAlso.find(item => item.sourceLabel === sourceLabel);
  assert.ok(related, `Missing related label ${sourceLabel}`);
  return related;
};

test("reviewed chapter-end errata match the printed quotations in both translations", async () => {
  const netDirectory = new URL("../public/knowing-god/net/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", netDirectory), "utf8"));
  for (const [id, original, corrected, markers, ending] of [
    ["prospering", "Daniel 6:25-29", "Daniel 6:25-28", [26, 27, 28], "in the reign of Cyrus the Persian."],
    ["overwhelming", "Mark 4:35-43", "Mark 4:35-41", [36, 37, 38, 39, 40, 41], "even the wind and the sea obey him?"],
    ["listening", "Mark 4:21-24, 35-43", "Mark 4:21-24, 35-41", [22, 23, 24, 35, 36, 37, 38, 39, 40, 41], "even the wind and the sea obey him?"],
  ]) {
    const topic = await loadTopic(id);
    assert.ok(!topic.passages.some(passage => passage.reference === original));
    const passage = topic.passages.find(passage => passage.reference === corrected);
    assert.ok(passage);
    assert.deepEqual([...passage.text.matchAll(/\b\d+\b/g)].map(match => Number(match[0])), markers);
    assert.ok(passage.text.endsWith(ending));
    assert.equal(manifest.passages[original], undefined);
    assert.equal(manifest.notes[original], undefined);
    assert.equal(manifest.notes[corrected], undefined);
    const net = JSON.parse(await readFile(new URL(manifest.passages[corrected], netDirectory), "utf8"));
    assert.ok(net[corrected].trim());
  }
});

test("Abstinence matches the printed See FASTING; SOBRIETY; TEMPERANCE entry", async () => {
  const topic = await loadTopic("abstinence");
  assert.equal(topic.passages.length, 0);
  assert.deepEqual(topic.seeAlso, [
    { sourceLabel: "FASTING", targetIds: ["fasting"] },
    { sourceLabel: "SOBRIETY", targetIds: ["sobriety"] },
    { sourceLabel: "TEMPERANCE", targetIds: ["temperance"] },
  ]);
});

test("every zero-passage topic has resolvable source cross-references", async () => {
  const index = JSON.parse(await readFile(new URL("index.json", dataDirectory), "utf8"));
  const ids = new Set(index.topics.map(topic => topic.id));
  const files = new Set(index.topics.map(topic => topic.payload));
  let checked = 0;
  for (const file of files) {
    const { topics } = JSON.parse(await readFile(new URL(file, dataDirectory), "utf8"));
    for (const topic of topics.filter(topic => topic.passages.length === 0)) {
      checked++;
      assert.ok(topic.seeAlso.length > 0, `${topic.id} has no source links`);
      for (const related of topic.seeAlso) {
        assert.ok(related.sourceLabel && related.targetIds.length, topic.id);
        for (const id of related.targetIds) assert.ok(id === "*" || ids.has(id), `${topic.id} links to missing ${id}`);
      }
    }
  }
  assert.ok(checked > 0);
});

test("zero-passage links appear in the reader and topic navigation stays shared", async () => {
  const reader = await readFile(new URL("../src/components/knowing-god/ConcordancePrototype.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../src/pages/knowing-god.astro", import.meta.url), "utf8");
  assert.match(reader, /selected\.passages\.length > 0 \? <>/);
  assert.match(reader, /<TopicCrossReferences onNavigate=\{followCrossReference\} related=\{selected\.seeAlso\}/);
  assert.doesNotMatch(reader, /view === "topic" && <header/);
  assert.doesNotMatch(reader, /view === "start" && <div className="kg-no-print/);
  assert.match(page, /<EquipHeader \/>/);
  assert.doesNotMatch(page, /html\[data-knowing-god-view="topic"\]/);
});

const findAdditional = (topic, sourceLabel) => {
  const link = topic.additionalScripture
    .flatMap(section => section.links)
    .find(item => item.sourceLabel === sourceLabel);
  assert.ok(link, `Missing Additional Scripture label ${sourceLabel}`);
  return link;
};

test("compound related-topic labels retain their label and resolve every destination", async () => {
  const topic = await loadTopic("indignation");
  assert.deepEqual(
    findRelated(topic, "ANGER, DAY, AND DISPLEASURE . . . OF THE LORD").targetIds,
    ["anger-of-the-lord", "day-of-the-lord", "displeasure-of-the-lord"],
  );
});

test("a preserved printed typo resolves to its canonical topic", async () => {
  const topic = await loadTopic("pleasure-of-the-lord");
  assert.deepEqual(findRelated(topic, "BLESSEDNESSs").targetIds, ["blessedness"]);
});

test("browser Back restores the previous topic hash", () => {
  class Browser extends EventTarget {
    location = { hash: "#topic=abiding" };
    entries = [this.location.hash];
    history = {
      pushState: (_state, _unused, hash) => {
        this.location.hash = hash;
        this.entries.push(hash);
      },
      back: () => {
        this.entries.pop();
        this.location.hash = this.entries.at(-1);
        this.dispatchEvent(new Event("popstate"));
      },
    };
  }

  const browser = new Browser();
  const restored = [];
  const unsubscribe = subscribeToTopicHistory(browser, () => {
    restored.push(topicIdFromHash(browser.location.hash));
  });

  pushTopicHash(browser, "anger-of-the-lord");
  pushTopicHash(browser, "day-of-the-lord");
  browser.history.back();

  assert.deepEqual(restored, ["anger-of-the-lord"]);
  unsubscribe();
});

test("Additional Scripture inherits the most recent explicit book", async () => {
  const topic = await loadTopic("prayer-life-of-christ");
  assert.deepEqual(findAdditional(topic, "19:13-15").queries, ["Matthew 19:13-15"]);
  assert.deepEqual(findAdditional(topic, "24:30-31, 50-53").queries, ["Luke 24:30-31, 50-53"]);
  assert.deepEqual(findAdditional(topic, "9:24.").queries, ["Hebrews 9:24"]);
});

test("documented printed citation corrections link to canonical passages", async () => {
  const cases = [
    ["cutting-off", "1 Chronicles 32:21", ["2 Chronicles 32:21"]],
    ["joy", "1 Thessalonians 1:16", ["1 Thessalonians 1:6"]],
    ["strengthening", "1 Peter 14:11", ["1 Peter 4:11"]],
  ];
  for (const [topicId, sourceLabel, queries] of cases) {
    assert.deepEqual(findAdditional(await loadTopic(topicId), sourceLabel).queries, queries);
  }
});

test("Prayer Life of Christ keeps 44 passages and three citation-only supplements", async () => {
  const topic = await loadTopic("prayer-life-of-christ");
  assert.equal(topic.passages.length, 44);
  assert.equal(topic.additionalScripture.length, 3);
  assert.ok(topic.additionalScripture.every(section => section.links.length > 0));
  assert.ok(topic.additionalScripture.every(section =>
    section.links.every(link => link.queries.length > 0),
  ));
});