// Shared file-format helpers for the Strong's word-study data
// (generator, build validation, and browser loader).

export const SHARD_SIZE = 100;

/** Book index is 1-based canonical order. */
export const verseCode = (book: number, chapter: number, verse: number) => book * 1_000_000 + chapter * 1_000 + verse;
export const decodeVerse = (code: number) => ({ book: Math.floor(code / 1_000_000), chapter: Math.floor(code / 1_000) % 1_000, verse: code % 1_000 });

export const bookSlug = (book: string) => book.toLowerCase().replace(/\s+/g, "-");

/** "G0025", "g25", " H430 " -> "G25" / "H430"; anything else -> null. */
export function normalizeStrongs(value: string | null | undefined): string | null {
  const m = /^\s*([HGhg])0*([1-9]\d{0,3})\s*$/.exec(value ?? "");
  return m ? `${m[1].toUpperCase()}${m[2]}` : null;
}

export const shardOf = (num: string) => `${num[0]}${Math.floor(Number(num.slice(1)) / SHARD_SIZE)}`;

/** Lexicon `v` lists are delta-encoded, sorted verse codes. */
export function expandVerses(deltas: readonly number[]) {
  let acc = 0;
  return deltas.map(d => (acc += d));
}

export type WordRow = [original: string, translit: string, strongs: string, gloss: string, flag?: "t" | "n" | "r"];
export type ChapterData = { w: Record<string, WordRow[]>; k: Record<string, [string, string][]> };
export type LexEntry = {
  l: string; x: string; p?: string; d?: string; s: string; k: string; g?: string; t?: string;
  r: [string, number][]; v: number[]; n?: 1;
};
export type StrongsManifest = {
  schemaVersion: 1; shardSize: number;
  chapters: Record<string, string>; lexicon: Record<string, string>;
  stats: Record<string, unknown>; sources: { file: string; sha256: string }[];
};
