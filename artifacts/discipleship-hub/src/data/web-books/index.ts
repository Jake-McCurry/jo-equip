/* Online web-book editions for every displayed book except Adventure (which
 * keeps its dedicated pages under /books/adventure-of-living-with-jesus/read).
 *
 * <id>.json files are GENERATED from the current PDFs by
 * scripts/extract-web-books.py — never hand-edit them; rerun the script when a
 * PDF changes. Knowing God's per-letter readings come from the existing
 * concordance corpus (public/knowing-god/data/topics-*.json), which is itself
 * built from the same PDF; its introduction comes from the extractor.
 */
import type { Block } from "@/data/adventure-book";
import { books } from "@/data/books";

export type { Block };

interface RawChapter {
  slug: string;
  title: string;
  label?: string | null;
  number?: number | null;
  part?: string | null;
  pdfPage: number;
  blocks: RawBlock[];
}
type RawBlock = Block | { t: "h1" | "h3"; text: string; lines?: string[] };
interface RawBook {
  id: string;
  sourcePages: number;
  frontMatter: RawBlock[];
  chapters: RawChapter[];
  audit: { internalCoverage: number; independentCoverage: number; figures: number; words: number };
}

export interface WebReading {
  slug: string;
  title: string;
  label: string | null;
  part: string | null;
  pdfPage: number;
  pdfPageEnd: number;
  blocks: Block[];
  sections: { id: string; text: string }[];
  words: number;
  minutes: number;
  index: number;
}

export interface WebBook {
  id: string;
  title: string;
  readBase: string;
  storeKey: string;
  sourcePages: number;
  frontMatter: Block[];
  readings: WebReading[];
  totalMinutes: number;
  note?: string;
}

const files = import.meta.glob<RawBook>("./*.json", { eager: true, import: "default" });
const kgFiles = import.meta.glob<{ letter: string; topics: { id: string; title: string; sourcePages: number[]; passages: { reference: string; text: string }[] }[] }>(
  "../../../public/knowing-god/data/topics-*.json",
  { eager: true, import: "default" },
);

const WPM = 200;
const strip = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
const countWords = (s: string) => (strip(s).match(/[A-Za-z0-9’']+/g) ?? []).length;
const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const slugify = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Normalize generator blocks to the shared Block union (in-chapter h1/h3 render as section headings). */
function norm(b: RawBlock): Block {
  if (b.t === "h1" || b.t === "h3") return { t: "h2", text: b.text };
  return b as Block;
}

function blockText(b: Block): string {
  switch (b.t) {
    case "p": case "quote": case "question": return b.html;
    case "h2": return b.text;
    case "ul": return b.items.join(" ");
    case "panel": return b.blocks.map(blockText).join(" ");
    case "callout": return [b.title ?? "", ...b.blocks.map(blockText)].join(" ");
    case "table": return [b.caption ?? "", ...b.head, ...b.rows.flat(), b.note ?? ""].join(" ");
    case "checklist": return b.items.join(" ");
    case "figure": return b.caption ?? "";
    case "continue": return b.note;
    case "deeper": return `${b.title} ${b.desc}`;
  }
}

interface Draft { slug: string; title: string; label: string | null; part: string | null; pdfPage: number; blocks: Block[] }

function finish(drafts: Draft[], sourcePages: number): WebReading[] {
  const slugs = new Set<string>();
  return drafts.map((c, index, all) => {
    let slug = c.slug || slugify(c.title) || `reading-${index + 1}`;
    while (slugs.has(slug)) slug += "-2";
    slugs.add(slug);
    const used = new Set<string>();
    const sections: WebReading["sections"] = [];
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
      slug,
      blocks,
      sections,
      words,
      minutes: Math.max(1, Math.round(words / WPM)),
      pdfPageEnd: next ? Math.max(c.pdfPage, next.pdfPage - (next.pdfPage === c.pdfPage ? 0 : 1)) : sourcePages,
      index,
    };
  });
}

function knowingGodDrafts(raw: RawBook): Draft[] {
  // Front matter + introductory chapters (PDF pages 2-28) form one introduction reading.
  const intro: Block[] = [
    ...raw.frontMatter.map(norm),
    ...raw.chapters.flatMap(c => [{ t: "h2", text: c.title } as Block, ...c.blocks.map(norm)]),
  ];
  const drafts: Draft[] = [{
    slug: "introduction", title: "Introduction", label: null, part: null, pdfPage: 2,
    blocks: intro,
  }];
  const letters = Object.values(kgFiles).sort((a, b) => a.letter.localeCompare(b.letter));
  for (const L of letters) {
    if (!L.topics.length) continue;
    const blocks: Block[] = [];
    for (const t of L.topics) {
      blocks.push({ t: "h2", text: t.title });
      for (const p of t.passages) {
        blocks.push({ t: "quote", kind: "scripture", html: `${escHtml(p.text)} <strong>— ${escHtml(p.reference)}</strong>` });
      }
    }
    drafts.push({
      slug: `letter-${L.letter.toLowerCase()}`,
      title: `Topics: ${L.letter.toUpperCase()}`,
      label: L.letter.toUpperCase(),
      part: null,
      pdfPage: Math.min(...L.topics.flatMap(t => t.sourcePages)),
      blocks,
    });
  }
  return drafts;
}

function build(raw: RawBook): WebBook {
  const meta = books.find(b => b.id === raw.id);
  const title = meta?.title ?? raw.id;
  const isKG = raw.id === "knowing-god";
  const drafts: Draft[] = isKG
    ? knowingGodDrafts(raw)
    : raw.chapters.map(c => ({
        slug: c.slug, title: c.title, label: c.label ?? null, part: c.part ?? null, pdfPage: c.pdfPage,
        blocks: c.blocks.map(norm),
      }));
  const readings = finish(drafts, raw.sourcePages);
  return {
    id: raw.id,
    title,
    readBase: `/books/${raw.id}/read`,
    storeKey: `jo-web-book:${raw.id}`,
    sourcePages: raw.sourcePages,
    frontMatter: isKG ? [] : raw.frontMatter.map(norm),
    readings,
    totalMinutes: readings.reduce((n, r) => n + r.minutes, 0),
    note: isKG ? "Topics are arranged by letter with the King James passages printed in the book. The searchable concordance remains at /knowing-god." : undefined,
  };
}

export const webBooks: WebBook[] = Object.entries(files)
  .filter(([path]) => !path.endsWith("extraction-report.json"))
  .map(([, raw]) => build(raw))
  .sort((a, b) => a.title.localeCompare(b.title));

export const getWebBook = (id: string) => webBooks.find(b => b.id === id);
export const readingLabel = (r: Pick<WebReading, "label" | "title">) =>
  r.label && /^\d+$/.test(r.label) ? `${r.label}. ${r.title}` : r.label && !r.title.startsWith("Topics") ? `${r.label}: ${r.title}` : r.title;
