export const CHAPTER_VERSES: Record<string, number[]>;
export const BOOKS: { name: string; chapters: number }[];
export function canonicalBook(value: unknown): string | null;