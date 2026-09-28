import { BOOKS } from "./catalog";
import type { Highlight, StudyData, Translation, VerseRecord } from "./study-storage";

export type Verse = { verse: number; text: string };
export type Passage = { book: string; chapter: number; translation: Translation; verses: Verse[]; attribution: string };
export type Location = { book: string; chapter: number; verse?: number; translation: Translation };

export const TRANSLATIONS: { value: Translation; label: string }[] = [
  { value: "net" as Translation, label: "NET" },
  { value: "kjv" as Translation, label: "KJV" },
];

export const HIGHLIGHTS: { value: Highlight; label: string; swatch: string; wash: string }[] = [
  { value: "yellow" as Highlight, label: "Yellow", swatch: "#f2c230", wash: "#fff1b0" },
  { value: "blue" as Highlight, label: "Blue", swatch: "#3a9bea", wash: "#d3ebff" },
  { value: "green" as Highlight, label: "Green", swatch: "#3fa55a", wash: "#d6f1d4" },
  { value: "pink" as Highlight, label: "Pink", swatch: "#e0558f", wash: "#ffd9e8" },
  { value: "purple" as Highlight, label: "Purple", swatch: "#8757c9", wash: "#e8dcff" },
];

export const washFor = (h?: Highlight) => HIGHLIGHTS.find(x => x.value === h)?.wash;

export const translationLabel = (t: Translation) => String(t).toUpperCase();

export const refLabel = (book: string, chapter: number, verse?: number) =>
  `${book} ${chapter}${verse ? `:${verse}` : ""}`;

export const trimBase = (baseUrl: string) => baseUrl.replace(/\/$/, "");

export function readLocation(): Location {
  const q = new URLSearchParams(window.location.search);
  const rawBook = q.get("book") || "";
  const found = BOOKS.find(b => b.name.toLowerCase() === rawBook.toLowerCase());
  const t = (q.get("translation") || "net").toLowerCase();
  const translation = (t === "kjv" ? "kjv" : "net") as Translation;
  if (!found) return { book: "John", chapter: 1, translation };
  const ch = Number(q.get("chapter"));
  const chapter = Number.isInteger(ch) && ch >= 1 && ch <= found.chapters ? ch : 1;
  const v = Number(q.get("verse"));
  return { book: found.name, chapter, verse: Number.isInteger(v) && v > 0 ? v : undefined, translation };
}

export function locationSearch(loc: Location) {
  const q = new URLSearchParams({ book: loc.book, chapter: String(loc.chapter) });
  if (loc.verse) q.set("verse", String(loc.verse));
  q.set("translation", String(loc.translation));
  return `?${q.toString()}`;
}

export function shareUrl(loc: Location) {
  return `${window.location.origin}${window.location.pathname}${locationSearch(loc)}`;
}

export async function fetchPassage(baseUrl: string, loc: Location, signal: AbortSignal): Promise<Passage> {
  const q = new URLSearchParams({ book: loc.book, chapter: String(loc.chapter), translation: String(loc.translation) });
  const res = await fetch(`${trimBase(baseUrl)}/api/bible?${q}`, { signal, credentials: "include" });
  let body: unknown = null;
  try { body = await res.json(); } catch { /* handled below */ }
  if (!res.ok) {
    const msg = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "";
    throw new Error(msg || `The Bible text could not be loaded (status ${res.status}).`);
  }
  const p = body as Passage;
  if (!p || !Array.isArray(p.verses) || p.verses.length === 0) throw new Error("The Bible service returned an empty chapter.");
  return p;
}

export const sameVerse = (r: VerseRecord, book: string, chapter: number, verse: number, t: Translation) =>
  r.book === book && r.chapter === chapter && r.verse === verse && r.translation === t;

export const isEmptyRecord = (r: VerseRecord) => !r.bookmark && !r.highlight && !r.note.trim();

export function upsertVerse(data: StudyData, rec: VerseRecord): StudyData {
  const rest = data.verses.filter(v => !sameVerse(v, rec.book, rec.chapter, rec.verse, rec.translation));
  return { ...data, verses: isEmptyRecord(rec) ? rest : [...rest, rec] };
}

export function download(filename: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
