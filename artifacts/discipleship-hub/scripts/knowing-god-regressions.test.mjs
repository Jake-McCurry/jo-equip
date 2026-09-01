import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  pushTopicHash,
  subscribeToTopicHistory,
  topicIdFromHash,
} from "../src/components/knowing-god/topic-history.mjs";

const dataDirectory = new URL("../public/knowing-god/data/", import.meta.url);

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