import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { decodeHTML } from "entities";

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const json = path => JSON.parse(read(path));
const source = json("../../scripts/data/birth-of-jesus/catalog.json");
const birth = json("src/data/generated/articles/the-birth-of-jesus.json");
const encounters = json("src/data/generated/articles/encounters-with-jesus.json");
const text = html => decodeHTML(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
const blocksHtml = blocks => blocks.map(b => b.html ?? b.text ?? b.items?.join(" ") ?? "").join(" ");

test("all twelve source articles retain their exact order, wording and formatting", () => {
  assert.equal(source.series.id, 35);
  assert.equal(birth.length, 12);
  assert.deepEqual(source.posts.map(p => p.id), [14706,14709,14716,14719,14727,14729,14929,14945,14948,14960,14962,14964]);
  assert.deepEqual(source.posts.map(p => p.slug), source.series.posts.map(p => p.slug));
  birth.forEach((article, i) => {
    const post = source.posts[i];
    assert.equal(article.appSlug, post.slug);
    assert.equal(article.title, post.title);
    assert.equal(article.id, post.slug.replace(/^22180-\d{3}-/, ""));
    assert.equal(text(blocksHtml(article.blocks)), text(post.body), article.id);
    for (const [tag, type] of [["h2","h2"], ["h3","h3"], ["blockquote","quote"], ["ul","ul"]]) {
      assert.equal(article.blocks.filter(b => b.type === type).length,
        [...post.body.matchAll(new RegExp(`<${tag}\\b`, "g"))].length, `${article.id}: ${tag}`);
    }
    for (const tag of ["em", "strong", "sup", "br"]) {
      assert.equal([...blocksHtml(article.blocks).matchAll(new RegExp(`<${tag}\\b`, "g"))].length,
        [...post.body.matchAll(new RegExp(`<${tag}\\b`, "g"))].length, `${article.id}: ${tag}`);
    }
    assert.equal(read(`../../scripts/data/birth-of-jesus/${post.slug}.html`), post.body);
  });
});

test("all 42 article records have unique routes and local content", () => {
  assert.equal(encounters.length, 30);
  const all = [...encounters, ...birth];
  assert.equal(new Set(all.map(a => `${a.subId}/${a.id}`)).size, 42);
  for (const article of all) {
    assert.equal(article.channelId, "growth");
    assert.ok(article.blocks.length > 5);
  }
});

test("built topics, navigation, canonicals, source links and sitemap cover all 42 pages", {
  skip: process.env.VERIFY_DISCOVER_BUILD !== "1",
}, () => {
  const parent = read("dist/categories/growth/discover-jesus-gospels/index.html");
  assert.ok(parent.includes("Encounters with Jesus"));
  assert.ok(parent.includes("The Birth of Jesus"));
  assert.ok(parent.includes("Explore 30 Articles"));
  assert.ok(parent.includes("Explore 12 Articles"));
  assert.ok(!parent.includes("/discover-jesus-gospels/the-humility-of-jesus"));
  const sitemap = read("dist/sitemap-categories.xml");
  for (const series of [encounters, birth]) {
    series.forEach((a, i) => {
      const path = `/categories/growth/${a.subId}/${a.id}`;
      const html = read(`dist${path}/index.html`);
      assert.ok(html.includes(`rel="canonical" href="https://equip.jesusonline.com${path}"`), path);
      assert.ok(html.includes(`https://app.jesusonline.com/post/${a.appSlug}`), path);
      assert.ok(html.includes(`/categories/growth/${a.subId}/${series[(i+1)%series.length].id}`), path);
      assert.ok(html.includes("Discover Jesus in the Gospels"), path);
      assert.ok(sitemap.includes(`<loc>https://equip.jesusonline.com${path}</loc>`), path);
      assert.ok(!existsSync(resolve(root, `dist/categories/growth/discover-jesus-gospels/${a.id}/index.html`)));
    });
  }
});
