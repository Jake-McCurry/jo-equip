// Shared file format for the locally hosted commentaries and cross-references
// (generator, build validation, and browser loader).
// Verse codes match the Strong's data: book * 1_000_000 + chapter * 1_000 + verse
// (book is 1-based canonical order; verse 0 = the whole chapter).

export const COMMENTARIES = [
  { id: "mhc", name: "Matthew Henry", full: "Matthew Henry’s Commentary on the Whole Bible (1706–1721)", scope: "Whole Bible" },
  { id: "jfb", name: "Jamieson-Fausset-Brown", full: "Jamieson, Fausset & Brown, Commentary Critical and Explanatory on the Whole Bible (1871)", scope: "Whole Bible" },
  { id: "barnes", name: "Barnes", full: "Albert Barnes, Notes on the New Testament (1832–1851)", scope: "New Testament only" },
] as const;
export type CommentaryId = (typeof COMMENTARIES)[number]["id"];
export const isCommentaryId = (v: unknown): v is CommentaryId => COMMENTARIES.some(c => c.id === v);

/** Inline flags: 1 italic, 2 bold, 4 small caps. */
export type Seg = string | [text: string, flags: number] | [text: string, flags: number, from: number, to?: number];
/** p = paragraph, h = heading, q = quotation/poetry, n = footnote. */
export type Para = [kind: "p" | "h" | "q" | "n", ...segs: Seg[]];
/** [first verse, last verse, paragraphs]: one comment can cover a range of verses. */
export type CommentEntry = [from: number, to: number, paras: Para[]];
export type CommentaryChapter = { i?: Para[]; e: CommentEntry[] };

/** [from, to (0 = single verse), OpenBible votes (-1 = TSK only), TSK keyword index (-1 = none)]. */
export type XrefRow = [from: number, to: number, votes: number, word: number];
export type XrefChapter = Record<string, { w?: string[]; r: XrefRow[] }>;

export type CommentaryManifest = {
  schemaVersion: 1;
  commentaries: Record<CommentaryId, { books: Record<string, { intro?: string; chapters: string[] }> }>;
  xrefs: Record<string, string>;
  stats: Record<string, unknown>;
  sources: { file: string; sha256: string }[];
};

export const decodeCode = (code: number) => ({ book: Math.floor(code / 1_000_000), chapter: Math.floor(code / 1_000) % 1_000, verse: code % 1_000 });
