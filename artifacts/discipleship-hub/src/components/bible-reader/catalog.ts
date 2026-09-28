import { BOOKS, canonicalBook, CHAPTER_VERSES } from "../../../worker/bible-catalog.js";
export { BOOKS };
type Chapter = { book: string; chapter: number };
export function getNextChapter(book: string, chapter: number): Chapter | null {
  const index = BOOKS.findIndex(b => b.name === canonicalBook(book));
  if (index < 0 || !Number.isInteger(chapter) || chapter < 1 || chapter > BOOKS[index].chapters) return null;
  if (chapter < BOOKS[index].chapters) return { book: BOOKS[index].name, chapter: chapter + 1 };
  return BOOKS[index + 1] ? { book: BOOKS[index + 1].name, chapter: 1 } : null;
}
export function getPreviousChapter(book: string, chapter: number): Chapter | null {
  const index = BOOKS.findIndex(b => b.name === canonicalBook(book));
  if (index < 0 || !Number.isInteger(chapter) || chapter < 1 || chapter > BOOKS[index].chapters) return null;
  if (chapter > 1) return { book: BOOKS[index].name, chapter: chapter - 1 };
  return BOOKS[index - 1] ? { book: BOOKS[index - 1].name, chapter: BOOKS[index - 1].chapters } : null;
}
export function parseReference(input: string): (Chapter & { verse?: number }) | null {
  const match = input.trim().match(/^(.+?)\s+([1-9]\d*)(?::([1-9]\d*))?$/);
  const book = canonicalBook(match?.[1] ?? input);
  if (!book) return null;
  const chapter = match ? Number(match[2]) : 1;
  const verse = match?.[3] ? Number(match[3]) : undefined;
  const max = CHAPTER_VERSES[book][chapter - 1];
  if (!CHAPTER_VERSES[book][chapter - 1] || (verse && verse > max)) return null;
  return { book, chapter, ...(verse ? { verse } : {}) };
}