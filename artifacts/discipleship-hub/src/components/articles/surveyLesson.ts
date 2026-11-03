/**
 * Display-only adapter for Survey of the Bible lessons (OT + NT).
 * Walks the EXISTING source blocks in order and groups them into sections.
 * No wording is rewritten; the only display changes are numeric chapter
 * notation and dropping the outline marker on the discussion heading.
 * Every source block is consumed exactly once (see survey-lesson.test.mjs).
 */
type Block =
  | { type: "p"; html: string }
  | { type: "ol"; items: string[] }
  | { type: "ul"; items: string[] }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: string; [k: string]: unknown };

export type Body =
  | { kind: "p"; html: string }
  | { kind: "ol"; items: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "h3"; marker: string | null; html: string };

export type Section = {
  kind: "section"; id: string; marker: string; title: string; range: string | null;
  rangeFirst: boolean; lead: string | null; tone: "overview" | "normal"; body: Body[];
};
export type Node =
  | { kind: "intro"; label: string; html: string }
  | { kind: "loose"; body: Body[] }
  | Section
  | { kind: "discussion"; id: string; heading: string; html: string; body: Body[] }
  | { kind: "credit"; html: string };

const ONES: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9 };
const TEENS: Record<string, number> = { ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const ONE_ALT = Object.keys(ONES).join("|");
const NUM = `(?:\\d+|(?:${Object.keys(TENS).join("|")})(?:[-\\s](?:${ONE_ALT})\\b)?|${Object.keys(TEENS).join("|")}|${ONE_ALT})`;
const CHAPTER_WORDS = new RegExp(`\\b(chapters?)\\s+(${NUM})\\b(?:\\s+(through|to|and)\\s+(${NUM})\\b)?`, "gi");

function toNum(s: string): number {
  if (/^\d+$/.test(s)) return Number(s);
  return s.toLowerCase().split(/[-\s]+/).reduce((n, w) => n + (ONES[w] ?? TEENS[w] ?? TENS[w] ?? 0), 0);
}

/** "Chapters one through five" → "Chapters 1-5", "Chapter Twenty-One" → "Chapter 21". */
export function numericChapters(text: string): string {
  return text.replace(CHAPTER_WORDS, (_m, label: string, a: string, joiner?: string, b?: string) => {
    const start = toNum(a);
    if (!b) return `${label} ${start}`;
    const end = toNum(b);
    // "and" only becomes a range for consecutive chapters ("45 and 53" stays).
    if (joiner!.toLowerCase() === "and" && end !== start + 1) return `${label} ${start} ${joiner} ${end}`;
    return `${label} ${start}-${end}`;
  });
}

const ABBREV = /(?:\b(?:Vs|vs|Vss|St|Mr|Mrs|Dr|ch|cf|i\.e|e\.g|v|no)|\b[A-Z])$/;

/** Index just past the first top-level sentence end, or -1. */
function sentenceEnd(html: string): number {
  let depth = 0, inTag = false;
  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === "<") inTag = true;
    if (inTag) { if (ch === ">") inTag = false; continue; }
    if (ch === "(" || ch === "“") depth++;
    else if ((ch === ")" || ch === "”") && depth > 0) depth--;
    else if (depth === 0 && (ch === "." || ch === "!" || ch === "?" || ch === ":")) {
      const rest = html.slice(i + 1);
      if (!/^\s+\S/.test(rest)) continue;
      if (ch === ":" && (i < 20 || !/^\s+[“"‘]/.test(rest))) continue;
      if (ch === "." && ABBREV.test(html.slice(0, i))) continue;
      if (!/^\s+[A-Z“"‘(<]/.test(rest)) continue;
      return i + 1;
    }
  }
  return -1;
}

const OVERVIEW = /^(?:Overall Theme|Theme|Background|Overview|Summary|Introduction)/i;
const INTRO = /^((?:Overall Theme(?: and Background)?|Overview and Summary)[.:])\s*([\s\S]*)$/;
const MARKER = /^((?:[A-Z]{1,2}|[IVX]+))\.\s+([\s\S]*)$/;
const SUB = /^(\d{1,2})\.\s+(Chapters?\s+\d+(?:-\d+)?\.)$/;
const BARE_CHAPTER = /^Chapters?\s+\d+(?:-\d+)?\.$/;
const DISCUSSION = /^Discussion Questions?\b/i;
const CREDIT = /^<em>This (?:Old|New) Testament survey/;

function parseHeading(body: string) {
  const lead = body.match(/^(Chapters?\s+\d+(?:-\d+)?\.)\s+([\s\S]*)$/);
  if (lead) {
    const rest = lead[2];
    const end = sentenceEnd(rest);
    return end === -1
      ? { title: rest, range: lead[1].replace(/\.$/, ""), rangeFirst: true, lead: null }
      : { title: rest.slice(0, end), range: lead[1].replace(/\.$/, ""), rangeFirst: true, lead: rest.slice(end).trim() };
  }
  const end = sentenceEnd(body);
  const head = end === -1 ? body : body.slice(0, end);
  const after = end === -1 ? null : body.slice(end).trim();
  const paren = head.length <= 110 ? head.match(/^(.*?)\s*(\((?:chapters?\s+\d[^()]*|\d+:\d[^()]*)\)\.?)$/i) : null;
  if (paren && paren[1]) return { title: paren[1], range: paren[2], rangeFirst: false, lead: after };
  return { title: head, range: null, rangeFirst: false, lead: after };
}

export function buildSurveyLesson(blocks: Block[], articleId: string): Node[] {
  const nodes: Node[] = [];
  const ids = new Set<string>();
  let current: { body: Body[] } | null = null;
  let unmarked = 0;
  const uid = (base: string) => { let id = base, n = 2; while (ids.has(id)) id = `${base}-${n++}`; ids.add(id); return id; };
  const push = (b: Body) => {
    if (!current) { const loose: Node = { kind: "loose", body: [] }; nodes.push(loose); current = loose; }
    current.body.push(b);
  };
  const startSection = (marker: string, body: string) => {
    const h = parseHeading(body);
    const id = uid(`${articleId}-${marker ? marker.toLowerCase() : `s${++unmarked}`}`);
    const s: Section = { kind: "section", id, marker: marker ? `${marker}.` : "", ...h, tone: OVERVIEW.test(h.title) ? "overview" : "normal", body: [] };
    nodes.push(s); current = s;
  };

  for (const b of blocks) {
    if (b.type === "p") {
      const t = numericChapters((b as { html: string }).html);
      if (CREDIT.test(t)) { nodes.push({ kind: "credit", html: t }); current = null; continue; }
      const intro = t.match(INTRO);
      if (intro && !nodes.some(n => n.kind === "section" || n.kind === "discussion")) {
        nodes.push({ kind: "intro", label: intro[1], html: intro[2] }); current = null; continue;
      }
      const m = t.match(MARKER);
      const text = m ? m[2] : t;
      if (DISCUSSION.test(text) && (m || t.length < 120)) {
        const end = sentenceEnd(text);
        const d = { kind: "discussion" as const, id: uid(`${articleId}-discussion`), heading: end === -1 ? text : text.slice(0, end), html: end === -1 ? "" : text.slice(end).trim(), body: [] as Body[] };
        nodes.push(d); current = d; continue;
      }
      if (m) { startSection(m[1], m[2]); continue; }
      const sub = t.match(SUB);
      if (sub && current) { push({ kind: "h3", marker: `${sub[1]}.`, html: sub[2] }); continue; }
      if (BARE_CHAPTER.test(t)) { startSection("", t); continue; }
      push({ kind: "p", html: t });
      continue;
    }
    if (b.type === "ol" || b.type === "ul") {
      push({ kind: b.type, items: (b as { items: string[] }).items.map(numericChapters) } as Body);
      continue;
    }
    if (b.type === "h2" || b.type === "h3") {
      push({ kind: "h3", marker: null, html: numericChapters((b as { text: string }).text) });
      continue;
    }
    throw new Error(`Survey lesson ${articleId}: unsupported block type "${b.type}"`);
  }
  return nodes;
}

/** Split an existing "<br>Note: …" tail into its own aside (wording intact). */
export function splitNote(html: string): { main: string; note: string | null } {
  const i = html.indexOf("<br>Note:");
  return i === -1 ? { main: html, note: null } : { main: html.slice(0, i), note: html.slice(i + 4 + "Note:".length).trimStart() };
}

const plain = (h: string) => h.replace(/<[^>]+>/g, "").replace(/[.:]\s*$/, "").trim();
function shorten(s: string, max = 44) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max).replace(/\s+\S*$/, "");
  return `${cut}…`;
}

export function surveyToc(nodes: Node[]) {
  const toc: { id: string; label: string }[] = [];
  for (const n of nodes) {
    if (n.kind === "section") {
      const title = plain(n.title);
      const label = n.rangeFirst && n.range && title.length > 40 ? n.range : shorten(title);
      toc.push({ id: n.id, label: n.marker ? `${n.marker} ${label}` : label });
    } else if (n.kind === "discussion") toc.push({ id: n.id, label: "Discussion & Application" });
  }
  return toc;
}

/** Flattened visible text per node, for source-fidelity regression checks. */
export function nodeText(n: Node): string[] {
  const body = (b: Body[]) => b.flatMap(x => (x.kind === "p" ? [x.html] : x.kind === "h3" ? [`${x.marker ? `${x.marker} ` : ""}${x.html}`] : x.items));
  switch (n.kind) {
    case "intro": return [`${n.label} ${n.html}`];
    case "credit": return [n.html];
    case "loose": return body(n.body);
    case "discussion": return [`${n.heading} ${n.html}`.trim(), ...body(n.body)];
    case "section": {
      const head = n.rangeFirst ? `${n.range}. ${n.title}` : n.range ? `${n.title} ${n.range}` : n.title;
      return [`${n.marker ? `${n.marker} ` : ""}${head}${n.lead ? ` ${n.lead}` : ""}`, ...body(n.body)];
    }
  }
}
