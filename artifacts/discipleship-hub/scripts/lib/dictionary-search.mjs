// Full-text search file for Easton's Bible Dictionary (/bible/dictionary).
// Built from the generated entries alone, so it can be rebuilt offline from the
// committed src/data/bible-dictionary/entries.json (scripts/build-dictionary-search.mjs)
// and is also written by scripts/generate-bible-dictionary.mjs.
//
// Payload: [[slug, title, text], ...] in entry order, where text is the entry's
// readable text (paragraphs joined by a space, scripture references kept as printed).
import { createHash } from "node:crypto";

const segText = s => (typeof s === "string" ? s : s[0]);

/** Readable text of one entry, as shown on its page. */
export const dictEntryPlainText = e =>
  e.paras.map(p => p.slice(1).map(segText).join("")).join(" ").replace(/\s+/g, " ").trim();

/** JSON payload and its 10-character content hash. */
export function dictionarySearchFile(entries) {
  const payload = JSON.stringify(entries.map(e => [e.slug, e.title, dictEntryPlainText(e)]));
  return { payload, hash: createHash("sha256").update(payload).digest("hex").slice(0, 10) };
}
