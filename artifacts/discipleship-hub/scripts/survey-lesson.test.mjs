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
  assert.deepEqual(book(linkSurveyScripture("1st John 3:2", "/", "John")), ["1 John 3"]);
  assert.deepEqual(book(linkSurveyScripture("Genesis 15:1-31", "/", "Romans")), []);
  assert.deepEqual(book(linkSurveyScripture("(vs. 25)", "/", "Romans")), []);
  assert.deepEqual(book(linkSurveyScripture("in chapters 2-3", "/", "Hebrews")), ["Hebrews 2"]);
  assert.deepEqual(book(linkSurveyScripture("Chapters 45 and 53", "/", "Isaiah")), ["Isaiah 45"]);
  assert.deepEqual(book(linkSurveyScripture("Paul in Romans 8:28: “And", "/", "Ruth")), ["Romans 8"]);
  assert.deepEqual(book(linkSurveyScripture("(25:7:7-10)", "/", "Genesis")), []);
  assert.deepEqual(book(linkSurveyScripture("(Vs 15:5)", "/", "2 Kings")), ["2 Kings 15"]);
  assert.deepEqual(book(linkSurveyScripture("chapter 40", "/", "Jude")), []);
});

const linkedBooks = html => [...html.matchAll(/book=([^&]+)&amp;chapter=(\d+)/g)]
  .map(m => `${decodeURIComponent(m[1].replace(/\+/g, " "))} ${m[2]}`);

test("existing Scripture anchors and their destinations remain byte-for-byte unchanged", () => {
  for (const anchor of [
    '<a href="https://example.org/read?x=1&amp;y=2">John 3:16</a>',
    '<A title="Read > study" HREF=\'/source?q=John%203%3A16\'><strong>John 3:16</strong> and chapter 4</A>',
    '<a\nhref="/lesson"><span>3:16</span> and <em>chapters 2-3</em></a>',
  ]) {
    const html = `${anchor}; <em>John 3:17</em>`;
    const linked = linkSurveyScripture(html, "/", "John");
    assert.ok(linked.startsWith(`${anchor}; <em>`));
    assert.deepEqual(linkedBooks(linked), ["John 3"]);
    assert.equal((linked.match(/class="scripture-ref"/g) ?? []).length, 1);
  }
});

test("linking is idempotent for verse, chapter, and existing source links", () => {
  const html = '<a href="/original">John 3:16</a>; <strong>3:17</strong>; chapters 2-3; Rom. 4:3, 9, 22';
  const once = linkSurveyScripture(html, "/hub/", "John");
  assert.equal(linkSurveyScripture(once, "/hub/", "John"), once);
});

test("normal inline emphasis still links references without changing source text", () => {
  const html = '<p>Read <strong>John 3:16</strong>; <em>3:17</em>; <span>chapters 2-3</span>.</p>';
  const linked = linkSurveyScripture(html, "/", "John");
  assert.deepEqual(linkedBooks(linked), ["John 3", "John 3", "John 2"]);
  assert.equal(linked.replace(/<a\b[^>]*>(.*?)<\/a>/g, "$1"), html);
  assert.match(linked, /<strong><a\b/);
  assert.match(linked, /<em><a\b/);
});

test("non-prose elements and comments remain untouched while following prose links", () => {
  for (const protectedHtml of [
    '<script>const text = "John 3:16 <a> chapter 2";</script>',
    '<STYLE>.example::after { content: "John 3:16 <a>"; }</STYLE>',
    '<textarea>John 3:16 <em>chapter 2</em></textarea>',
    '<pre><code>John 3:16</code> chapter 2</pre>',
    '<code><span>John 3:16</span></code>',
    '<template><div>John 3:16 <template>chapter 2</template></div></template>',
    '<!-- John 3:16 > <a href="/source">chapter 2</a> -->',
  ]) {
    const linked = linkSurveyScripture(`${protectedHtml}; John 3:17`, "/", "John");
    assert.ok(linked.startsWith(`${protectedHtml}; `));
    assert.deepEqual(linkedBooks(linked), ["John 3"]);
  }
  assert.equal(linkSurveyScripture('<script>John 3:16', "/", "John"), '<script>John 3:16');
});

