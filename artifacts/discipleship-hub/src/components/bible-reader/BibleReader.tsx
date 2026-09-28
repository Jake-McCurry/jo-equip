import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { EMPTY_STUDY, loadStudy, persistStudy, type ChapterRecord, type StudyData, type VerseRecord } from "./study-storage";
import { errMsg, fetchPassage, locationSearch, readLocation, upsertVerse, type Location, type Passage } from "./reader-utils";
import { ReaderNav } from "./ReaderNav";
import { PassageView } from "./PassageView";
import { RecapPanel } from "./RecapPanel";
import { VerseStudyPanel } from "./VerseStudyPanel";
import { StudyLibrary } from "./StudyLibrary";
import { BackupPanel } from "./BackupPanel";
import { Attribution } from "./Attribution";
import "./bible-reader.css";

export default function BibleReader({ baseUrl }: { baseUrl: string }) {
  const [loc, setLoc] = useState<Location | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [verseNotice, setVerseNotice] = useState("");
  const [selected, setSelected] = useState<number | undefined>();
  const [study, setStudy] = useState<StudyData>(EMPTY_STUDY);
  const [storageError, setStorageError] = useState("");
  const [locked, setLocked] = useState(false); // unreadable storage: never overwrite automatically
  const [initialLastRead, setInitialLastRead] = useState<ChapterRecord | undefined>();
  const studyRef = useRef(study); studyRef.current = study;
  const lockedRef = useRef(locked); lockedRef.current = locked;

  useEffect(() => {
    const l = readLocation();
    setLoc(l); setSelected(l.verse);
    window.history.replaceState(null, "", window.location.pathname + locationSearch(l));
    try {
      const s = loadStudy(); setStudy(s); setInitialLastRead(s.lastRead);
    } catch (e) {
      setLocked(true);
      setStorageError(`Your saved study in this browser could not be read (${errMsg(e, "unknown error")}). It has been left untouched. Importing a JSON backup will replace it.`);
    }
    const onPop = () => { const n = readLocation(); setLoc(n); setSelected(n.verse); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const commit = useCallback((next: StudyData, explicit = false): boolean => {
    if (lockedRef.current && !explicit) {
      setStorageError(s => s || "Saving is paused because existing saved data could not be read.");
      return false;
    }
    try {
      persistStudy(next);
      studyRef.current = next;
      setStudy(next);
      if (explicit) { setLocked(false); setStorageError(""); }
      return true;
    } catch (e) {
      setStorageError(`Could not save to this browser: ${errMsg(e, "storage is unavailable")}. Your change was not kept.`);
      if (explicit) throw e;
      return false;
    }
  }, []);

  const bookKey = loc ? `${loc.book}|${loc.chapter}|${loc.translation}` : "";
  useEffect(() => {
    if (!loc) return;
    const ctrl = new AbortController();
    setLoading(true); setError(""); setPassage(null); setVerseNotice("");
    fetchPassage(baseUrl, loc, ctrl.signal)
      .then(p => {
        if (ctrl.signal.aborted) return;
        setPassage({ ...p, book: loc.book, chapter: loc.chapter, translation: loc.translation }); setLoading(false);
        const maxV = p.verses[p.verses.length - 1]?.verse ?? 0;
        if (loc.verse && !p.verses.some(v => v.verse === loc.verse)) {
          setVerseNotice(`${loc.book} ${loc.chapter} has ${maxV} verses, so verse ${loc.verse} was not found. Showing the whole chapter.`);
          setSelected(undefined);
          setLoc(l => (l && l.book === loc.book && l.chapter === loc.chapter ? { ...l, verse: undefined } : l));
          window.history.replaceState(null, "", window.location.pathname + locationSearch({ ...loc, verse: undefined }));
        }
        const lr = { book: loc.book, chapter: loc.chapter, translation: loc.translation };
        const cur = studyRef.current.lastRead;
        if (!lockedRef.current && (!cur || cur.book !== lr.book || cur.chapter !== lr.chapter || cur.translation !== lr.translation)) {
          try { const next = { ...studyRef.current, lastRead: lr }; persistStudy(next); studyRef.current = next; setStudy(next); }
          catch (e) { setStorageError(`Reading works, but your place could not be saved in this browser: ${errMsg(e, "storage is unavailable")}. Saved verses may not persist either.`); }
        }
      })
      .catch(e => { if (ctrl.signal.aborted) return; setPassage(null); setLoading(false); setError(errMsg(e, "The chapter could not be loaded.")); });
    return () => ctrl.abort();
  }, [bookKey, retry, baseUrl]);

  const go = (next: Location) => {
    setInitialLastRead(undefined);
    setLoc(next); setSelected(next.verse);
    window.history.pushState(null, "", window.location.pathname + locationSearch(next));
    if (!next.verse) document.getElementById("br-top")?.scrollIntoView({ block: "start" });
  };

  const selectVerse = (v: number) => {
    if (!loc) return;
    const nv = selected === v ? undefined : v;
    setSelected(nv);
    const n = { ...loc, verse: nv };
    setLoc(n);
    window.history.replaceState(null, "", window.location.pathname + locationSearch(n));
  };

  if (!loc) return <div className="br-root min-h-[60dvh]"><div className="mx-auto max-w-3xl p-6"><div className="br-skel h-64" /></div></div>;

  const current = passage && passage.book === loc.book && passage.chapter === loc.chapter && passage.translation === loc.translation ? passage : null;
  const chapterRecords = study.verses.filter(v => v.book === loc.book && v.chapter === loc.chapter && v.translation === loc.translation);
  const selText = selected ? current?.verses.find(v => v.verse === selected)?.text : undefined;
  const selRecord = chapterRecords.find(r => r.verse === selected);
  const chapterSaved = study.chapters.some(c => c.book === loc.book && c.chapter === loc.chapter && c.translation === loc.translation);

  const changeVerse = (patch: Partial<Pick<VerseRecord, "bookmark" | "highlight" | "note">>) => {
    if (!selected || !selText) return false;
    const base: VerseRecord = selRecord ?? { book: loc.book, chapter: loc.chapter, verse: selected, translation: loc.translation, text: selText, bookmark: false, note: "" };
    const rec: VerseRecord = { ...base, ...patch, text: selText };
    if ("highlight" in patch && !patch.highlight) delete rec.highlight;
    return commit(upsertVerse(study, rec));
  };
  const toggleChapter = () => {
    const c = { book: loc.book, chapter: loc.chapter, translation: loc.translation };
    const rest = study.chapters.filter(x => !(x.book === c.book && x.chapter === c.chapter && x.translation === c.translation));
    commit({ ...study, chapters: chapterSaved ? rest : [...rest, c] });
  };
  const removeChapter = (c: ChapterRecord) =>
    commit({ ...study, chapters: study.chapters.filter(x => !(x.book === c.book && x.chapter === c.chapter && x.translation === c.translation)) });

  const panelProps = selected && selText ? { loc, verse: selected, text: selText, record: selRecord, onChange: changeVerse, onClose: () => selectVerse(selected) } : null;

  return (
    <div className="br-root" id="br-top">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-3 py-4 md:px-6 md:py-6 xl:grid-cols-[280px_minmax(0,1fr)_320px] xl:gap-6">
        {storageError && (
          <div role="alert" className="xl:col-span-3 flex items-start gap-2 rounded border border-[var(--warm-300)] bg-[var(--warm-50)] p-3 text-sm font-semibold">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--color-action-warm)]" /> {storageError}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-4 xl:col-start-2 xl:row-start-2">
          <ReaderNav loc={loc} onGo={go} />
          {verseNotice && <p role="status" className="rounded border border-[var(--color-border-control)] bg-[var(--color-surface-soft)] p-3 text-sm font-semibold">{verseNotice}</p>}
          <PassageView loc={loc} passage={current} loading={loading || (!current && !error)} error={error} onRetry={() => setRetry(r => r + 1)}
            records={chapterRecords} selected={selected} onSelect={selectVerse} chapterSaved={chapterSaved} onToggleChapter={toggleChapter} onGo={go} />
          <RecapPanel />
          <Attribution translation={loc.translation} apiText={current?.attribution} />
        </div>
        <aside aria-label="My study" className={`flex flex-col gap-4 xl:col-start-1 xl:row-start-2 ${panelProps ? "pb-72 xl:pb-0" : ""}`}>
          <div className="flex flex-col gap-4 xl:sticky xl:top-[100px]">
            <StudyLibrary study={study} loc={loc} initialLastRead={initialLastRead ?? study.lastRead} onGo={go} onRemoveChapter={removeChapter} />
            <BackupPanel study={study} onPersist={next => { commit(next, true); }} />
          </div>
        </aside>
        <aside aria-label="Verse study" className="hidden xl:block xl:col-start-3 xl:row-start-2">
          <div className="br-card sticky top-[100px] p-5">
            {panelProps ? <VerseStudyPanel {...panelProps} /> : (
              <div className="py-6">
                <p className="br-eyebrow">Verse study</p>
                <p className="mt-2 text-[17px] leading-7 text-[var(--color-text-muted)]">Select a verse in the passage to read it here, highlight it in one of five colors, bookmark it, write a note, or share a link.</p>
              </div>
            )}
          </div>
        </aside>
      </div>
      {panelProps && (
        <div role="dialog" aria-label="Selected verse" className="br-sheet fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] overflow-y-auto border-t-4 border-[var(--color-accent)] bg-[var(--color-surface)] p-4 xl:hidden">
          <VerseStudyPanel {...panelProps} compact />
        </div>
      )}
    </div>
  );
}
