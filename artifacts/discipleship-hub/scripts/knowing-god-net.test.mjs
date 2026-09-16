import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { passageRanges } from "../src/components/knowing-god/passage-format.ts";

const dataDirectory = new URL("../public/knowing-god/data/", import.meta.url);
const netDirectory = new URL("../public/knowing-god/net/", import.meta.url);

async function sourceReferences() {
  const references = new Set();
  for (const file of (await readdir(dataDirectory)).filter(file => /^topics-.*\.json$/.test(file))) {
    const { topics } = JSON.parse(await readFile(new URL(file, dataDirectory), "utf8"));
    for (const topic of topics) {
      for (const passage of topic.passages) references.add(passage.reference);
    }
  }
  return references;
}

test("the local NET manifest covers every source passage", async () => {
  const manifest = JSON.parse(await readFile(new URL("manifest.json", netDirectory), "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(manifest.source?.provider);
  const references = await sourceReferences();
  assert.deepEqual(new Set(Object.keys(manifest.passages)), references);
  for (const [reference, filename] of Object.entries(manifest.passages)) {
    assert.match(filename, /^[a-z0-9.-]+\.json$/);
    assert.ok(passageRanges(reference).length > 0, reference);
    const payload = JSON.parse(await readFile(new URL(filename, netDirectory), "utf8"));
    assert.equal(Object.getPrototypeOf(payload), Object.prototype);
    assert.equal(typeof payload[reference], "string", reference);
    assert.ok(payload[reference].trim(), reference);
  }
});

test("each generated NET book filename is content-hashed", async () => {
  const files = await readdir(netDirectory);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", netDirectory), "utf8"));
  const referencedFiles = new Set(Object.values(manifest.passages));
  assert.ok(referencedFiles.size > 0);
  for (const filename of referencedFiles) {
    assert.ok(files.includes(filename), filename);
    assert.match(filename, /^[a-z0-9-]+\.[a-f0-9]{12}\.json$/, filename);
  }
});