import { canonicalBook, CHAPTER_VERSES } from "../../../worker/bible-catalog.js";

/** Open the first chapter of a reference, including ranges and single-chapter books. */
export function scriptureReaderPath(reference: string, translation: "NET" | "KJV"): string {
  const match = reference.trim().match(/^(.+?)\s+(\d+)/);
  const bookName = (match?.[1] ?? "").replace(/^(III|II|I)\s+/i, numeral =>
    `${({ I: 1, II: 2, III: 3 } as Record<string, number>)[numeral.trim().toUpperCase()]} `);
  // These two source labels omit "1"; their quoted passages identify 1 Kings.
  const omittedKingsPrefix = reference === "Kings 8:1-6" || reference === "Kings 1:5-6";
  const book = canonicalBook(omittedKingsPrefix ? "1 Kings" : bookName);
  if (!match || !book) throw new Error(`Unknown Scripture reference: ${reference}`);
  const chapter = CHAPTER_VERSES[book].length === 1 ? 1 : Number(match[2]);
  if (!CHAPTER_VERSES[book][chapter - 1]) throw new Error(`Invalid Scripture chapter: ${reference}`);
  return `/bible?${new URLSearchParams({ book, chapter: String(chapter), translation: translation.toLowerCase() })}`;
}
