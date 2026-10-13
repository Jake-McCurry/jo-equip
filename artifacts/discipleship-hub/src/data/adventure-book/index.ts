/* Web-book prototype content for "The Adventure of Living with Jesus".
 *
 * adventure-book.json is GENERATED from the current approved PDF
 * (public/books/adventure-of-living-with-jesus.pdf) by
 * scripts/extract-adventure-book.py — do not hand-edit it; rerun the script
 * whenever the PDF changes. This module adds derived, presentation-only data
 * (section anchors, read-time estimates, ordering) and the Scripture linker.
 */
import raw from "./adventure-book.json";
import { BOOKS, canonicalBook, CHAPTER_VERSES } from "../../../worker/bible-catalog.js";

export type Inline = string; // sanitized inline HTML: <strong>, <em>, <a> only

export type Block =
  | { t: "p"; html: Inline }
  | { t: "h2"; text: string; id?: string }
  | { t: "quote"; kind: "scripture" | "excerpt"; html: Inline }
  | { t: "question"; html: Inline }
  | { t: "ul"; items: Inline[] }
  | { t: "panel"; blocks: Block[] }
  | { t: "callout"; kind: "story" | "info" | "note"; title: string | null; blocks: Block[] }
  | { t: "table"; head: string[]; rows: string[][] }
  | { t: "figure"; src: string; alt: string; width: number; height: number; pdfPage: number; wide: boolean; caption?: string; href?: string }
  | { t: "continue"; note: string }
  | { t: "deeper"; label: string; optional: boolean; title: string; desc: string; url: string };

export interface Reading {
  slug: string;
  title: string;
  number: number | null;
  pdfPage: number;
  pdfPageEnd: number;
  blocks: Block[];
  sections: { id: string; text: string }[];
  words: number;
  minutes: number;
  index: number; // 0-based position
}

interface RawChapter { slug: string; title: string; number: number | null; pdfPage: number; blocks: Block[] }
const data = raw as unknown as {
  title: string;
  subtitle: string;
  sourcePages: number;
  frontMatter: { blocks: Block[]; permission?: { title: string; html: string } };
  chapters: RawChapter[];
  audit: { sourceWords: number; missingWordTokens: number; responseLinesOmitted: number; figures: number };
};

export const BOOK_ID = "adventure-of-living-with-jesus";
export const READ_BASE = `/books/${BOOK_ID}/read`;
export const bookTitle = data.title;
export const bookSubtitle = data.subtitle;
export const frontMatter = data.frontMatter;
export const extractionAudit = data.audit;

