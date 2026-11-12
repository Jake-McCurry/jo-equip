import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, relative } from "node:path";
import { defaultRobotsDirective } from "../src/data/robotsMeta.mjs";

test("default robots directives distinguish production from development", () => {
  assert.equal(defaultRobotsDirective(), "index, follow");
  assert.equal(defaultRobotsDirective("", true), "noindex, follow");
  assert.equal(defaultRobotsDirective('<!-- <meta name="robots" content="noindex"> -->'), "index, follow");
});

test("existing page directives are preserved without adding a duplicate", () => {
  for (const directive of ["noindex, follow", "noindex, nofollow", "index, follow", "noindex, max-snippet:0"]) {
    assert.equal(defaultRobotsDirective(`<meta content='${directive}' name='robots' />`), null);
  }
  assert.throws(() => defaultRobotsDirective('<meta name="robots">'), /no directive/);
  assert.throws(() => defaultRobotsDirective('<meta name="robots" content="noindex"><meta name="robots" content="index">'), /Multiple/);
});

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = resolve(root, "dist");
function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? htmlFiles(path) : path.endsWith(".html") ? [path] : [];
  });
}

test("every built HTML page has one correct head robots tag and retains its canonical", {
  skip: process.env.VERIFY_ROBOTS_BUILD !== "1",
}, () => {
  let pages = 0, redirects = 0, excluded = 0;
  for (const path of htmlFiles(dist)) {
    const html = readFileSync(path, "utf8");
    // Astro redirect stubs omit the explicit <head> wrapper.
    if (/<meta\b[^>]*http-equiv=["']refresh["']/i.test(html)) { redirects++; continue; }
    const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
    assert.ok(head, path);
    const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
    const robots = tags.filter(tag => /\bname=["']robots["']/i.test(tag));
    assert.equal(robots.length, 1, path);
    assert.ok(head.includes(robots[0]), `robots must be in head: ${path}`);
    assert.ok(!tags.some(tag => /\bname=["']googlebot["']/i.test(tag)), path);
    const content = robots[0].match(/\bcontent=["']([^"']+)["']/i)?.[1];
    const route = "/" + relative(dist, path).replace(/\\/g, "/").replace(/(?:^|\/)index\.html$/, "").replace(/\.html$/, "");
    const noindex = route === "/404" || route === "/search"
      || route === "/thank-you" || route === "/register-church-thank-you"
      || route.startsWith("/lp/")
      || /^\/categories\/growth\/ministry-holy-spirit(?:\/|$)/.test(route);
    const nofollow = ["/lp/leader-kits-1/thank-you", "/lp/leader-kits-3/thank-you", "/lp/leader-kits-2/signup"].includes(route);
    assert.equal(content, noindex ? `noindex, ${nofollow ? "nofollow" : "follow"}` : "index, follow", route);
    assert.ok(/<link\b[^>]*rel=["']canonical["']/i.test(head), `canonical retained: ${route}`);
    pages++;
    if (noindex) excluded++;
  }
  assert.ok(pages > 1000, `expected complete production output; got ${pages}`);
  console.log(`Robots verified: ${pages} content pages, ${excluded} noindex pages, ${redirects} redirect stubs.`);
  const robotsTxt = readFileSync(resolve(root, "public/robots.txt"), "utf8");
  assert.match(robotsTxt, /Allow: \//);
  assert.doesNotMatch(robotsTxt, /Disallow:\s*\/(?:search|lp|thank-you|categories)/);
});
