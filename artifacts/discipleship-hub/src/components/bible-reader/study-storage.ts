import { BOOKS } from "./catalog.ts";
import { CHAPTER_VERSES } from "../../../worker/bible-catalog.js";

export type Translation = "net" | "kjv";
export type Highlight = "yellow" | "blue" | "green" | "pink" | "purple";
export interface VerseRecord {
  book: string;
  chapter: number;
  verse: number;
  translation: Translation;
  text: string;
  bookmark: boolean;
  highlight?: Highlight;
  note: string;
}
export interface ChapterRecord {
  book: string;
  chapter: number;
  translation: Translation;
}
export interface StudyData {
  version: 2;
  verses: VerseRecord[];
  chapters: ChapterRecord[];
  lastRead?: ChapterRecord;
}

export const EMPTY_STUDY: StudyData = { version: 2, verses: [], chapters: [] };
const STORAGE_KEY = "jo-equip-bible-study";
const COLORS: Highlight[] = ["yellow", "blue", "green", "pink", "purple"];

export function chapterKey(record: ChapterRecord): string {
  return `${record.book}:${record.chapter}:${record.translation}`;
}

export function verseKey(record: VerseRecord): string {
  return `${record.book}:${record.chapter}:${record.verse}:${record.translation}`;
}

function invalid(message: string): never {
  throw new Error(`Invalid Bible study backup: ${message}. No saved study has been changed.`);
}

function object(value: unknown, location: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid(`${location} must be an object`);
  }
  return value as Record<string, unknown>;
}

function allowedKeys(value: Record<string, unknown>, keys: string[], location: string): void {
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) invalid(`${location} contains unsupported field "${key}"`);
  }
}

function chapter(value: unknown, version: number, location: string, isVerse = false): ChapterRecord {
  const row = object(value, location);
  allowedKeys(row, isVerse
    ? ["book", "chapter", "verse", "translation", "text", "bookmark", "highlight", "note"]
    : ["book", "chapter", "translation"], location);
  const book = BOOKS.find(book => book.name === row.book);
  if (!book) invalid(`${location}.book must be a canonical Bible book name`);
  if (!Number.isInteger(row.chapter) || (row.chapter as number) < 1 || (row.chapter as number) > book.chapters) {
    invalid(`${location}.chapter must be a whole number from 1 to ${book.chapters}`);
  }
  const translation = row.translation === undefined && version === 1 ? "net" : row.translation;
  if (translation !== "net" && translation !== "kjv") {
    invalid(`${location}.translation must be "net" or "kjv"`);
  }
  return { book: book.name, chapter: row.chapter as number, translation };
}

function validate(value: unknown): StudyData {
  const root = object(value, "backup");
  allowedKeys(root, ["version", "verses", "chapters", "lastRead"], "backup");
  if (root.version !== 1 && root.version !== 2) invalid("version must be 1 or 2");
  if (!Array.isArray(root.verses) || !Array.isArray(root.chapters)) {
    invalid("verses and chapters must both be arrays");
  }
  const version = root.version as number;
  const verses = root.verses.map((value, index): VerseRecord => {
    const location = `verses[${index}]`;
    const base = chapter(value, version, location, true);
    const row = object(value, location);
    // NET separates the final KJV verse of 3 John into verses 14 and 15.
    const maxVerse = base.book === "3 John" && base.translation === "net"
      ? 15 : CHAPTER_VERSES[base.book][base.chapter - 1];
    if (!Number.isInteger(row.verse) || (row.verse as number) < 1 || (row.verse as number) > maxVerse) {
      invalid(`${location}.verse must be a whole number from 1 to ${maxVerse}`);
    }
    if (typeof row.text !== "string" || !row.text.trim()) invalid(`${location}.text must contain verse text`);
    if (typeof row.note !== "string") invalid(`${location}.note must be text`);
    if (typeof row.bookmark !== "boolean") invalid(`${location}.bookmark must be true or false`);
    if (row.highlight !== undefined && !COLORS.includes(row.highlight as Highlight)) {
      invalid(`${location}.highlight must be yellow, blue, green, pink, or purple`);
    }
    return {
      ...base, verse: row.verse as number, text: row.text as string,
      bookmark: row.bookmark as boolean, note: row.note as string,
      ...(row.highlight === undefined ? {} : { highlight: row.highlight as Highlight }),
    };
  });
  const chapters = root.chapters.map((value, index) => chapter(value, version, `chapters[${index}]`));
  if (new Set(verses.map(verseKey)).size !== verses.length) invalid("verses contains duplicate references for the same translation");
  if (new Set(chapters.map(chapterKey)).size !== chapters.length) invalid("chapters contains duplicate references for the same translation");
  return {
    version: 2, verses, chapters,
    ...(root.lastRead === undefined ? {} : { lastRead: chapter(root.lastRead, version, "lastRead") }),
  };
}

