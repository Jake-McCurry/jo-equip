import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import worker from "../worker/index.js";
import { ARTICLE_REDIRECTS, canonicalArticlePath, canonicalArticleHref, canonicalizeArticleLinks, articleRedirectLocation } from "../src/data/articleCanonicalPaths.mjs";
import { canonicalArticleHtml } from "../src/data/articleCanonicalHtml.mjs";

const root = resolve(import.meta.dirname, "..");
const sheet = resolve(root, "../../attached_assets/Pasted-S-No-URLs-Duplicated-With-Duplicate-Status-1-https-equi_1790802992178.txt");
const rows = readFileSync(sheet, "utf8").trim().split("\n").slice(1).map(row => {
  const [, first, second] = row.split("\t");
  return [new URL(second).pathname, new URL(first).pathname];
});
const excluded = rows.filter(([, first]) => first.includes("/bb-growing-closer-majesty/"));
const approved = rows.filter(([, first]) => !first.includes("/bb-growing-closer-majesty/"));

test("exact manifest matches all 59 approved pairs, FIRST survives, six pairs untouched", () => {
  assert.equal(approved.length, 59);
  assert.equal(excluded.length, 6);
  assert.deepEqual(Object.fromEntries(approved), ARTICLE_REDIRECTS);
  for (const [from, to] of approved) {
    assert.equal(canonicalArticlePath(from), to);
    assert.equal(canonicalArticlePath(`${from}/?a=1#part`), `${to}?a=1#part`);
    assert.equal(canonicalArticlePath(to), to);
    assert.equal(canonicalArticlePath(from + "/child"), from + "/child");
    assert.equal(canonicalArticlePath(from + "-other"), from + "-other");
    assert.equal(canonicalArticlePath(from.slice(0, from.lastIndexOf("/"))), from.slice(0, from.lastIndexOf("/")));
  }
  for (const paths of excluded) for (const path of paths) assert.equal(canonicalArticlePath(path), path);
});

test("Worker HTTP301: all 59, slash/query, and old /channels converge in one hop", async () => {
  for (const [from, to] of approved) {
    for (const path of [from, from + "/", from.replace("/categories/", "/channels/") + "/"]) {
      const response = await worker.fetch(new Request(`https://equip.jesusonline.com${path}?campaign=one%20two`), {
        ASSETS: { fetch() { throw new Error("Retired URL must never reach assets"); } },
      }, {});
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `https://equip.jesusonline.com${to}?campaign=one%20two`);
    }
  }
});

test("raw dev request redirect preserves query parameters for all 59 paths", () => {
  for (const [from, to] of approved) {
    for (const path of [from, from + "/", from.replace("/categories/", "/channels/") + "/"]) {
      assert.equal(articleRedirectLocation(path + "?audit=1&encoded=one%20two"), to + "?audit=1&encoded=one%20two");
      assert.equal(articleRedirectLocation("/preview" + path + "?audit=1", "/preview/"), "/preview" + to + "?audit=1");
    }
    assert.equal(articleRedirectLocation(to + "?audit=1"), undefined);
  }
});

test("survivors, topics, six excluded pairs and unrelated assets still reach assets", async () => {
  const paths = new Set([...approved.map(([, to]) => to), ...excluded.flat(),
    ...approved.flatMap(pair => pair.map(path => path.slice(0, path.lastIndexOf("/")))),
    "/articles/example.pdf"]);
  for (const path of paths) {
    const response = await worker.fetch(new Request(`https://equip.jesusonline.com${path}`), {
      ASSETS: { fetch: async () => new Response("source", { status: 200 }) },
    }, {});
    assert.equal(response.status, 200, path);
  }
});

test("rendered HTML handles relative, absolute, entities, base, schema safely and idempotently", () => {
  const [from, to] = approved[0];
  const html = `<a href="${from}/?a=1&amp;b=2">card</a><a href="https://equip.jesusonline.com${from}">body</a><script type="application/ld+json">{"url":"https://equip.jesusonline.com${from}"}</script>`;
  const result = canonicalArticleHtml(html);
  assert.ok(!result.includes(from));
  assert.ok(result.includes(to + "?a=1&amp;b=2"));
  assert.equal(canonicalArticleHtml(result), result);
  assert.equal(canonicalArticleHref("../struggle-inner-peace/after-discoverywhat?x=1", "/categories/church/other/article"), to + "?x=1");
  assert.equal(canonicalArticleHref(`/preview${from}/?x=1`, "/preview/", "/preview/"), "/preview" + to + "?x=1");
  assert.equal(canonicalArticleHref("https://equip.jesusonline.com" + from, "/preview/", "/preview/"), "https://equip.jesusonline.com" + to);
  assert.equal(canonicalArticleHref("https://other.example" + from), "https://other.example" + from);
  assert.equal(canonicalizeArticleLinks("https://other.example" + from), "https://other.example" + from);
  assert.equal(canonicalArticleHtml(`<a href="https://other.example${from}">external</a>`), `<a href="https://other.example${from}">external</a>`);
  assert.equal(canonicalizeArticleLinks(from + "/child"), from + "/child");
  const encoded = from.replaceAll("/", "&#47;");
  const safe = canonicalArticleHtml(`<a href="${encoded}?q=&quot; onclick=&quot;x">safe</a>`);
  assert.ok(safe.includes(to));
  assert.ok(!safe.includes(' onclick="x'));
});

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

test("production build: survivors/topics/six pairs exist, retired pages/links/sitemap/search entries absent", {
  skip: !process.env.VERIFY_CONSOLIDATION_BUILD,
}, () => {
  const dist = resolve(root, process.env.CONSOLIDATION_DIST ?? "dist");
  for (const [from, to] of approved) {
    assert.ok(!existsSync(resolve(dist, "." + from, "index.html")), from);
    assert.ok(existsSync(resolve(dist, "." + to, "index.html")), to);
    for (const path of [from, to]) {
      const topic = resolve(dist, "." + path.slice(0, path.lastIndexOf("/")), "index.html");
      assert.ok(existsSync(topic));
      assert.ok(readFileSync(topic, "utf8").includes(`href="${to}"`), `topic card must point directly to ${to}`);
    }
  }
  for (const pair of excluded) for (const path of pair) {
    assert.ok(existsSync(resolve(dist, "." + path, "index.html")), path);
  }
  let checked = 0;
  const searchUrls = new Set();
  for (const path of files(dist)) {
    if (!/\.(html|xml|json|js|pf_meta|pf_fragment|pf_index)$/.test(path)) continue;
    const bytes = readFileSync(path);
    const text = (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString("utf8");
    if (path.endsWith(".pf_fragment")) {
      const fragment = JSON.parse(text.replace(/^pagefind_dcd/, ""));
      searchUrls.add(fragment.url.replace(/\/+$/, ""));
    }
    for (const [from] of approved) assert.ok(!text.includes(from), `${path} contains ${from}`);
    checked++;
  }
  assert.ok(checked > 1000, "audit must cover the complete build");
  for (const [from, to] of approved) {
    assert.ok(!searchUrls.has(from), `retired search entry: ${from}`);
    assert.ok(searchUrls.has(to), `missing survivor search entry: ${to}`);
  }
  for (const pair of excluded) for (const path of pair) assert.ok(searchUrls.has(path), `untouched search entry: ${path}`);
});