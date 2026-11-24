// Explicit maintenance command, never a network-dependent part of normal builds.
// Usage: node scripts/generate-bible-search.mjs /path/to/en_kjv.json
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { CHAPTER_VERSES, canonicalBook } from "../worker/bible-catalog.js";
import { NET_OMISSIONS, ATTRIBUTION } from "../worker/bible.js";

const root = new URL("../", import.meta.url);
const out = new URL("public/knowing-god/bible-search/", root);
const hash = text => createHash("sha256").update(text).digest("hex");
const kjvRaw = await fs.readFile(process.argv[2], "utf8");
const kjv = JSON.parse(kjvRaw.replace(/^\uFEFF/, ""));
const names = Object.keys(CHAPTER_VERSES);
if (kjv.length !== 66) throw new Error("KJV source must contain all 66 books");
const manifest = { schemaVersion: 1, translations: {} };
await fs.mkdir(out, { recursive: true });
for (const translation of ["net", "kjv"]) {
  const files = [];
  let count = 0, bytes = 0, gzipBytes = 0;
  for (const [bookIndex, book] of names.entries()) {
    const slug = book.toLowerCase().replace(/\s+/g, "-");
    let rows, raw;
    if (translation === "net") {
      raw = await fs.readFile(new URL(`scripts/data/net-cache/${slug}.json`, root), "utf8");
      rows = JSON.parse(raw).map(r => {
        if (canonicalBook(r.bookname) !== book) throw new Error(`Wrong NET book: ${book}`);
        return [Number(r.chapter), Number(r.verse), r.text.replace(/<[^>]*>/g, "").trim()];
      });
    } else {
      if (canonicalBook(kjv[bookIndex].name) !== book) throw new Error(`Wrong KJV book: ${book}`);
      raw = JSON.stringify(kjv[bookIndex]);
      rows = kjv[bookIndex].chapters.flatMap((verses, c) => verses.map((text, v) => [c + 1, v + 1, text]));
    }
    const found = new Map();
    for (const [chapter, verse, text] of rows) {
      const key = `${chapter}:${verse}`;
      if (found.has(key) || !Number.isInteger(verse) || verse < 1 ||
          verse > (CHAPTER_VERSES[book][chapter - 1] ?? 0) || typeof text !== "string") {
        throw new Error(`Invalid or duplicate ${translation} coordinate: ${book} ${key}`);
      }
      found.set(key, text);
    }
    for (const [c, max] of CHAPTER_VERSES[book].entries()) {
      for (let v = 1; v <= max; v++) {
        const omitted = translation === "net" && (NET_OMISSIONS[`${book} ${c + 1}`] ?? []).includes(v);
        const text = found.get(`${c + 1}:${v}`);
        if (!text?.trim() && !omitted) throw new Error(`Incomplete ${translation}: ${book} ${c + 1}:${v}`);
        if (text?.trim() && omitted) throw new Error(`Review unexpected NET coordinate: ${book} ${c + 1}:${v}`);
      }
    }
    rows = rows.filter(r => r[2].trim()).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const payload = JSON.stringify(rows);
    const file = `${translation}-${slug}.${hash(payload).slice(0, 12)}.json`;
    await fs.writeFile(new URL(file, out), payload);
    files.push({ book, file, verses: rows.length, sourceSha256: hash(raw) });
    count += rows.length;
    bytes += Buffer.byteLength(payload);
    gzipBytes += gzipSync(payload).length;
  }
  manifest.translations[translation] = {
    files, verses: count, bytes, gzipBytes,
    source: translation === "net" ? "https://labs.bible.org/api/" : "https://github.com/thiagobodruk/bible/blob/master/json/en_kjv.json",
    attribution: ATTRIBUTION[translation],
    ...(translation === "net" ? { omissions: NET_OMISSIONS,
      numberingNote: "NET main-text omissions are preserved. In 2 Corinthians 13, NET combines traditional verses 12–13 and numbers the benediction 13, not 14. This source retains 3 John 1:15 wording within verse 14. Traditional coordinates absent from NET main text: " +
        Object.entries(NET_OMISSIONS).map(([chapter, verses]) => `${chapter}:${verses.join(", ")}`).join("; ") + "." } : {}),
  };
  console.log(translation, { count, bytes, gzipBytes });
}
await fs.writeFile(new URL("manifest.json", out), JSON.stringify(manifest));