export function parseBackup(text: string): StudyData {
  let value: unknown;
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    invalid("the file is not valid JSON; choose a JSON backup, not the reading/printing TXT export");
  }
  return validate(value);
}

function storageError(action: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`Could not ${action} Bible study in browser storage. Storage may be blocked or full. Keep your JSON backup and enable browser storage or free space before trying again. ${detail}`);
}

export function loadStudy(): StudyData {
  let saved: string | null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    throw storageError("read", error);
  }
  return saved === null ? { version: 2, verses: [], chapters: [] } : parseBackup(saved);
}

export function persistStudy(data: StudyData): void {
  const serialized = exportStudyJson(data);
  let previous: string | null = null;
  let wrote = false;
  try {
    previous = localStorage.getItem(STORAGE_KEY);
    localStorage.setItem(STORAGE_KEY, serialized);
    wrote = true;
    if (localStorage.getItem(STORAGE_KEY) !== serialized) {
      throw new Error("The browser did not return the saved data when verifying the write.");
    }
  } catch (error) {
    // A failed setItem is atomic. Only attempt rollback after a completed write.
    if (wrote) {
      try {
        if (previous === null) localStorage.removeItem(STORAGE_KEY);
        else localStorage.setItem(STORAGE_KEY, previous);
      } catch {
        throw storageError("save", "Write verification and restoration failed. Your browser's stored copy cannot be confirmed; retain your JSON backup.");
      }
    }
    throw storageError("save", error);
  }
}

export function mergeStudy(current: StudyData, incoming: StudyData): StudyData {
  const existing = validate(current);
  const imported = validate(incoming);
  const verses = new Map(existing.verses.map(row => [verseKey(row), row]));
  for (const row of imported.verses) {
    const prior = verses.get(verseKey(row));
    verses.set(verseKey(row), prior ? {
      ...prior, ...row,
      bookmark: prior.bookmark || row.bookmark,
      highlight: row.highlight ?? prior.highlight,
      note: prior.note && row.note && prior.note !== row.note
        ? (prior.note.split("\n\n").includes(row.note) ? prior.note : `${prior.note}\n\n${row.note}`)
        : row.note || prior.note,
    } : row);
  }
  const chapters = new Map(existing.chapters.map(row => [chapterKey(row), row]));
  for (const row of imported.chapters) chapters.set(chapterKey(row), row);
  return {
    version: 2, verses: [...verses.values()], chapters: [...chapters.values()],
    ...((imported.lastRead ?? existing.lastRead) ? { lastRead: imported.lastRead ?? existing.lastRead } : {}),
  };
}

export function exportStudyJson(data: StudyData): string {
  return JSON.stringify(validate(data), null, 2);
}

export function exportStudyText(data: StudyData): string {
  const checked = validate(data);
  const reference = (row: ChapterRecord) => `${row.book} ${row.chapter} (${row.translation.toUpperCase()})`;
  const lines = [
    "JO EQUIP — Saved Bible Study",
    "For reading or printing. To restore your study, import the separate JSON backup.",
    "",
    "SAVED CHAPTERS",
    ...checked.chapters.map(reference),
    ...(checked.chapters.length ? [] : ["None"]),
    "",
    "SAVED VERSES",
  ];
  for (const row of checked.verses) {
    lines.push(
      "", `${row.book} ${row.chapter}:${row.verse} (${row.translation.toUpperCase()})`,
      row.text, `Bookmark: ${row.bookmark ? "Yes" : "No"}`,
      `Highlight: ${row.highlight ?? "None"}`, `Notes: ${row.note || "None"}`,
    );
  }
  if (!checked.verses.length) lines.push("None");
  if (checked.lastRead) lines.push("", `Last read: ${reference(checked.lastRead)}`);
  return `${lines.join("\n")}\n`;
}