// Shared by the browser reader, the data generator, and build validation.
// Aligns Strong's-tagged KJV words (in verse order) to the KJV text the reader
// actually displays. The displayed text comes from a different public-domain
// KJV edition, so matching is sequential and tolerant: a tag that cannot be
// found nearby is skipped instead of being attached to the wrong word.

export type KjvTag = [surface: string, strongs: string];
export type AlignedSpan = { start: number; end: number; strongs: string };

const WORD = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
const LOOKAHEAD = 15;

const norm = (w: string) => w.toLowerCase().replace(/’/g, "'");

function tokens(text: string) {
  const out: { start: number; end: number; word: string }[] = [];
  for (const m of text.matchAll(WORD)) out.push({ start: m.index!, end: m.index! + m[0].length, word: norm(m[0]) });
  return out;
}

export function alignKjv(text: string, tags: readonly KjvTag[]): AlignedSpan[] {
  const toks = tokens(text);
  const spans: AlignedSpan[] = [];
  let cursor = 0;
  for (const [surface, strongs] of tags) {
    const words = [...surface.matchAll(WORD)].map(m => norm(m[0]));
    if (!words.length) continue;
    const limit = Math.min(toks.length - words.length, cursor + LOOKAHEAD);
    for (let j = cursor; j <= limit; j++) {
      if (words.every((w, k) => toks[j + k].word === w)) {
        spans.push({ start: toks[j].start, end: toks[j + words.length - 1].end, strongs });
        cursor = j + words.length;
        break;
      }
    }
  }
  return spans;
}

/** Split text into plain and tagged segments for rendering. */
export function segmentKjv(text: string, spans: readonly AlignedSpan[]) {
  const out: { text: string; strongs?: string }[] = [];
  let at = 0;
  for (const s of spans) {
    if (s.start > at) out.push({ text: text.slice(at, s.start) });
    out.push({ text: text.slice(s.start, s.end), strongs: s.strongs });
    at = s.end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}
