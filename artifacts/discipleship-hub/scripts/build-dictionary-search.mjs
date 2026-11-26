// Rebuilds the dictionary full-text search file from the committed entries
// (no source download needed): node scripts/build-dictionary-search.mjs
// Writes public/bible-data/dictionary/search.<hash>.json, removes any older
// search file, and records the hash in src/data/bible-dictionary/manifest.json.
import fs from "node:fs";
import { dictionarySearchFile } from "./lib/dictionary-search.mjs";

const root = new URL("../", import.meta.url);
const dir = new URL("public/bible-data/dictionary/", root);
const manifestUrl = new URL("src/data/bible-dictionary/manifest.json", root);
const entries = JSON.parse(fs.readFileSync(new URL("src/data/bible-dictionary/entries.json", root), "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestUrl, "utf8"));

const { payload, hash } = dictionarySearchFile(entries);
for (const f of fs.readdirSync(dir)) if (/^search\.[0-9a-f]{10}\.json$/.test(f)) fs.rmSync(new URL(f, dir));
fs.writeFileSync(new URL(`search.${hash}.json`, dir), payload);
manifest.files.search = hash;
fs.writeFileSync(manifestUrl, JSON.stringify(manifest, null, 1) + "\n");
console.log(`search.${hash}.json: ${entries.length} entries, ${(payload.length / 1024).toFixed(0)} KB`);
