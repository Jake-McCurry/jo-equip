// Run: node --experimental-strip-types --test scripts/survey-lesson.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSurveyLesson, nodeText, numericChapters } from "../src/components/articles/surveyLesson.ts";
import { linkSurveyScripture, surveyBookContext } from "../src/components/articles/surveyScriptureLinks.ts";

const load = f => JSON.parse(readFileSync(new URL(`../src/data/generated/articles/${f}`, import.meta.url), "utf8"));
const articles = [...load("survey-of-the-bible-ot.json"), ...load("survey-of-the-bible-nt.json")];
const norm = s => s.replace(/\s+/g, " ").trim();

test("every survey source block is rendered in order (only approved display changes)", () => {
  for (const a of articles) {
    const expected = a.blocks.flatMap(b =>
      b.type === "p" ? [b.html] : b.type === "h3" || b.type === "h2" ? [b.text] : b.items,
    ).map(s => norm(numericChapters(s)))
      // Approved: discussion heading drops its outline marker ("III.", "F.").
      .map(s => s.replace(/^(?:[A-Z]{1,2}|[IVX]+)\.\s+(?=Discussion Questions?\b)/i, ""));
    const got = buildSurveyLesson(a.blocks, a.id).flatMap(nodeText).map(norm);
    const i = got.findIndex((g, k) => g !== expected[k]);
    assert.ok(i === -1 && got.length === expected.length, `${a.id} @${i}: ${got[i]?.slice(0, 160)} !== ${expected[i]?.slice(0, 160)}`);
  }
});

test("chapter notation uses digits and hyphen ranges", () => {
  assert.equal(numericChapters("Chapters one through five."), "Chapters 1-5.");
  assert.equal(numericChapters("Chapter Twenty-One."), "Chapter 21.");
  assert.equal(numericChapters("Chapter Twenty One."), "Chapter 21.");
  assert.equal(numericChapters("Chapters 38 and 39 tell"), "Chapters 38-39 tell");
  assert.equal(numericChapters("Chapters 45 and 53 are"), "Chapters 45 and 53 are");
});

test("book context", () => {
  assert.equal(surveyBookContext("Hebrews"), "Hebrews");
  assert.equal(surveyBookContext("Psalms"), "Psalms");
  assert.equal(surveyBookContext("1 & 2 Chronicles"), null);
  assert.equal(surveyBookContext("Old Testament Introduction"), null);
});

test("scripture linking resolves correct books and rejects ambiguity", () => {
  const book = html => [...html.matchAll(/book=([^&]+)&amp;chapter=(\d+)/g)].map(m => `${decodeURIComponent(m[1].replace(/\+/g, " "))} ${m[2]}`);
  assert.deepEqual(book(linkSurveyScripture("see 3:15 and Psalm 110:4", "/", "Hebrews")), ["Hebrews 3", "Psalms 110"]);
  assert.deepEqual(book(linkSurveyScripture("bare 3:15", "/", null)), []);
  assert.deepEqual(book(linkSurveyScripture("1<sup>st</sup> Thessalonians 4:13", "/", "2 Thessalonians")), []);
  assert.deepEqual(book(linkSurveyScripture("1st John 3:2", "/", "John")), []);
  assert.deepEqual(book(linkSurveyScripture("Genesis 15:1-31", "/", "Romans")), []);
  assert.deepEqual(book(linkSurveyScripture("(vs. 25)", "/", "Romans")), []);
  assert.deepEqual(book(linkSurveyScripture("in chapters 2-3", "/", "Hebrews")), ["Hebrews 2"]);
  assert.deepEqual(book(linkSurveyScripture("Chapters 45 and 53", "/", "Isaiah")), ["Isaiah 45"]);
  assert.deepEqual(book(linkSurveyScripture("Paul in Romans 8:28: “And", "/", "Ruth")), ["Romans 8"]);
  assert.deepEqual(book(linkSurveyScripture("(25:7:7-10)", "/", "Genesis")), []);
  assert.deepEqual(book(linkSurveyScripture("(Vs 15:5)", "/", "2 Kings")), ["2 Kings 15"]);
  assert.deepEqual(book(linkSurveyScripture("chapter 40", "/", "Jude")), []);
});
