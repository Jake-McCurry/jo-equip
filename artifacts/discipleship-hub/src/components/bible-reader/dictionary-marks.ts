// Finds the words in a displayed chapter (NET or KJV) that the Easton
// dictionary index links to that chapter, so the reader can mark them.
// The index (scripts/generate-bible-dictionary.mjs) was built from KJV words;
// here the same headword rules are re-applied to whatever text is on screen,
// and only within the verses the index lists for each entry. A word that the
// NET renders differently (e.g. "Holy Spirit" for "Holy Ghost") is simply not
// marked; the Dictionary tab still lists the entry.
import type { DictIndex } from "@/components/bible-dictionary/dictionary-data";
import type { Verse } from "./reader-utils";

export type DictMark = { start: number; end: number; slug: string; title: string };
export type DictSegment = { text: string; slug?: string; title?: string };

const norm = (w: string) => w.toLowerCase().replace(/[-’']/g, "").replace(/æ/g, "ae");
const headwordOf = (title: string) => title.replace(/\s+I+\.$/, "").replace(/[!.]$/, "").split(",")[0].trim();
const plural = (w: string) => [w, `${w}s`, `${w}es`, w.endsWith("y") ? `${w.slice(0, -1)}ies` : w];

/** Word sequences (normalized) that stand for an entry in the text. */
function formsOf(title: string): string[][] {
  const head = headwordOf(title);
  const words = head.split(/\s+/).map(norm);
  if (words.some(w => !w)) return [];
  if (words.length > 1) return [words];
  const bare = title.replace(/\s+I+\.$/, "").replace(/[!.]$/, "").trim();
  // "Sharon, Saron" / "Put, Phut": spelling variants, each a single word.
  const parts = bare.split(/,\s*/);
  const variants = parts.length > 1 && parts.every(v => /^[A-Z][A-Za-z-]*$/.test(v) && v[0] === parts[0][0]) ? parts.map(norm) : [];
  const singles = variants.length ? variants : plural(words[0]);
  return [...new Set(singles)].map(w => [w]);
}

type Token = { n: string; start: number; end: number };
function tokens(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(/[A-Za-zÀ-ÖØ-öø-ÿ]+(?:[-’'][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g)) {
    const w = m[0].replace(/['’]s$/, "");
    out.push({ n: norm(w), start: m.index!, end: m.index! + m[0].length });
  }
  return out;
}

/** Marks per verse number for one chapter; verses without marks are omitted. */
export function chapterMarks(index: DictIndex, chapterName: string, verses: Verse[]): Record<number, DictMark[]> {
  const rows = index.chapters[chapterName] ?? [];
  const byVerse = new Map<number, { slug: string; title: string; forms: string[][] }[]>();
  for (const [ei, vs] of rows) {
    const [slug, title] = index.entries[ei];
    const forms = formsOf(title);
    if (!forms.length) continue;
    for (const v of vs) {
      if (!byVerse.has(v)) byVerse.set(v, []);
      byVerse.get(v)!.push({ slug, title, forms });
    }
  }
  const out: Record<number, DictMark[]> = {};
  for (const v of verses) {
    const wanted = byVerse.get(v.verse);
    if (!wanted) continue;
    const toks = tokens(v.text);
    const found: DictMark[] = [];
    for (const e of wanted) for (const f of e.forms) {
      for (let i = 0; i + f.length <= toks.length; i++) {
        if (f.every((w, j) => toks[i + j].n === w)) found.push({ start: toks[i].start, end: toks[i + f.length - 1].end, slug: e.slug, title: e.title });
      }
    }
    // Longest match wins where entries overlap ("Son of man" over "Man").
    found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
    const kept: DictMark[] = [];
    for (const m of found) if (!kept.length || m.start >= kept[kept.length - 1].end) kept.push(m);
    if (kept.length) out[v.verse] = kept;
  }
  return out;
}

export function segmentByMarks(text: string, marks: DictMark[]): DictSegment[] {
  const segs: DictSegment[] = [];
  let at = 0;
  for (const m of marks) {
    if (m.start > at) segs.push({ text: text.slice(at, m.start) });
    segs.push({ text: text.slice(m.start, m.end), slug: m.slug, title: m.title });
    at = m.end;
  }
  if (at < text.length) segs.push({ text: text.slice(at) });
  return segs;
}
