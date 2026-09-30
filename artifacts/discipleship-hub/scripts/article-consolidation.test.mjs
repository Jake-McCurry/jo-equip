import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { gunzipSync } from "node:zlib";
import { decodeHTML } from "entities";
import worker from "../worker/index.js";
import { ARTICLE_REDIRECTS, canonicalArticlePath, canonicalArticleHref, canonicalizeArticleLinks, articleRedirectLocation } from "../src/data/articleCanonicalPaths.mjs";
import { canonicalArticleHtml } from "../src/data/articleCanonicalHtml.mjs";

const root = resolve(import.meta.dirname, "..");
const sheet = resolve(root, "../../attached_assets/Pasted-S-No-URLs-Duplicated-With-Duplicate-Status-1-https-equi_1790802992178.txt");
const rows = readFileSync(sheet, "utf8").trim().split("\n").slice(1).map(row => {
  const [, first, second] = row.split("\t");
  return [new URL(second).pathname, new URL(first).pathname];
});
const originalApproved = rows.filter(([, first]) => !first.includes("/bb-growing-closer-majesty/"));
// These six exceptions deliberately reverse the sheet's FIRST-survives rule:
// the approved local Attributes of God manuscripts, not Majesty, survive.
const majestySlugs = [
  "attributes-of-holiness", "attributes-of-love", "attributes-of-self-existence",
  "attributes-of-sovereignty", "live-in-the-light-of-his-majesty",
  "the-supreme-pursuit-of-the-heart",
];
const majestyApproved = majestySlugs.map(slug => [
  `/categories/growth/bb-growing-closer-majesty/${slug}`,
  `/categories/growth/attributes-of-god/${slug}`,
]);
const approved = [...originalApproved, ...majestyApproved];
const localAttributes = JSON.parse(readFileSync(resolve(root, "src/data/local/articles/attributes-of-god.json"), "utf8"));
const generatedMajesty = JSON.parse(readFileSync(resolve(root, "src/data/generated/articles/bb-growing-closer-majesty.json"), "utf8"));
const authoritativeArticles = majestySlugs.map(id => {
  const local = localAttributes.find(article => article.id === id);
  const generated = generatedMajesty.find(article => article.id === id);
  assert.ok(local && generated, `both source records must remain: ${id}`);
  return { local, generated };
});
const pdfPaths = new Set(authoritativeArticles.flatMap(({ local, generated }) => [
  local.pdf,
  ...[generated.pdf ?? `/articles/${generated.appSlug}.pdf`]
    .filter(path => existsSync(resolve(root, "public", "." + path))),
]));

test("exact manifest matches 65 pairs: original 59 FIRST survive, six local Attributes survivors", () => {
  assert.equal(originalApproved.length, 59);
  assert.equal(rows.length, 65);
  assert.equal(approved.length, 65);
  assert.deepEqual(
    rows.filter(([, first]) => first.includes("/bb-growing-closer-majesty/")),
    majestyApproved.map(([from, to]) => [to, from]),
  );
  assert.deepEqual(Object.fromEntries(approved), ARTICLE_REDIRECTS);
  for (const [from, to] of approved) {
    assert.equal(canonicalArticlePath(from), to);
    assert.equal(canonicalArticlePath(`${from}/?a=1#part`), `${to}?a=1#part`);
    assert.equal(canonicalArticlePath(to), to);
    assert.equal(canonicalArticlePath(from + "/child"), from + "/child");
    assert.equal(canonicalArticlePath(from + "-other"), from + "-other");
    assert.equal(canonicalArticlePath(from.slice(0, from.lastIndexOf("/"))), from.slice(0, from.lastIndexOf("/")));
  }
});

test("Worker HTTP301: all 65, slash/query, and old /channels converge in one hop", async () => {
  for (const [from, to] of approved) {
    for (const path of [from, from + "/", from.replace("/categories/", "/channels/"), from.replace("/categories/", "/channels/") + "/"]) {
      const response = await worker.fetch(new Request(`https://equip.jesusonline.com${path}?campaign=one%20two`), {
        ASSETS: { fetch() { throw new Error("Retired URL must never reach assets"); } },
      }, {});
      assert.equal(response.status, 301);
      assert.equal(response.headers.get("location"), `https://equip.jesusonline.com${to}?campaign=one%20two`);
      const survivor = await worker.fetch(new Request(response.headers.get("location")), {
        ASSETS: { fetch: async () => new Response("survivor", { status: 200 }) },
      }, {});
      assert.equal(survivor.status, 200, `redirect must finish in one hop: ${path}`);
    }
  }
});

