/**
 * Scripture auto-linking for the Genesis survey lesson ONLY.
 *
 * - Bare refs ("3:15", "1:1-2:6", "8:20-9:17") resolve to Genesis.
 * - Named refs ("Psalm 110:4", "1Peter 3:20-21", "Romans 4:3, 9, 22") keep
 *   their named book.
 * - "chapters 29-36" links the first chapter of the range in Genesis.
 * - Anything malformed/ambiguous ("25:7:7-10", "15:1-31" where Genesis 15 has
 *   21 verses, "Romans;" with no chapter, "23-27" with no chapter) is left as
 *   plain, unchanged text. Visible text is never altered — only wrapped.
 */
import { BOOKS, CHAPTER_VERSES, canonicalBook } from "../../../worker/bible-catalog.js";

const verses = CHAPTER_VERSES as Record<string, number[]>;

const bookAlternation = [...BOOKS.map((b: { name: string }) => b.name), "Psalm"]
  .sort((a, b) => b.length - a.length)
  .map(n => n.replace(/ /g, "\\s+").replace(/^(\d)\\s\+/, "$1\\s*"))
  .join("|");

// [1] book? [2] chapter [3] verse [4] end-a [5] end-b (verse when cross-chapter) [6] list tail
const REF = new RegExp(
  `(?:\\b(${bookAlternation})\\s+)?(?<![\\d:])(\\d{1,3}):(\\d{1,3})(?:-(\\d{1,3})(?::(\\d{1,3}))?)?((?:,\\s*\\d{1,3}(?:-\\d{1,3})?)*)(?![:\\d])`,
  "g",
);
const CHAPTERS = /\b(chapters\s+)(\d{1,3})(-\d{1,3}|\s+and\s+\d{1,3})?(?![:\d])/g;

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

function a(url: string, label: string, title: string) {
  return `<a href="${url}" class="scripture-ref" target="_blank" rel="noopener" title="${title} (opens the Bible reader in a new tab)">${label}</a>`;
}

function linkText(text: string, base: string): string {
  const out = text.replace(REF, (m, bookRaw, c, v, eA, eB, tail) => {
    const book = bookRaw ? canonicalBook(bookRaw.replace(/^(\d)\s*/, "$1 ")) : "Genesis";
    if (!book) return m;
    const ch = Number(c), vs = Number(v);
    if (!validRef(book, ch, vs, eA ? Number(eA) : undefined, eB ? Number(eB) : undefined, tail ?? "")) return m;
    return a(href(base, book, ch, vs), m, `${book} ${ch}:${vs}`);
  });
  // Chapter-range phrases are only linked outside anchors we just created.
  return out
    .split(/(<a [^>]*>.*?<\/a>)/)
    .map(seg =>
      seg.startsWith("<a ")
        ? seg
        : seg.replace(CHAPTERS, (m, pre, c, rest = "") => {
            const ch = Number(c);
            if (!verses.Genesis[ch - 1]) return m;
            return `${pre}${a(href(base, "Genesis", ch), `${c}${rest}`, `Genesis ${ch}`)}`;
          }),
    )
    .join("");
}

/** Link refs in an HTML string, touching text nodes only (tags untouched). */
export function linkGenesisScripture(html: string, base: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  return html
    .split(/(<[^>]+>)/)
    .map(part => (part.startsWith("<") ? part : linkText(part, b)))
    .join("");
}
