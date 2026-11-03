// Direct .js import keeps this module runnable under `node --experimental-strip-types`.
import { canonicalBook, CHAPTER_VERSES } from "../../../worker/bible-catalog.js";

export type Block = {
  kind: "heading" | "paragraph" | "passage";
  text: string;
  sourceParagraphs?: number[];
  reference?: string;
  translation?: string;
  bibleReference?: string;
  referenceNote?: string;
};
export type Topic = { id: string; title: string; blocks: Block[] };
export type Group = { id: string; title: string; description: string; preamble: Block[]; topics: Topic[] };
export type PromiseBook = {
  title: string;
  sourceTitle: string;
  publication: Block[];
  introduction: Block[];
  groups: Group[];
};

export type View =
  | { kind: "intro" }
  | { kind: "copyright" }
  | { kind: "saved" }
  | { kind: "group"; groupId: string }
  | { kind: "topic"; topicId: string };

export const STORAGE_KEY = "jo-equip:promises-of-god:saved:v1";

const isStr = (v: unknown): v is string => typeof v === "string";
const isBlock = (b: unknown): b is Block => {
  if (!b || typeof b !== "object") return false;
  const x = b as Record<string, unknown>;
  if (!["heading", "paragraph", "passage"].includes(x.kind as string) || !isStr(x.text)) return false;
  if (x.kind === "passage" && (!isStr(x.reference) || !isStr(x.translation))) return false;
  return true;
};

/** Validates the JSON shape; throws a readable error if malformed. */
export function validateBook(data: unknown): PromiseBook {
  const fail = (m: string) => { throw new Error(`The promises content is malformed (${m}).`); };
  if (!data || typeof data !== "object") fail("not an object");
  const d = data as Record<string, unknown>;
  if (!isStr(d.title) || !isStr(d.sourceTitle)) fail("title");
  if (!Array.isArray(d.publication) || !d.publication.every(isBlock)) fail("publication");
  if (!Array.isArray(d.introduction) || !d.introduction.every(isBlock)) fail("introduction");
  if (!Array.isArray(d.groups) || d.groups.length === 0) fail("groups");
  for (const g of d.groups as unknown[]) {
    const gg = g as Record<string, unknown>;
    if (!gg || !isStr(gg.id) || !isStr(gg.title) || !isStr(gg.description)) fail("group");
    if (!Array.isArray(gg.preamble) || !gg.preamble.every(isBlock)) fail("group preamble");
    if (!Array.isArray(gg.topics) || gg.topics.length === 0) fail("topics");
    for (const t of gg.topics as unknown[]) {
      const tt = t as Record<string, unknown>;
      if (!tt || !isStr(tt.id) || !isStr(tt.title) || !Array.isArray(tt.blocks) || !tt.blocks.every(isBlock)) fail("topic");
    }
  }
  return data as PromiseBook;
}

