import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_STUDY, chapterKey, verseKey, parseBackup, loadStudy, persistStudy,
  mergeStudy, exportStudyJson, exportStudyText,
} from "../src/components/bible-reader/study-storage.ts";

const KEY = "jo-equip-bible-study";
const verse = {
  book: "John", chapter: 1, verse: 1, translation: "kjv",
  text: "In the beginning was the Word, and the Word was with God, and the Word was God.",
  bookmark: true, highlight: "purple", note: "My study\nSecond line",
};
const chapter = { book: "John", chapter: 1, translation: "kjv" };
const fixture = () => ({
  version: 2, verses: [{ ...verse }], chapters: [{ ...chapter }], lastRead: { ...chapter },
});

function withStorage(storage, callback) {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
  try { callback(); } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
}

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
}

test("v2 JSON roundtrip preserves text, every color, notes and translation", () => {
  for (const highlight of ["yellow", "blue", "green", "pink", "purple"]) {
    const data = fixture();
    data.verses[0].highlight = highlight;
    assert.deepEqual(parseBackup(exportStudyJson(data)), data);
  }
  assert.notEqual(verseKey(verse), verseKey({ ...verse, translation: "net" }));
  assert.notEqual(chapterKey(chapter), chapterKey({ ...chapter, translation: "net" }));
});

test("v1 same-schema backups default missing translations to NET without changing study content", () => {
  const data = fixture();
  data.version = 1;
  delete data.verses[0].translation;
  delete data.chapters[0].translation;
  delete data.lastRead.translation;
  const migrated = parseBackup(JSON.stringify(data));
  assert.equal(migrated.version, 2);
  assert.deepEqual(migrated.verses[0], { ...verse, translation: "net" });
  assert.equal(migrated.chapters[0].translation, "net");
  assert.equal(migrated.lastRead.translation, "net");
  assert.deepEqual(parseBackup(exportStudyJson(migrated)), migrated);
  assert.equal(parseBackup(JSON.stringify({ ...fixture(), version: 1 })).verses[0].translation, "kjv");
});

test("merge deduplicates per translation, keeps existing notes/bookmarks and is repeatable", () => {
  const existing = fixture();
  const incoming = fixture();
  incoming.verses[0].note = "Another observation";
  incoming.verses[0].bookmark = false;
  delete incoming.verses[0].highlight;
  incoming.verses.push({ ...verse, translation: "net" });
  incoming.chapters.push({ ...chapter, translation: "net" });
  const merged = mergeStudy(existing, incoming);
  assert.equal(merged.verses.length, 2);
  assert.equal(merged.chapters.length, 2);
  assert.equal(merged.verses[0].bookmark, true);
  assert.equal(merged.verses[0].highlight, "purple");
  assert.equal(merged.verses[0].note, `${verse.note}\n\nAnother observation`);
  assert.deepEqual(mergeStudy(merged, incoming), merged);
  assert.deepEqual(existing, fixture(), "merge never mutates input");
});

test("persist verifies roundtrip; replace removes old records and leaves unrelated bookmarks alone", () => {
  const storage = memoryStorage();
  storage.setItem("knowing-god-study", "untouched");
  withStorage(storage, () => {
    assert.deepEqual(loadStudy(), EMPTY_STUDY);
    const initial = loadStudy();
    initial.verses.push(verse);
    assert.deepEqual(loadStudy(), EMPTY_STUDY, "empty loads do not share mutable arrays");
    persistStudy(fixture());
    assert.deepEqual(loadStudy(), fixture());
    const replacement = { version: 2, verses: [], chapters: [chapter] };
    persistStudy(parseBackup(exportStudyJson(replacement)));
    assert.deepEqual(loadStudy(), replacement);
    assert.equal(storage.getItem("knowing-god-study"), "untouched");
  });
});

test("TXT contains readable chapters, verse text, translations, highlights and multiline notes", () => {
  const txt = exportStudyText(fixture());
  for (const expected of ["John 1 (KJV)", "John 1:1 (KJV)", verse.text, "purple", verse.note, "JSON backup"]) {
    assert.ok(txt.includes(expected), expected);
  }
  assert.throws(() => parseBackup(txt), /not valid JSON/);
});

test("invalid backup records are rejected in full rather than discarded", () => {
  const bad = [
    data => { data.version = 3; },
    data => { data.verses[0].book = "Imaginary"; },
    data => { data.verses[0].chapter = 22; },
    data => { data.verses[0].chapter = 1.5; },
    data => { data.verses[0].verse = 0; },
    data => { data.verses[0].verse = 177; },
    data => { data.verses[0].verse = 52; },
    data => { data.verses[0].translation = "niv"; },
    data => { delete data.verses[0].translation; },
    data => { data.verses[0].highlight = "orange"; },
    data => { data.verses[0].note = 42; },
    data => { data.verses[0].bookmark = "true"; },
    data => { data.verses[0].text = ""; },
    data => { data.verses[0].extra = "never silently dropped"; },
    data => { data.verses.push({ ...verse }); },
    data => { data.chapters.push({ ...chapter }); },
    data => { data.lastRead = null; },
    data => { data.chapters = {}; },
  ];
  for (const mutate of bad) {
    const data = fixture();
    mutate(data);
    assert.throws(() => parseBackup(JSON.stringify(data)), /Invalid Bible study backup/);
  }
  for (const invalid of ["null", "[]", "{}", "not json"]) {
    assert.throws(() => parseBackup(invalid), /Invalid Bible study backup/);
  }
});

test("bounds account for NET's extra numbered verse in 3 John", () => {
  const data = fixture();
  data.verses[0] = { ...verse, book: "3 John", verse: 15, translation: "net" };
  assert.equal(parseBackup(JSON.stringify(data)).verses[0].verse, 15);
  data.verses[0].translation = "kjv";
  assert.throws(() => parseBackup(JSON.stringify(data)), /from 1 to 14/);
});

test("invalid stored data is not overwritten or treated as empty", () => {
  const storage = memoryStorage();
  storage.setItem(KEY, '{"version":500}');
  withStorage(storage, () => {
    assert.throws(loadStudy, /Invalid Bible study backup/);
    assert.equal(storage.getItem(KEY), '{"version":500}');
    assert.throws(() => persistStudy({ ...fixture(), version: 3 }), /Invalid/);
    assert.equal(storage.getItem(KEY), '{"version":500}');
  });
});

test("blocked storage and quota errors are explicit and keep prior data", () => {
  const storage = memoryStorage();
  const prior = exportStudyJson(fixture());
  storage.setItem(KEY, prior);
  withStorage({ ...storage, setItem() { throw new DOMException("Quota exceeded", "QuotaExceededError"); } }, () => {
    assert.throws(() => persistStudy(EMPTY_STUDY), /blocked or full.*Quota exceeded/);
    assert.equal(storage.getItem(KEY), prior);
  });
  withStorage({ getItem() { throw new DOMException("Access denied", "SecurityError"); } }, () => {
    assert.throws(loadStudy, /Could not read.*Access denied/);
    assert.throws(() => persistStudy(fixture()), /Could not save.*Access denied/);
  });
});

test("failed read-back verification reports failure and restores prior data", () => {
  const storage = memoryStorage();
  const prior = exportStudyJson(fixture());
  storage.setItem(KEY, prior);
  let reads = 0;
  withStorage({
    ...storage,
    getItem(key) { return ++reads === 2 ? "bad write" : storage.getItem(key); },
  }, () => {
    assert.throws(() => persistStudy(EMPTY_STUDY), /verifying the write/);
    assert.equal(storage.getItem(KEY), prior);
  });
});