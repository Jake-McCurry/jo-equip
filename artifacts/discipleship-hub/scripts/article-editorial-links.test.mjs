import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { applyArticleEditorialLinks, fruitOfTheSpiritHref, fruitOfTheSpiritLinks } from "../src/data/articleEditorialLinks.mjs";

function articleFor(subId, id) {
  let article;
  for (const source of ["generated", "local"]) {
    const file = new URL(`../src/data/${source}/articles/${subId}.json`, import.meta.url);
    if (existsSync(file)) {
      article = JSON.parse(readFileSync(file, "utf8")).find(a => a.id === id) ?? article;
    }
  }
  assert.ok(article, `${subId}/${id} exists`);
  return article;
}

test("all ten screenshot links preserve wording and change only the requested occurrence", () => {
  assert.equal(fruitOfTheSpiritLinks.length, 10);
  for (const [subId, id, label, sentence] of fruitOfTheSpiritLinks) {
    const original = articleFor(subId, id);
    const before = JSON.stringify(original);
    const linked = applyArticleEditorialLinks(original);
    const after = JSON.stringify(linked);
    const anchor = `<a href="${fruitOfTheSpiritHref}">${label}</a>`;
    const encodedAnchor = JSON.stringify(anchor).slice(1, -1);
    assert.equal(after.split(encodedAnchor).length - 1, 1, `${subId}/${id}`);
    assert.equal(after.replace(encodedAnchor, label), before, "only an anchor was added");
    assert.ok(after.includes(JSON.stringify(sentence.replace(label, anchor)).slice(1, -1)));
    assert.equal(JSON.stringify(original), before, "source was not mutated");
    assert.deepEqual(applyArticleEditorialLinks(linked), linked, "idempotent");
    assert.deepEqual(applyArticleEditorialLinks({ ...original, subId: "unrelated" }), { ...original, subId: "unrelated" });
  }
});

test("destination exists and source drift cannot silently omit or duplicate links", () => {
  articleFor("ministry-holy-spirit", "the-fruit-of-the-spirit");
  const [subId, id, , sentence] = fruitOfTheSpiritLinks[0];
  const original = articleFor(subId, id);
  assert.throws(() => applyArticleEditorialLinks({ ...original, blocks: [] }), /found 0/);
  assert.throws(() => applyArticleEditorialLinks({
    ...original, blocks: [{ type: "p", html: sentence }, { type: "p", html: sentence }],
  }), /found 2/);
});