const WPM = 200;
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
const countWords = (s: string) => (strip(s).match(/[A-Za-z0-9’']+/g) ?? []).length;

function blockText(b: Block): string {
  switch (b.t) {
    case "p": case "quote": case "question": return b.html;
    case "h2": return b.text;
    case "ul": return b.items.join(" ");
    case "panel": return b.blocks.map(blockText).join(" ");
    case "callout": return [b.title ?? "", ...b.blocks.map(blockText)].join(" ");
    case "table": return [...b.head, ...b.rows.flat().filter(c => c !== "checkbox")].join(" ");
    case "figure": return b.caption ?? "";
    case "continue": return b.note;
    case "deeper": return `${b.title} ${b.desc}`;
  }
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const readings: Reading[] = data.chapters.map((c, index, all) => {
  const used = new Set<string>();
  const sections: Reading["sections"] = [];
  const blocks = c.blocks.map(b => {
    if (b.t !== "h2") return b;
    let id = slugify(b.text) || "section";
    while (used.has(id)) id += "-2";
    used.add(id);
    sections.push({ id, text: b.text });
    return { ...b, id };
  });
  const words = countWords(blocks.map(blockText).join(" ") + " " + c.title);
  const next = all[index + 1];
  return {
    ...c,
    blocks,
    sections,
    words,
    minutes: Math.max(1, Math.round(words / WPM)),
    pdfPageEnd: next ? Math.max(c.pdfPage, next.pdfPage - (next.pdfPage === c.pdfPage ? 0 : 1)) : data.sourcePages,
    index,
  };
});

export const totalReadings = readings.length;
export const totalMinutes = readings.reduce((n, r) => n + r.minutes, 0);
export const readingHref = (slug: string) => `${READ_BASE}/${slug}`;
export const readingLabel = (r: Pick<Reading, "number" | "title">) => (r.number ? `${r.number}. ${r.title}` : r.title);

/* ---------- Scripture references -> local NET Bible ----------
 * Uses the same book catalogue and chapter/verse table that powers /bible,
 * so every link is validated against a real chapter and verse. */
const bookNames = [...BOOKS.map(b => b.name), "Psalm"].sort((a, b) => b.length - a.length);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const REF = new RegExp(
  `(?<![A-Za-z])(${bookNames.map(esc).join("|")})\\s+(\\d{1,3})(?::(\\d{1,3}))?(?:\\s*[–-]\\s*(\\d{1,3})(?::(\\d{1,3}))?)?(?![\\d:])`,
  "g",
);
const CONT = /^(,\s*(?:and\s+)?|;\s*|\s+and\s+)(\d{1,3})(?::(\d{1,3}))?(?:\s*[–-]\s*(\d{1,3}))?(?![\d:])/;

type Ref = { book: string; chapter: number; verse?: number; end?: number };

function valid(r: Ref): boolean {
  const verses = CHAPTER_VERSES[r.book];
  if (!verses || !verses[r.chapter - 1]) return false;
  if (r.verse && r.verse > verses[r.chapter - 1]) return false;
  return true;
}

function anchor(r: Ref, label: string, base: string) {
  const q = new URLSearchParams({ book: r.book, chapter: String(r.chapter) });
  if (r.verse) q.set("verse", String(r.verse));
  q.set("translation", "net");
  const attrs = [
    `href="${base}/bible?${q.toString().replace(/&/g, "&amp;")}"`,
    `class="scripture-ref"`,
    `data-ref-book="${r.book}"`,
    `data-ref-chapter="${r.chapter}"`,
    r.verse ? `data-ref-verse="${r.verse}"` : "",
    r.end ? `data-ref-end="${r.end}"` : "",
  ].filter(Boolean).join(" ");
  return `<a ${attrs}>${label}</a>`;
}

function linkText(text: string, base: string): string {
  let out = "";
  let last = 0;
  REF.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = REF.exec(text))) {
    const book = canonicalBook(m[1]);
    if (!book) continue;
    const chapter = Number(m[2]);
    const verse = m[3] ? Number(m[3]) : undefined;
    // "3:7–4:11" spans chapters: link to the starting verse only.
    const end = m[4] && !m[5] && verse ? Number(m[4]) : undefined;
    const ref: Ref = { book, chapter, verse, end };
    if (!valid(ref)) continue;
    out += text.slice(last, m.index) + anchor(ref, m[0], base);
    let pos = m.index + m[0].length;
    // continuation references that inherit the book: "4:32-35 and 11:27-30", "5, 9", "107, and 145"
    for (;;) {
      const c = CONT.exec(text.slice(pos));
      if (!c) break;
      const cont: Ref = c[3]
        ? { book, chapter: Number(c[2]), verse: Number(c[3]), end: c[4] ? Number(c[4]) : undefined }
        : verse
          ? { book, chapter, verse: Number(c[2]), end: c[4] ? Number(c[4]) : undefined }
          : { book, chapter: Number(c[2]) };
      if (!valid(cont)) break;
      const numStart = c[1].length;
      out += c[0].slice(0, numStart) + anchor(cont, c[0].slice(numStart), base);
      pos += c[0].length;
    }
    last = pos;
    REF.lastIndex = pos;
  }
  return out + text.slice(last);
}

/** Adds Scripture links (outside existing anchors) and opens external links in a new tab. */
export function enrichHtml(html: string, base: string): string {
  const parts = html.split(/(<[^>]+>)/);
  let inAnchor = 0;
  return parts.map(p => {
    if (p.startsWith("<")) {
      if (/^<a\s/i.test(p)) {
        inAnchor++;
        return /href="https?:\/\//.test(p) ? p.replace(/^<a /, '<a target="_blank" rel="noopener noreferrer" ') : p;
      }
      if (/^<\/a>/i.test(p)) inAnchor = Math.max(0, inAnchor - 1);
      return p;
    }
    return inAnchor ? p : linkText(p, base);
  }).join("");
}
