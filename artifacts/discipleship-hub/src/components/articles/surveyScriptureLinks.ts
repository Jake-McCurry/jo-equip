/**
 * Scripture auto-linking for Survey of the Bible lessons (OT + NT) ONLY.
 *
 * Book context is passed per article (resolved from the article title, e.g.
 * "Hebrews" for the `hebrew` lesson). Rules:
 * - Named refs ("Psalm 110:4", "1Peter 3:20-21", "Romans 4:3, 9, 22") always
 *   link their own canonical book — never the lesson's book.
 * - Bare refs ("3:15", "1:1-2:6") resolve to the lesson's book only when the
 *   lesson covers exactly one book. Grouped / introductory lessons pass
 *   `null` and bare refs stay plain text (no guessed default).
 * - "chapter(s) N" / "chapters N-M" link the lesson's book (single-book only).
 * - Verse-only refs ("vs. 25") are never linked: no explicit chapter.
 * - Malformed/ambiguous refs (verse beyond the chapter, "25:7:7-10",
 *   "1st John 3:2" written with an ordinal, "Thessalonians 4:13" missing its
 *   number) are left untouched. Visible text is never altered — only wrapped.
 */
import { BOOKS, CHAPTER_VERSES, canonicalBook } from "../../../worker/bible-catalog.js";

const verses = CHAPTER_VERSES as Record<string, number[]>;

const bookAlternation = [...BOOKS.map((b: { name: string }) => b.name), "Psalm"]
  .sort((a, b) => b.length - a.length)
  .map(n => n.replace(/ /g, "\\s+").replace(/^(\d)\\s\+/, "$1\\s*"))
  .join("|");

// [1] book? [2] chapter [3] verse [4] end-a [5] end-b (verse when cross-chapter) [6] list tail
const REF = new RegExp(
  `(?:\\b(${bookAlternation})\\s+)?(?<![\\d:])(\\d{1,3}):(\\d{1,3})(?:-(\\d{1,3})(?::(\\d{1,3}))?)?((?:,\\s*\\d{1,3}(?:-\\d{1,3})?)*)(?![\\d]|:\\d)`,
  "g",
);
const CHAPTERS = /\b([Cc]hapters?\s+)(\d{1,3})(-\d{1,3}|\s+and\s+\d{1,3})?(?![:\d])/g;
const BOOK_BEFORE = new RegExp(`\\b(?:${bookAlternation})\\s*$`);
/* "1st John", "Second Kings": the ordinal makes a bare book name ambiguous. */
const ORDINAL_BEFORE = /(?:\d\s*(?:st|nd|rd|th)?|\b(?:first|second|third))\s*$/i;
/* A capitalised word right before a bare ref is usually a book we don't
   recognise ("Thessalonians 4:13" after "1<sup>st</sup>"). Skip those. */
const WORD_BEFORE = /\b([A-Z][a-z]+)\s+$/;
const SAFE_WORDS = new Set(["Vs", "Vss", "VS", "See", "Verse", "Verses", "Chapter", "Chapters", "In", "And", "Also", "Compare", "Cf", "Read", "Then", "From"]);

function validRef(book: string, ch: number, v: number, endA?: number, endB?: number, tail = ""): boolean {
  const vs = verses[book];
  if (!vs || !vs[ch - 1] || v < 1 || v > vs[ch - 1]) return false;
  if (endA !== undefined) {
    if (endB !== undefined) {
      if (endA <= ch || !vs[endA - 1] || endB < 1 || endB > vs[endA - 1]) return false;
    } else if (endA <= v || endA > vs[ch - 1]) return false;
  }
  for (const n of tail.match(/\d+/g) ?? []) if (Number(n) > vs[ch - 1]) return false;
  return true;
}

