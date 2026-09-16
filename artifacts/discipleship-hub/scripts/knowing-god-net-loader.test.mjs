import assert from "node:assert/strict";
import test from "node:test";
import { createNetLoader } from "../src/components/knowing-god/bible-api.ts";

const manifest = {
  schemaVersion: 1,
  passages: { "John 3:16": "john.123.json", "John 5:4": "john.123.json" },
  notes: { "John 5:4": "NET does not include this verse in its main text." },
};
const book = { "John 3:16": "For this is the way God loved the world...", "John 5:4": "" };
const json = data => new Response(JSON.stringify(data), { status: 200 });

test("loads only same-site assets, honors base paths, deduplicates books and reuses text", async () => {
  const urls = [];
  const loader = createNetLoader("/hub/", async url => {
    urls.push(url);
    return json(url.endsWith("manifest.json") ? manifest : book);
  });
  assert.equal(await loader.load(["John 3:16", "John 5:4", "John 3:16"]), true);
  assert.deepEqual(urls, ["/hub/knowing-god/net/manifest.json", "/hub/knowing-god/net/john.123.json"]);
  assert.equal(loader.cache.get("John 5:4"), "");
  assert.equal(loader.notes.get("John 5:4"), manifest.notes["John 5:4"]);
  assert.equal(await loader.load(["John 3:16"]), true);
  assert.equal(urls.length, 2);
});

test("a failed book is not cached and can be retried", async () => {
  let attempts = 0;
  const loader = createNetLoader("/", async url => {
    if (url.endsWith("manifest.json")) return json(manifest);
    return ++attempts === 1 ? new Response("", { status: 503 }) : json(book);
  });
  assert.equal(await loader.load(["John 3:16"]), false);
  assert.equal(loader.cache.has("John 3:16"), false);
  assert.equal(await loader.load(["John 3:16"]), true);
  assert.equal(attempts, 2);
});

test("a failed manifest is retried and unknown references fail explicitly", async () => {
  let attempts = 0;
  const loader = createNetLoader("/", async url => {
    if (url.endsWith("manifest.json")) return ++attempts === 1 ? json({}) : json(manifest);
    return json(book);
  });
  assert.equal(await loader.load(["John 3:16"]), false);
  assert.equal(await loader.load(["John 3:16"]), true);
  assert.equal(await loader.load(["Not a Bible reference"]), false);
});

test("unexplained empty text never gets cached as NET", async () => {
  const loader = createNetLoader("/", async url => json(
    url.endsWith("manifest.json") ? manifest : { "John 3:16": "" },
  ));
  assert.equal(await loader.load(["John 3:16"]), false);
  assert.equal(loader.cache.has("John 3:16"), false);
});

test("switching topics does not poison a shared in-flight book request", async () => {
  let release;
  let requests = 0;
  const wait = new Promise(resolve => { release = resolve; });
  const loader = createNetLoader("/", async url => {
    if (url.endsWith("manifest.json")) return json(manifest);
    requests++;
    await wait;
    return json(book);
  });
  const controller = new AbortController();
  const first = loader.load(["John 3:16"], 3, controller.signal);
  const second = loader.load(["John 5:4"]);
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.abort();
  release();
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.equal(requests, 1);
  assert.equal(loader.notes.has("John 5:4"), true);
});