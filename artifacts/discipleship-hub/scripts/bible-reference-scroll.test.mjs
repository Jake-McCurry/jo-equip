import test from "node:test";
import assert from "node:assert/strict";
import { scrollToPassage } from "../src/components/bible-reader/passage-scroll.ts";
import { scriptureReaderPath } from "../src/components/knowing-god/scripture-link.ts";
import { linkSurveyScripture } from "../src/components/articles/surveyScriptureLinks.ts";
import { bibleHref } from "../src/components/promises/promise-utils.ts";

test("Bible link producers keep the first verse of cross-chapter ranges", () => {
  const reference = "John 3:16-4:2";
  for (const href of [
    scriptureReaderPath(reference, "KJV"),
    bibleHref("/hub", { reference }),
    linkSurveyScripture(reference, "/hub", null).match(/href="([^"]+)"/)[1].replaceAll("&amp;", "&"),
  ]) {
    const q = new URL(href, "https://example.org").searchParams;
    assert.equal(q.get("book"), "John");
    assert.equal(q.get("chapter"), "3");
    assert.equal(q.get("verse"), "16");
  }
  assert.throws(() => scriptureReaderPath("John 3:99", "NET"), /Invalid Scripture verse/);
  assert.equal(new URL(scriptureReaderPath("John 3", "NET"), "https://example.org").searchParams.has("verse"), false);
});

test("scroll waits for visible matching content, cancels stale frames and supports revisits", () => {
  const saved = Object.fromEntries(["document", "requestAnimationFrame", "cancelAnimationFrame"].map(k => [k, globalThis[k]]));
  const calls = [], frames = new Map();
  let next = 0;
  globalThis.document = { getElementById: id => ({ scrollIntoView: options => calls.push({ id, options }) }) };
  globalThis.requestAnimationFrame = fn => { frames.set(++next, fn); return next; };
  globalThis.cancelAnimationFrame = id => frames.delete(id);
  const flush = () => { for (const fn of frames.values()) fn(); frames.clear(); };
  const loc = { book: "John", chapter: 3, verse: 16, translation: "net" };
  const p = { ...loc, verses: [{ verse: 16, text: "text" }] };
  const last = { current: -1 };
  try {
    for (const args of [[null, false, ""], [p, true, ""], [p, false, "error"], [{ ...p, chapter: 4 }, false, ""], [{ ...p, translation: "kjv" }, false, ""]]) {
      scrollToPassage(loc, ...args, 0, last);
    }
    flush(); assert.equal(calls.length, 0);
    const cancel = scrollToPassage(loc, p, false, "", 0, last);
    cancel(); flush(); assert.equal(calls.length, 0);
    scrollToPassage(loc, p, false, "", 0, last); flush();
    assert.deepEqual(calls.at(-1), { id: "v16", options: { block: "start", behavior: "instant" } });
    scrollToPassage({ ...loc, verse: undefined }, p, false, "", 0, last); flush();
    assert.equal(calls.length, 1, "deselecting does not jump to top");
    scrollToPassage({ ...loc, verse: undefined }, p, false, "", 1, last); flush();
    assert.equal(calls.at(-1).id, "br-top");
    scrollToPassage(loc, p, false, "", 2, last); flush();
    scrollToPassage(loc, p, false, "", 3, last); flush();
    assert.equal(calls.length, 4, "same-verse navigation and history revisits scroll again");
    scrollToPassage({ ...loc, verse: 17 }, p, false, "", 4, last); flush();
    assert.equal(calls.at(-1).id, "v17");
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    }
  }
});