function href(base: string, book: string, chapter: number, verse?: number) {
  const q = new URLSearchParams({ book, chapter: String(chapter) });
  if (verse) q.set("verse", String(verse));
  q.set("translation", "net");
  return `${base}/bible?${q.toString().replace(/&/g, "&amp;")}`;
}

function a(url: string, label: string, title: string, ranges: number[][]) {
  return `<a href="${url}" class="scripture-ref" data-preview-ranges="${JSON.stringify(ranges)}" target="_blank" rel="noopener" title="${title} (opens the Bible reader in a new tab)">${label}</a>`;
}

function linkText(text: string, base: string, context: string | null, prev: string): string {
  const out = text.replace(REF, (m, bookRaw, c, v, eA, eB, tail, offset: number) => {
    const before = prev + text.slice(0, offset);
    let book: string | null;
    if (bookRaw) {
      if (!/^\d/.test(bookRaw) && ORDINAL_BEFORE.test(before)) return m;
      book = canonicalBook(bookRaw.replace(/^(\d)\s*/, "$1 "));
    } else {
      const w = before.match(WORD_BEFORE);
      if (w && !SAFE_WORDS.has(w[1])) return m;
      book = context;
    }
    if (!book) return m;
    const ch = Number(c), vs = Number(v);
    if (!validRef(book, ch, vs, eA ? Number(eA) : undefined, eB ? Number(eB) : undefined, tail ?? "")) return m;
    const endChapter = eB ? Number(eA) : ch;
    const ranges = Array.from({ length: endChapter - ch + 1 }, (_, i) => {
      const chapter = ch + i;
      return [chapter, i === 0 ? vs : 1, chapter === endChapter ? Number(eB || eA || vs) : verses[book!][chapter - 1]];
    });
    for (const part of (tail ?? "").split(",").filter((s: string) => s.trim())) {
      const [start, end] = part.trim().split("-").map(Number);
      ranges.push([ch, start, end || start]);
    }
    return a(href(base, book, ch, vs), m, `${book} ${ch}:${vs}`, ranges);
  });
  if (!context) return out;
  const book = context;
  // Chapter phrases are only linked outside anchors we just created.
  let seen = prev;
  return out
    .split(/(<a [^>]*>.*?<\/a>)/)
    .map(seg => {
      if (seg.startsWith("<a ")) { seen += seg.replace(/<[^>]+>/g, ""); return seg; }
      const res = seg.replace(CHAPTERS, (m, pre, c, rest = "", offset: number) => {
        if (BOOK_BEFORE.test(seen + seg.slice(0, offset))) return m;
        const ch = Number(c);
        const count = verses[book].length;
        if (ch < 1 || ch > count) return m;
        const isAnd = /and/.test(rest);
        const end = isAnd ? ch : Number(rest.match(/\d+/)?.[0] || ch);
        if (end < ch || end > count) return m;
        const ranges = Array.from({ length: end - ch + 1 }, (_, i) => [ch + i, 1, verses[book][ch + i - 1]]);
        // "chapters 45 and 53": link the first chapter only; keep the rest as text.
        const label = isAnd ? c : `${c}${rest}`;
        return `${pre}${a(href(base, book, ch), label, `${book} ${ch}`, ranges)}${isAnd ? rest : ""}`;
      });
      seen += seg;
      return res;
    })
    .join("");
}

/** Link refs in an HTML string, touching text nodes only (tags untouched). */
export function linkSurveyScripture(html: string, base: string, book: string | null): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  let prev = "";
  return html
    .split(/(<[^>]+>)/)
    .map(part => {
      if (part.startsWith("<")) return part;
      const res = linkText(part, b, book, prev.slice(-24));
      prev += part;
      return res;
    })
    .join("");
}

/** Single-book context for a lesson title, or null for grouped/intro lessons. */
export function surveyBookContext(title: string): string | null {
  const t = title.trim();
  if (/&|\band\b|introduction/i.test(t)) return null;
  return canonicalBook(t === "Hebrew" ? "Hebrews" : t);
}
