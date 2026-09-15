import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const luminance = hex => {
  const c = hex.match(/[a-f\d]{2}/gi).map(v => parseInt(v, 16) / 255)
    .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
};
const contrast = (a, b) => {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + .05) / (values[1] + .05);
};

test("the brand foundation matches the authoritative palette", async () => {
  const tokens = await read("src/styles/brand-tokens.css");
  const palettes = {
    blue: ["e6f5ff", "ccebff", "99d6ff", "66c2ff", "33adff", "0095ff", "0084e6", "007ae0", "006bb3", "004e8a", "003a66"],
    warm: ["fff6f0", "ffeadb", "ffd2b3", "ffb580", "ee9c5d", "e87722", "e66000", "c45100", "994000", "662b00"],
  };
  const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  for (const [name, colors] of Object.entries(palettes)) {
    colors.forEach((value, i) => assert.ok(tokens.includes(`--${name}-${steps[i]}: #${value};`)));
  }
  assert.match(tokens, /--color-selected-warm: var\(--warm-100\)/);
});

test("font faces are self-hosted valid WOFF2 with both licenses retained", async () => {
  const fonts = await read("src/styles/fonts.css");
  assert.match(fonts, /font-family: 'Playfair Display'/);
  assert.match(fonts, /font-weight: 600 700/);
  assert.match(fonts, /font-family: 'Source Sans 3'/);
  assert.match(fonts, /font-weight: 400 700/);
  assert.match(fonts, /font-style: italic/);
  assert.doesNotMatch(fonts, /https?:\/\//);
  const urls = [...fonts.matchAll(/url\("([^"]+)"\)/g)];
  assert.ok(urls.length > 0);
  for (const [, path] of urls) {
    const bytes = await readFile(new URL(path, new URL("src/styles/fonts.css", root)));
    assert.equal(bytes.subarray(0, 4).toString(), "wOF2");
  }
  for (const family of ["Playfair-Display", "Source-Sans-3"]) {
    assert.match(await read(`src/assets/fonts/${family}-OFL.txt`), /SIL OPEN FONT LICENSE/);
  }
});

test("text pairings meet the kit's AA thresholds", async () => {
  assert.ok(contrast("#ffffff", "#0095ff") >= 3);
  assert.ok(contrast("#ffffff", "#006bb3") >= 4.5);
  assert.ok(contrast("#ffffff", "#c45100") >= 4.5);
  assert.ok(contrast("#003a66", "#ffeadb") >= 4.5);
  assert.ok(contrast("#2e5a7a", "#fffdfb") >= 4.5);
  const header = await read("src/components/EquipHeader.astro");
  assert.match(header, /text-\[19px\] font-bold/);
  assert.match(header, /navColor = "#0095ff"/);
});

test("Knowing God alone uses the book's heading font and a prominent linked credit", async () => {
  const theme = await read("src/styles/knowing-god-theme.css");
  assert.match(theme, /--font-knowing-god-heading: Georgia,/);
  assert.match(theme, /\.kg-warm-theme :is\(h1, h2, h3, h4, h5, h6\)/);
  assert.match(theme, /font-weight: 700 !important/);
  const global = await read("src/styles/global.css");
  assert.match(global, /--font-display: "Playfair Display"/);
  assert.match(global, /--font-sans: "Source Sans 3"/);
  const reader = await read("src/components/knowing-god/ConcordancePrototype.tsx");
  assert.match(reader, /text-lg font-semibold[^>]*><a href="https:\/\/www\.zmission\.org\/our-story\.html"/);
  assert.match(reader, />© 2026 by Zinzendorf Mission<\/a>/);
  const publication = await read("src/pages/knowing-god/introduction/[section].astro");
  assert.match(publication, /class="kg-copyright-link" href="https:\/\/www\.zmission\.org\/our-story\.html"/);
});