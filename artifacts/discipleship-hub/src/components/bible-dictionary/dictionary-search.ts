// Full-text search of Easton's Bible Dictionary, shared by the /bible/dictionary page and the
// Bible reader's Dictionary tab so both match the same way. The data is the content-hashed
// search.<hash>.json (rows of [slug, title, plain text]), fetched only when first needed.

export type DictSearchRow = [slug: string, title: string, text: string];
export type DictSearchDoc = { slug: string; title: string; text: string; folded: string; ftitle: string };
export type DictSearchHit = DictSearchDoc & { score: number };
/** A snippet as text runs; `true` marks a run to highlight. */
export type SnippetPart = [text: string, mark: boolean];

// Accents dropped, "æ" read as "ae", apostrophes removed, and hyphens and dashes read as
// spaces ("Tell-el-Amarna" matches "tell el amarna").
export const foldText = (s: string) =>
  s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/æ/g, "ae").replace(/[’'‘]/g, "").replace(/[-–—]/g, " ");

/** Folds the text and returns, for every folded character, its position in the original text. */
function foldMapped(s: string) {
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const f = foldText(s[i]);
    out += f;
    for (let j = 0; j < f.length; j++) map.push(i);
  }
  map.push(s.length);
  return { out, map };
}

export const prepareDictSearch = (data: DictSearchRow[]): DictSearchDoc[] =>
  data.map(([slug, title, text]) => ({ slug, title, text, folded: foldText(text), ftitle: foldText(title) }));

/** The query's search terms, or null when it is too short to search (under 3 letters). */
export function dictSearchTerms(raw: string): string[] | null {
  const terms = foldText(raw.trim()).split(/\s+/).filter(Boolean);
  return terms.join("").length < 3 ? null : terms;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// A term matches at the start of a word, so "phylacter" finds "phylacteries" but "ark" skips "dark";
// simple plurals are folded too ("phylactery" finds "phylacteries", "frontlets" finds "frontlet").
const stem = (t: string) =>
  t.length > 4 && /ies$/.test(t) ? `${esc(t.slice(0, -3))}(?:y|ies)`
  : t.length > 3 && /[^aeiou]y$/.test(t) ? `${esc(t.slice(0, -1))}(?:y|ies)`
  : t.length > 4 && /[^eisu]s$/.test(t) ? `${esc(t.slice(0, -1))}s?`
  : esc(t);
const termRe = (...ts: string[]) => new RegExp(`(?:^|[^a-z0-9])(${ts.map(stem).join(" ")})`, "g");

/** Articles containing every term, best first: title matches and whole-phrase matches rank highest. */
export function searchDict(docs: DictSearchDoc[], terms: string[]): DictSearchHit[] {
  const res = terms.map(t => termRe(t));
  const phrase = terms.length > 1 ? termRe(...terms) : null;
  const count = (re: RegExp, s: string) => { re.lastIndex = 0; let n = 0; while (n < 20 && re.exec(s)) n++; return n; };
  const hits: DictSearchHit[] = [];
  for (const r of docs) {
    let score = 0, ok = true;
    for (const re of res) {
      const n = count(re, r.folded) + count(re, r.ftitle) * 5;
      if (!n) { ok = false; break; }
      score += n;
    }
    if (!ok) continue;
    if (phrase) score += count(phrase, r.folded) * 10 + count(phrase, r.ftitle) * 100;
    else if (count(res[0], r.ftitle)) score += 100;
    hits.push({ ...r, score });
  }
  return hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, "en", { sensitivity: "base" }));
}

/** About 240 characters of the article around the first match, with every term in it marked. */
export function dictSnippet(text: string, terms: string[]): SnippetPart[] {
  const { out, map } = foldMapped(text);
  const res = terms.map(t => termRe(t));
  let at = -1;
  if (terms.length > 1) { const m = termRe(...terms).exec(out); if (m) at = m.index + m[0].length - m[1].length; }
  if (at < 0) for (const re of res) { re.lastIndex = 0; const m = re.exec(out); if (m) { at = m.index + m[0].length - m[1].length; break; } }
  const pos = at < 0 ? 0 : map[at];
  let start = Math.max(0, pos - 80), end = Math.min(text.length, pos + 160);
  if (start > 0) start = text.indexOf(" ", start) + 1 || start;
  if (end < text.length) { const sp = text.lastIndexOf(" ", end); if (sp > pos) end = sp; }
  const marks: [number, number][] = [];
  for (const re of res) {
    re.lastIndex = 0;
    for (const m of out.matchAll(re)) {
      const fs = m.index! + m[0].length - m[1].length;
      const a = map[fs], b = map[fs + m[1].length - 1] + 1;
      if (a >= start && b <= end) marks.push([a, b]);
    }
  }
  marks.sort((x, y) => x[0] - y[0]);
  const parts: SnippetPart[] = [];
  let last = start;
  for (const [a, b] of marks) {
    if (a < last) continue;
    parts.push([text.slice(last, a), false], [text.slice(a, b), true]);
    last = b;
  }
  parts.push([text.slice(last, end), false]);
  if (start > 0) parts.unshift(["… ", false]);
  if (end < text.length) parts.push([" …", false]);
  return parts.filter(p => p[0]);
}