/** Joins artificial line wraps into flowing text while keeping blank-line paragraph breaks. */
export function unwrap(text: string): string {
  return text
    .split(/\n\s*\n/)
    .map(p => p.replace(/[ \t]*\n[ \t]*/g, " ").replace(/[ \t]{2,}/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");
}

/**
 * Splits passage text into the quotation and its trailing citation.
 * Only splits when the final em-dash segment actually is the citation, so quote
 * wording (including internal dashes) is never lost.
 */
export function splitPassage(block: Block): { quote: string; citationPrinted: boolean; translationPrinted: boolean } {
  const text = block.text;
  const idx = text.lastIndexOf("—");
  if (idx >= 0 && block.reference) {
    const tail = text.slice(idx + 1).trim();
    const ref = block.reference.trim();
    if (tail === ref || tail.replace(/\s+/g, " ") === ref) {
      return { quote: unwrap(text.slice(0, idx)), citationPrinted: true, translationPrinted: false };
    }
    const m = tail.match(/^(.*?),\s*([A-Z]{2,5})$/);
    if (m && m[1].trim() === ref) {
      return { quote: unwrap(text.slice(0, idx)), citationPrinted: true, translationPrinted: m[2] === block.translation };
    }
  }
  return { quote: unwrap(text), citationPrinted: false, translationPrinted: false };
}

/** Text for clipboard: original wording, adding only a missing reference/translation. */
export function passageCopyText(block: Block): string {
  const base = unwrap(block.text);
  if (block.kind !== "passage" || !block.reference) return base;
  const { citationPrinted, translationPrinted } = splitPassage(block);
  if (!citationPrinted) return `${base}\n—${block.reference}${block.translation ? `, ${block.translation}` : ""}`;
  if (!translationPrinted && block.translation) return `${base}, ${block.translation}`;
  return base;
}

export function topicCopyText(groupTitle: string, topic: Topic): string {
  return [`${groupTitle}: ${topic.title}`, ...topic.blocks.map(passageCopyText)].join("\n\n");
}

/** Resolves a printed reference (or bibleReference override) to the local NET reader URL. */
export function bibleHref(baseUrl: string, block: Pick<Block, "reference" | "bibleReference">): string | null {
  const raw = (block.bibleReference || block.reference || "").trim();
  const m = raw.match(/^(.+?)\s+(\d+)(?:\s*:\s*(\d+))?/);
  if (!m) return null;
  const book = canonicalBook(m[1]) as string | null;
  if (!book) return null;
  const chapter = Number(m[2]);
  const verses = (CHAPTER_VERSES as Record<string, number[]>)[book];
  if (!verses || !verses[chapter - 1]) return null;
  const v = m[3] ? Number(m[3]) : undefined;
  const parsed = { book, chapter, verse: v && v <= verses[chapter - 1] ? v : undefined };
  const q = new URLSearchParams({ book: parsed.book, chapter: String(parsed.chapter) });
  if (parsed.verse) q.set("verse", String(parsed.verse));
  q.set("translation", "net");
  return `${baseUrl.replace(/\/$/, "")}/bible?${q.toString()}`;
}

export function viewToHash(v: View): string {
  switch (v.kind) {
    case "intro": return "#introduction";
    case "copyright": return "#copyright";
    case "saved": return "#saved";
    case "group": return `#group=${encodeURIComponent(v.groupId)}`;
    case "topic": return `#topic=${encodeURIComponent(v.topicId)}`;
  }
}

export function hashToView(hash: string, book: PromiseBook | null): View {
  const h = hash.replace(/^#/, "");
  if (h === "copyright") return { kind: "copyright" };
  if (h === "saved") return { kind: "saved" };
  const [k, raw] = h.split("=");
  let id = "";
  try { id = decodeURIComponent(raw || ""); } catch { id = ""; }
  if (k === "topic" && id && (!book || findTopic(book, id))) return { kind: "topic", topicId: id };
  if (k === "group" && id && (!book || book.groups.some(g => g.id === id))) return { kind: "group", groupId: id };
  return { kind: "intro" };
}

export function findTopic(book: PromiseBook, topicId: string): { group: Group; topic: Topic } | null {
  for (const group of book.groups) {
    const topic = group.topics.find(t => t.id === topicId);
    if (topic) return { group, topic };
  }
  return null;
}

/** Parses stored saved ids; returns [] for anything corrupt. */
export function parseSaved(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === "string"))) : [];
  } catch { return []; }
}

export function loadSaved(): { ids: string[]; error: string | null } {
  try { return { ids: parseSaved(window.localStorage.getItem(STORAGE_KEY)), error: null }; }
  catch { return { ids: [], error: "Your browser is blocking storage, so saved studies cannot be loaded." }; }
}

export function storeSaved(ids: string[]): string | null {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); return null; }
  catch { return "Your browser blocked storage, so this change will not be kept after reload."; }
}

export function toggleSaved(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
}

/** Copy with Clipboard API, falling back to execCommand. Resolves false if both fail. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}

/** Splits text into plain/URL parts for rendering attribution links. */
export function linkifyParts(text: string): { text: string; href?: string }[] {
  const out: { text: string; href?: string }[] = [];
  const re = /(https?:\/\/[^\s”"]+|JesusOnlineMinistries\.org)/g;
  let last = 0; let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    const href = m[0].startsWith("http") ? m[0] : `https://${m[0].toLowerCase()}`;
    out.push({ text: m[0], href });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}
