import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const landing = read("src/pages/lp/[lpId].astro");
const home = read("src/pages/index.astro");

test("ENG-2 alone aliases the homepage carousel after trailing-slash normalization", () => {
  const source = read("src/data/topicCarousels.ts");
  // Execute the actual lookup with a tiny fixture; destination resolution stays
  // covered by rendered parity below, without importing the full content graph.
  const lookup = source.slice(source.indexOf("  const key ="), source.lastIndexOf("}"));
  const get = new Function("path", "carousels", "resolve", lookup);
  const carousels = { "/": { label: "Home", items: [{ label: "Bible", to: "/bible" }] },
    "/categories/growth": { label: "Growth", items: [] } };
  const run = path => get(path, carousels, to => to);
  for (const path of ["/lp/ENG-2-resources", "/lp/ENG-2-resources/"]) {
    assert.deepEqual(run(path), run("/"));
  }
  for (const path of ["/lp/ENG-1-resources", "/lp/ENG-1-resources/", "/lp/other", "/books"]) {
    assert.equal(run(path), null);
  }
  assert.equal(run("/categories/growth/").label, "Growth");
});

test("campaign keeps metadata, shared spacing, mobile-only panel and original destinations", () => {
  assert.match(landing, /const isEng2 = Astro.params.lpId === "ENG-2-resources"/);
  assert.match(landing, /name="robots" content="noindex, follow"/);
  assert.match(landing, /var\(--section-space-mobile\)/);
  assert.match(landing, /var\(--section-space-desktop\)/);
  assert.match(landing, /isEng2 && \(\s*<section[^>]+lg:hidden/);
  assert.ok(!landing.includes("Find out more"));
  assert.match(landing, /isEng2 \? "--section-space-mobile:0.5rem;--section-space-desktop:0.75rem;"/);
  assert.match(landing, /\.eng2-resources > section\.bg-white\s*\{\s*--section-space-mobile: 1rem;\s*--section-space-desktop: 1.5rem;/);
  assert.match(home, /--section-space-mobile:1rem;--section-space-desktop:1.25rem;/);
  const copy = "A free Leader Kit for pastors and home church leaders with 5-minute Discipleship Moments—all ready to teach and encourage heart transformation";
  assert.ok(landing.includes(copy) && home.includes(copy));
  assert.ok(landing.includes("join('/lp/leader-kits-0')"));
  const sitemap = read("scripts/build-sitemaps.mjs");
  assert.match(sitemap, /\/lp\//);
  const layout = read("src/layouts/Layout.astro");
  assert.match(layout, /sticky top-0 z-50 w-full/);
});

const base = process.env.TEST_SITE_URL;
test("rendered campaigns preserve resources and isolate hero, labels, navigation and panel", { skip: !base }, async () => {
  const fetchPage = async path => {
    const res = await fetch(new URL(path, base));
    assert.equal(res.status, 200, path);
    return res.text();
  };
  const [homeHtml, eng1, eng2, slash] = await Promise.all(
    ["/", "/lp/ENG-1-resources", "/lp/ENG-2-resources", "/lp/ENG-2-resources/"].map(fetchPage),
  );
  const main = html => html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)[1];
  const carousel = html => html.match(/<nav\b[^>]*data-topic-carousel[\s\S]*?<\/nav>/)?.[0];
  assert.equal(carousel(eng1), undefined);
  assert.equal(carousel(eng2), carousel(homeHtml));
  assert.equal(carousel(slash), carousel(eng2));
  const title = "Apologetics, identity-centered discipleship";
  assert.equal(main(eng2).split(title).length - 1, 0);
  assert.ok(main(homeHtml).includes(title), "homepage hero subtitle remains");
  for (const removed of ["Find out more", "Free PDF downloads suitable for personal reading", "Sermon resources for pastors: video series"]) {
    assert.ok(!main(eng2).includes(removed), removed);
  }
  assert.ok(main(eng1).includes("Free PDF downloads suitable for personal reading"));
  assert.ok(main(eng1).includes("Sermon resources for pastors: video series"));
  assert.ok(!main(eng1).includes(title));
  assert.ok(!main(eng1).includes("data-leader-kit"));
  assert.match(main(eng1), />Books<\/h2>/);
  assert.match(main(eng1), />Playlists<\/h2>/);
  const e2 = main(eng2);
  const ordered = ["Free Books</h2>", "Video Playlists</h2>", 'href="/categories/church"', "data-leader-kit", ">Reviews</div>"];
  let previous = -1;
  for (const token of ordered) {
    const position = e2.indexOf(token);
    assert.ok(position > previous, token);
    previous = position;
  }
  const resources = html => [...main(html).matchAll(/href="([^"]*(?:\/books|\/playlist)[^"]*)"/g)].map(match => match[1]);
  assert.deepEqual(resources(eng2), resources(eng1));
  for (const html of [eng1, eng2, slash]) assert.match(html, /name="robots" content="noindex, follow"/);
  for (const path of ["pastors", "home-church-leaders", "chaplains", "missionaries"]) {
    assert.ok(e2.includes(`href="/${path}"`));
  }
});
