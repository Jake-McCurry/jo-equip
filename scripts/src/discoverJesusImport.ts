/**
 * Capture the verified public series-35 catalog and prepare local HTML inputs.
 * Run from scripts: pnpm exec tsx src/discoverJesusImport.ts /path/to/posts.json
 * Without an argument, rebuild inputs from the checked-in snapshot offline.
 * This does not create or modify PDFs.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { resolve } from "node:path";
import assert from "node:assert/strict";

const dir = resolve("data/birth-of-jesus");
const hub = resolve("../artifacts/discipleship-hub");
const ids = [14706,14709,14716,14719,14727,14729,14929,14945,14948,14960,14962,14964];
type Post = { id: number; slug: string; title: string; body: string };
mkdirSync(dir, { recursive: true });
const input = process.argv[2];
if (input) {
  const catalog = JSON.parse(readFileSync(input, "utf8"));
  const series = catalog.data.series.find((s: { id: number }) => s.id === 35);
  assert.equal(series.slug, "22180-the-birth-of-jesus");
  assert.deepEqual(series.posts.map((p: Post) => p.id), ids);
  const posts = series.posts.map((ref: Post, i: number) => {
    const post = catalog.data.posts.find((p: Post) => p.id === ref.id);
    assert.equal(post.slug, ref.slug);
    assert.ok(post.slug.startsWith(`22180-${String(i + 1).padStart(3, "0")}-`));
    assert.ok(post.body.length > 1000);
    return { id: post.id, slug: post.slug, title: post.title, body: post.body };
  });
  writeFileSync(resolve(dir, "catalog.json"), JSON.stringify({
    source: "https://app.jesusonline.com/assets/data/posts.json",
    created_at_unix: catalog.created_at_unix, series, posts,
  }, null, 2) + "\n");
}
const snapshot = JSON.parse(readFileSync(resolve(dir, "catalog.json"), "utf8"));
assert.deepEqual(snapshot.posts.map((p: Post) => p.id), ids);
const mappingPath = resolve("data/slug-mapping.json");
const mapping = JSON.parse(readFileSync(mappingPath, "utf8"));
for (const post of snapshot.posts as Post[]) {
  writeFileSync(resolve(dir, `${post.slug}.html`), post.body);
  mapping[post.slug] = { wp_id: post.id, wp_slug: post.slug, localHtml: `birth-of-jesus/${post.slug}.html` };
}
writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + "\n");
// One-time lossless relocation: preserve all body blocks, images and resources.
const oldPath = resolve(hub, "src/data/generated/articles/discover-jesus-gospels.json");
if (existsSync(oldPath)) {
  const articles = JSON.parse(readFileSync(oldPath, "utf8"));
  assert.equal(articles.length, 30);
  writeFileSync(resolve(hub, "src/data/generated/articles/encounters-with-jesus.json"),
    JSON.stringify(articles.map((a: object) => ({ ...a, subId: "encounters-with-jesus" })), null, 2));
  unlinkSync(oldPath);
}