test("raw dev request redirect preserves query parameters for all 65 paths", () => {
  for (const [from, to] of approved) {
    for (const path of [from, from + "/", from.replace("/categories/", "/channels/") + "/"]) {
      assert.equal(articleRedirectLocation(path + "?audit=1&encoded=one%20two"), to + "?audit=1&encoded=one%20two");
      assert.equal(articleRedirectLocation("/preview" + path + "?audit=1", "/preview/"), "/preview" + to + "?audit=1");
    }
    assert.equal(articleRedirectLocation(to + "?audit=1"), undefined);
  }
});

test("survivors, topics and PDFs still reach assets unchanged", async () => {
  const paths = new Set([...approved.map(([, to]) => to), ...pdfPaths,
    ...approved.flatMap(pair => pair.map(path => path.slice(0, path.lastIndexOf("/")))),
    "/articles/example.pdf"]);
  for (const path of paths) {
    assert.equal(canonicalArticlePath(path), path);
    const response = await worker.fetch(new Request(`https://equip.jesusonline.com${path}`), {
      ASSETS: { fetch: async request => {
        assert.equal(new URL(request.url).pathname, path);
        return new Response("source", { status: 200 });
      } },
    }, {});
    assert.equal(response.status, 200, path);
  }
});

function normalizedText(html) {
  return decodeHTML(html.replace(/<br\b[^>]*>|<\/(?:p|h2|ul|li)>/gi, " ")
    .replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

function localBlockText(block) {
  switch (block.type) {
    case "p": return normalizedText(block.html);
    case "h2": return normalizedText(block.text);
    case "ul": return block.items.map(normalizedText).join(" ");
    default: assert.fail(`unsupported authoritative block: ${block.type}`);
  }
}

test("all six approved local bodies, generated source records and PDF assets are retained", () => {
  assert.equal(authoritativeArticles.length, 6);
  for (const { local, generated } of authoritativeArticles) {
    assert.equal(local.subId, "attributes-of-god");
    assert.equal(generated.subId, "bb-growing-closer-majesty");
    assert.ok(local.blocks.length > 0);
    assert.notDeepEqual(local.blocks, generated.blocks, local.id);
    for (const block of local.blocks) assert.ok(localBlockText(block), `${local.id}: empty block`);
    assert.ok(local.pdf?.startsWith("/articles/") && local.pdf.endsWith(".pdf"), local.id);
  }
  for (const pdf of pdfPaths) {
    assert.ok(existsSync(resolve(root, "public", "." + pdf)), `missing source PDF: ${pdf}`);
    assert.ok(readFileSync(resolve(root, "public", "." + pdf)).subarray(0, 5).equals(Buffer.from("%PDF-")), pdf);
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

test("production build: all survivors/topics exist, retired pages/links/sitemap/search entries absent", {
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
  for (const { local, generated } of authoritativeArticles) {
    const survivor = `/categories/growth/attributes-of-god/${local.id}`;
    const html = readFileSync(resolve(dist, "." + survivor, "index.html"), "utf8");
    const articleHtml = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
    assert.ok(articleHtml, `missing rendered article body: ${survivor}`);
    const body = normalizedText(articleHtml);
    const expected = local.blocks.map(localBlockText).join(" ");
    assert.ok(body.includes(expected), `complete local manuscript must render in order: ${survivor}`);
    for (const block of local.blocks) {
      assert.ok(body.includes(localBlockText(block)), `missing local ${block.type} block: ${survivor}`);
    }
    // Require the authored body and reject distinctive stale generated prose,
    // rather than merely checking a heading or the canonical URL.
    for (const block of generated.blocks.filter(block => block.type === "p")) {
      const stale = normalizedText(block.html);
      if (stale && !expected.includes(stale)) {
        assert.ok(!body.includes(stale), `stale generated Majesty paragraph: ${survivor}`);
      }
    }
    assert.ok(html.includes(`href="${local.pdf}"`), `missing authoritative PDF link: ${survivor}`);
  }
  for (const pdf of pdfPaths) {
    const source = resolve(root, "public", "." + pdf);
    const built = resolve(dist, "." + pdf);
    assert.ok(existsSync(built), `missing copied PDF: ${pdf}`);
    assert.deepEqual(readFileSync(built), readFileSync(source), `PDF copy must be byte-identical: ${pdf}`);
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
});