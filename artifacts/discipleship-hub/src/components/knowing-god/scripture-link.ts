import { canonicalBook, CHAPTER_VERSES } from "../../../worker/bible-catalog.js";

/** Open the starting verse (or chapter), including ranges and single-chapter books. */
export function scriptureReaderPath(reference: string, translation: "NET" | "KJV"): string {
  const match = reference.trim().match(/^(.+?)\s+(\d+)(?:\s*:\s*(\d+))?/);
  const bookName = (match?.[1] ?? "").replace(/^(III|II|I)\s+/i, numeral =>
    `${({ I: 1, II: 2, III: 3 } as Record<string, number>)[numeral.trim().toUpperCase()]} `);
  // These two source labels omit "1"; their quoted passages identify 1 Kings.
  const omittedKingsPrefix = reference === "Kings 8:1-6" || reference === "Kings 1:5-6";
  const book = canonicalBook(omittedKingsPrefix ? "1 Kings" : bookName);
  if (!match || !book) throw new Error(`Unknown Scripture reference: ${reference}`);
  const chapter = CHAPTER_VERSES[book].length === 1 ? 1 : Number(match[2]);
  if (!CHAPTER_VERSES[book][chapter - 1]) throw new Error(`Invalid Scripture chapter: ${reference}`);
  const verse = match[3] ? Number(match[3])
    : CHAPTER_VERSES[book].length === 1 && Number(match[2]) !== 1 ? Number(match[2]) : undefined;
  if (verse !== undefined && (verse < 1 || verse > CHAPTER_VERSES[book][chapter - 1])) {
    throw new Error(`Invalid Scripture verse: ${reference}`);
  }
  const query = new URLSearchParams({ book, chapter: String(chapter), translation: translation.toLowerCase() });
  if (verse !== undefined) query.set("verse", String(verse));
  return `/bible?${query}`;
}