test("ordinal and abbreviated names always override lesson context without changing labels", () => {
  const cases = [
    ["1st Corinthians 13:4", "1 Corinthians 13"],
    ["2nd Cor. 5:17", "2 Corinthians 5"], ["Third John 1:4", "3 John 1"],
    ["First Samuel 3:1", "1 Samuel 3"], ["Second Kings 2:1", "2 Kings 2"],
    ["1Cor 13:4", "1 Corinthians 13"], ["2 Tim. 3:16", "2 Timothy 3"],
    ["3rd Jn. 1:4", "3 John 1"], ["1st Thess. 4:13", "1 Thessalonians 4"],
    ["Gen. 1:1", "Genesis 1"], ["Exod 3:2", "Exodus 3"],
    ["Ps. 110:4", "Psalms 110"], ["Song of Songs 2:1", "Song of Solomon 2"],
    ["Song of Solomon 2:1", "Song of Solomon 2"], ["Matt. 5:3", "Matthew 5"],
    ["Jn 3:16", "John 3"], ["rom. 8:28", "Romans 8"],
    ["PHIL 1:6", "Philippians 1"], ["Phlm. 1:4", "Philemon 1"],
    ["Heb. 11:1", "Hebrews 11"], ["Rev. 21:4", "Revelation 21"],
  ];
  for (const context of ["Ruth", null]) for (const [text, expected] of cases) {
    const html = linkSurveyScripture(text, "/hub/", context);
    assert.deepEqual(linkedBooks(html), [expected], text);
    assert.equal(html.replace(/<[^>]+>/g, ""), text);
    assert.match(html, /href="\/hub\/bible\?/);
    assert.match(html, /translation=net/);
    assert.match(html, /target="_blank" rel="noopener"/);
    assert.match(html, /data-preview-ranges="\[\[/);
  }
});

test("aliases do not leak book context into subsequent bare references", () => {
  const text = "1st Cor. 13:4; 2:3; Heb. 11:1; 3:4";
  assert.deepEqual(linkedBooks(linkSurveyScripture(text, "/", "Genesis")),
    ["1 Corinthians 13", "Genesis 2", "Hebrews 11", "Genesis 3"]);
  assert.deepEqual(linkedBooks(linkSurveyScripture(text, "/", null)),
    ["1 Corinthians 13", "Hebrews 11"]);
  assert.equal(linkSurveyScripture("Gen. chapters 2-3", "/", "Ruth"), "Gen. chapters 2-3");
});

test("ambiguous names and malformed citations are never salvaged using the lesson book", () => {
  for (const text of [
    "4th John 3:2", "1nd John 3:2", "11st John 3:2", "First 2 John 1:2",
    "1st Corinthians 13:99", "Thess. 4:13", "corinthians 3:2", "Pet. 3:2",
    "Ph. 1:2", "Cor. 3:2", "Tim. 3:2", "Sam. 3:2", "Kings 3:2",
    "1<sup>st</sup> Corinthians 3:2", "1st <em>Thess.</em> 4:13",
    "Gen. 1:1:2", "Gen. 1:1-9999", "Gen. 1:1, 0", "Gen. 1:1, 5-2",
    "Gen. 1:1, 9999", "Gen. 1:1foo", "xGen. 1:1",
  ]) {
    assert.equal(linkSurveyScripture(text, "/", "Genesis"), text, text);
  }
});

test("abbreviated ranges retain NET preview chapter and verse boundaries", () => {
  const html = linkSurveyScripture("1st Cor. 1:30-2:3; Rom. 4:3, 9, 22", "/", "Ruth");
  assert.match(html, /data-preview-ranges="\[\[1,30,31\],\[2,1,3\]\]"/);
  assert.match(html, /data-preview-ranges="\[\[4,3,3\],\[4,9,9\],\[4,22,22\]\]"/);
});
