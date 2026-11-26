import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, BookA, BookOpenText, ChevronRight, Link2, MapPin, ScrollText } from "lucide-react";
import { EMPTY_STUDY, loadStudy, persistStudy, type ChapterRecord, type StudyData, type VerseRecord } from "./study-storage";
import { errMsg, fetchPassage, locationSearch, readLocation, readStrongs, readStudyLink, upsertVerse, type Location, type Passage, type StudyLink } from "./reader-utils";
import { ReaderNav } from "./ReaderNav";
import { PassageView } from "./PassageView";
import { RecapPanel } from "./RecapPanel";
import { VerseStudyPanel } from "./VerseStudyPanel";
import { StudyLibrary } from "./StudyLibrary";
import { BackupPanel } from "./BackupPanel";
import { Attribution } from "./Attribution";
import { StudyPane, type StudyTab } from "./StudyPane";
import { WordStudyPanel } from "./WordStudyPanel";
import { loadChapterWords } from "./strongs-data";
import { CommentaryPanel } from "./CommentaryPanel";
import { CrossRefPanel } from "./CrossRefPanel";
import { PlacesPanel } from "./PlacesPanel";
import { SermonsPanel } from "./SermonsPanel";
import { DictionaryPanel } from "./DictionaryPanel";
import { loadDictIndex, type DictIndex } from "@/components/bible-dictionary/dictionary-data";
import { isCommentaryId, type CommentaryId } from "./commentary-format";
import type { KjvTag } from "./strongs-align";
import "./bible-reader.css";

export default function BibleReader({ baseUrl }: { baseUrl: string }) {
  const [loc, setLoc] = useState<Location | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [navigationId, setNavigationId] = useState(0);
  const [verseNotice, setVerseNotice] = useState("");
  const [selected, setSelected] = useState<number | undefined>();
  const [study, setStudy] = useState<StudyData>(EMPTY_STUDY);
  const [storageError, setStorageError] = useState("");
  const [locked, setLocked] = useState(false); // unreadable storage: never overwrite automatically
  const [initialLastRead, setInitialLastRead] = useState<ChapterRecord | undefined>();
  const studyRef = useRef(study); studyRef.current = study;
  const lockedRef = useRef(locked); lockedRef.current = locked;
  const [strongs, setStrongs] = useState<string | null>(null);
  const strongsRef = useRef(strongs); strongsRef.current = strongs;
  const [tab, setTabState] = useState<StudyTab>("notes");
  const [commentary, setCommentaryState] = useState<CommentaryId>("mhc");
  const linkRef = useRef<StudyLink | null>(null);
  const [showStrongs, setShowStrongs] = useState(false);
  const [kjvTags, setKjvTags] = useState<{ key: string; tags: Record<string, KjvTag[]> | null; error: string }>({ key: "", tags: null, error: "" });
  const [desktop, setDesktop] = useState(false);
  // Dictionary: entry open in the Dictionary tab (?tab=dictionary&entry=slug) and the optional
  // marking of dictionary names in the passage (off by default, remembered in this browser).
  const [dictEntry, setDictEntry] = useState<string | null>(null);
  const dictEntryRef = useRef(dictEntry); dictEntryRef.current = dictEntry;
  const [showDict, setShowDict] = useState(false);
  const [dictIndex, setDictIndex] = useState<{ data: DictIndex | null; error: string }>({ data: null, error: "" });
  const [dictRetry, setDictRetry] = useState(0);
  const url = (l: Location, s = strongsRef.current) => window.location.pathname + locationSearch(l, s, linkRef.current);
  // Links to other passages never carry the open dictionary entry along.
  const hrefFor = (l: Location) => window.location.pathname + locationSearch(l, null, linkRef.current?.tab === "dictionary" ? { tab: "dictionary" } : linkRef.current);
  const setEntry = (slug: string | null) => {
    setDictEntry(slug); dictEntryRef.current = slug;
    if (linkRef.current?.tab === "dictionary") linkRef.current = { tab: "dictionary", entry: slug ?? undefined };
  };
  // Tab state plus the deep link it implies (?commentary= / ?tab=xrefs|places|sermons|dictionary); callers write the URL.
  const applyTab = (t: StudyTab, c: CommentaryId = commentaryRef.current) => {
    setTabState(t);
    linkRef.current = t === "commentary" ? { tab: "commentary", commentary: c } : t === "dictionary" ? { tab: t, entry: dictEntryRef.current ?? undefined } : t === "xrefs" || t === "places" || t === "sermons" ? { tab: t } : null;
  };
  const commentaryRef = useRef(commentary); commentaryRef.current = commentary;

  useEffect(() => {
    const l = readLocation();
    const s = readStrongs();
    setLoc(l); setSelected(l.verse); setStrongs(s); strongsRef.current = s;
    let c: CommentaryId = "mhc";
    try {
      const dictOn = window.localStorage.getItem("jo-bible-show-dictionary") === "1";
      setShowDict(dictOn);
      setShowStrongs(!dictOn && window.localStorage.getItem("jo-bible-show-strongs") === "1");
      const saved = window.localStorage.getItem("jo-bible-commentary");
      if (isCommentaryId(saved)) c = saved;
    } catch { /* optional preference */ }
    const st = readStudyLink();
    if (st?.tab === "commentary") c = st.commentary;
    if (st?.tab === "dictionary" && st.entry) { setDictEntry(st.entry); dictEntryRef.current = st.entry; }
    setCommentaryState(c); commentaryRef.current = c;
    if (st) applyTab(st.tab, c); else if (s) applyTab("words");
    window.history.replaceState(null, "", window.location.pathname + locationSearch(l, s, linkRef.current));
    const mq = window.matchMedia("(min-width: 1280px)");
    const onMq = () => setDesktop(mq.matches);
    onMq(); mq.addEventListener("change", onMq);
    try {
      const s = loadStudy(); setStudy(s); setInitialLastRead(s.lastRead);
    } catch (e) {
      setLocked(true);
      setStorageError(`Your saved study in this browser could not be read (${errMsg(e, "unknown error")}). It has been left untouched. Importing a JSON backup will replace it.`);
    }
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    const onPop = () => {
      const n = readLocation(); const ns = readStrongs(); const st = readStudyLink();
      setLoc(n); setSelected(n.verse); setStrongs(ns); strongsRef.current = ns; setNavigationId(id => id + 1);
      if (st?.tab === "commentary") { setCommentaryState(st.commentary); commentaryRef.current = st.commentary; }
      const e = st?.tab === "dictionary" ? st.entry ?? null : null;
      setDictEntry(e); dictEntryRef.current = e;
      if (st) applyTab(st.tab); else if (linkRef.current) applyTab("notes");
    };
    window.addEventListener("popstate", onPop);
    return () => { window.removeEventListener("popstate", onPop); mq.removeEventListener("change", onMq); window.history.scrollRestoration = restoration; };
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
          window.history.replaceState(null, "", url({ ...loc, verse: undefined }));
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

  // KJV Strong's tags for tap-a-word: loaded only when the toggle is on.
  const tagKey = loc && showStrongs && String(loc.translation) === "kjv" ? `${loc.book}|${loc.chapter}` : "";
  useEffect(() => {
    if (!tagKey || !loc) return;
    let live = true;
    setKjvTags(t => (t.key === tagKey ? t : { key: tagKey, tags: null, error: "" }));
    loadChapterWords(baseUrl, loc.book, loc.chapter)
      .then(d => live && setKjvTags({ key: tagKey, tags: d.k, error: "" }))
      .catch(e => live && setKjvTags({ key: tagKey, tags: null, error: errMsg(e, "Strong’s numbers could not be loaded.") }));
    return () => { live = false; };
  }, [tagKey, baseUrl]);

  // Dictionary index for marking names in the text: loaded only when the toggle is on.
  useEffect(() => {
    if (!showDict) return;
    let live = true;
    setDictIndex(d => (d.data ? d : { data: null, error: "" }));
    loadDictIndex(baseUrl)
      .then(data => live && setDictIndex({ data, error: "" }))
      .catch(e => live && setDictIndex({ data: null, error: errMsg(e, "The dictionary could not be loaded.") }));
    return () => { live = false; };
  }, [showDict, baseUrl, dictRetry]);

  const go = (next: Location) => {
    setInitialLastRead(undefined);
    if (loc && (next.book !== loc.book || next.chapter !== loc.chapter)) setEntry(null);
    setLoc(next); setSelected(next.verse);
    setNavigationId(id => id + 1);
    window.history.pushState(null, "", url(next));
  };

  const setVerse = (nv: number | undefined, s = strongsRef.current) => {
    if (!loc) return;
    setSelected(nv);
    const n = { ...loc, verse: nv };
    setLoc(n);
    window.history.replaceState(null, "", url(n, s));
  };
  const selectVerse = (v: number) => setVerse(selected === v ? undefined : v);

  const chooseTab = (t: StudyTab) => {
    applyTab(t);
    if (loc) window.history.replaceState(null, "", url(loc));
  };
  const chooseCommentary = (c: CommentaryId) => {
    setCommentaryState(c); commentaryRef.current = c;
    try { window.localStorage.setItem("jo-bible-commentary", c); } catch { /* optional preference */ }
    chooseTab("commentary");
  };
  const closeStudySheet = () => { setEntry(null); applyTab("notes"); setVerse(undefined); };
  const openEntry = (slug: string | null) => {
    setEntry(slug);
    applyTab("dictionary");
    if (loc) window.history.replaceState(null, "", url(loc));
  };

  const openStrongs = (num: string | null) => {
    setStrongs(num); strongsRef.current = num;
    if (num) applyTab("words");
    if (loc) window.history.replaceState(null, "", url(loc, num));
  };
  const onWord = (verse: number, num: string) => {
    setStrongs(num); strongsRef.current = num; applyTab("words");
    setVerse(verse, num);
  };
  const closeWordStudy = () => {
    setStrongs(null); strongsRef.current = null;
    setVerse(undefined, null);
  };
  // Strong's words and dictionary names are both tappable, so only one can be shown at a time.
  const setPref = (key: string, on: boolean) => {
    try { window.localStorage.setItem(key, on ? "1" : "0"); } catch { /* optional preference */ }
  };
  const toggleStrongs = () => {
    const on = !showStrongs;
    setShowStrongs(on); setPref("jo-bible-show-strongs", on);
    if (on && showDict) { setShowDict(false); setPref("jo-bible-show-dictionary", false); }
  };
  const toggleDict = () => {
    const on = !showDict;
    setShowDict(on); setPref("jo-bible-show-dictionary", on);
    if (on && showStrongs) { setShowStrongs(false); setPref("jo-bible-show-strongs", false); }
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
  const isKjv = String(loc.translation) === "kjv";
  const wordStudy = (compact: boolean) => (
    <WordStudyPanel baseUrl={baseUrl} loc={loc} verse={selected} strongs={strongs} compact={compact}
      onOpen={openStrongs} onBack={() => openStrongs(null)} onClose={closeWordStudy} onGo={go} />
  );
  const notes = panelProps ? <VerseStudyPanel {...panelProps} /> : (
    <div className="py-4">
      <p className="br-eyebrow">Verse study</p>
      <p className="mt-2 text-[17px] leading-7 text-[var(--color-text-muted)]">Select a verse in the passage to read it here, highlight it in one of five colors, bookmark it, write a note, or share a link.</p>
    </div>
  );
  const library = (
    <>
      <StudyLibrary study={study} loc={loc} initialLastRead={initialLastRead ?? study.lastRead} onGo={go} onRemoveChapter={removeChapter} />
      <BackupPanel study={study} onPersist={next => { commit(next, true); }} />
    </>
  );
  const studyTab = tab === "commentary" || tab === "xrefs" || tab === "places" || tab === "sermons" || tab === "dictionary";
  const commentaryPanel = (sheet: boolean) => (
    <CommentaryPanel baseUrl={baseUrl} loc={loc} verse={selected} commentary={commentary} onCommentary={chooseCommentary}
      onVerse={v => setVerse(v)} onClose={sheet ? closeStudySheet : undefined} hrefFor={hrefFor} onGo={go} />
  );
  const xrefPanel = (sheet: boolean) => (
    <CrossRefPanel baseUrl={baseUrl} loc={loc} verse={selected} hrefFor={hrefFor} onGo={go} onClose={sheet ? closeStudySheet : undefined} />
  );
  const placesPanel = (sheet: boolean) => (
    <PlacesPanel baseUrl={baseUrl} loc={loc} verse={selected} onVerse={v => setVerse(v)} onClose={sheet ? closeStudySheet : undefined} />
  );
  const sermonsPanel = (sheet: boolean) => (
    <SermonsPanel baseUrl={baseUrl} loc={loc} verse={selected} onVerse={v => setVerse(v)} onClose={sheet ? closeStudySheet : undefined} />
  );
  const dictionaryPanel = (sheet: boolean) => (
    <DictionaryPanel baseUrl={baseUrl} loc={loc} verse={selected} onVerse={v => setVerse(v)} onClose={sheet ? closeStudySheet : undefined}
      entry={dictEntry} onEntry={openEntry} hrefFor={hrefFor} onGo={go} />
  );
  const sheetOpen = !desktop && (!!panelProps || !!strongs || studyTab);
  const sheetTab: StudyTab = studyTab ? tab : !panelProps ? "words" : tab === "library" ? "notes" : tab;
  const sheetLabel = sheetTab === "commentary" ? "Commentary" : sheetTab === "xrefs" ? "Cross references" : sheetTab === "places" ? "Places" : sheetTab === "sermons" ? "Sermons" : sheetTab === "dictionary" ? "Dictionary" : panelProps ? "Selected verse" : "Word study";

  return (
    <div className="br-root" id="br-top">
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-3 py-4 md:px-6 md:py-6 xl:grid-cols-[minmax(0,1fr)_minmax(400px,480px)] xl:gap-6">
        {storageError && (
          <div role="alert" className="xl:col-span-2 flex items-start gap-2 rounded border border-[var(--warm-300)] bg-[var(--warm-50)] p-3 text-sm font-semibold">
            <AlertTriangle size={17} className="mt-0.5 shrink-0 text-[var(--color-action-warm)]" /> {storageError}
          </div>
        )}
        <div className="flex min-w-0 flex-col gap-4 xl:col-start-1 xl:row-start-2">
          <a href={`${baseUrl.replace(/\/$/, "")}/bible/resources`} className="-mb-3 inline-flex min-h-7 items-center justify-center gap-1 self-center text-sm font-semibold text-[var(--color-hero)] hover:underline">
            See Bible Resources <ChevronRight size={16} aria-hidden="true" />
          </a>
          <ReaderNav loc={loc} onGo={go} />
          {verseNotice && <p role="status" className="rounded border border-[var(--color-border-control)] bg-[var(--color-surface-soft)] p-3 text-sm font-semibold">{verseNotice}</p>}
          <PassageView loc={loc} navigationId={navigationId} passage={current} loading={loading || (!current && !error)} error={error} onRetry={() => setRetry(r => r + 1)}
            records={chapterRecords} selected={selected} onSelect={selectVerse} chapterSaved={chapterSaved} onToggleChapter={toggleChapter} onGo={go}
            strongs={isKjv ? { on: showStrongs, tags: kjvTags.key === tagKey ? kjvTags.tags : null, error: kjvTags.key === tagKey ? kjvTags.error : "", onToggle: toggleStrongs, onWord, active: strongs } : undefined}
            dictionary={{ on: showDict, index: dictIndex.data, error: dictIndex.error, onToggle: toggleDict, onRetry: () => setDictRetry(r => r + 1), onEntry: openEntry, active: tab === "dictionary" ? dictEntry : null }} />
          <RecapPanel />
          <Attribution translation={loc.translation} apiText={current?.attribution} />
        </div>
        {desktop ? (
          <aside aria-label="Study" className="xl:col-start-2 xl:row-start-2">
            <div className="br-card br-pane sticky top-[100px] flex flex-col">
              <StudyPane idPrefix="d" tab={tab} onTab={chooseTab} tabs={[
                { id: "words", label: "Word study", content: wordStudy(false) },
                { id: "notes", label: "My notes", content: notes },
                { id: "commentary", label: "Commentary", content: commentaryPanel(false) },
                { id: "xrefs", label: "Cross-refs", content: xrefPanel(false) },
                { id: "places", label: "Places", content: placesPanel(false) },
                { id: "sermons", label: "Sermons", content: sermonsPanel(false) },
                { id: "dictionary", label: "Dictionary", content: dictionaryPanel(false) },
                { id: "library", label: "My library", content: <div className="flex flex-col gap-4">{library}</div> },
              ]} />
            </div>
          </aside>
        ) : (
          <aside aria-label="My study" className={`flex flex-col gap-4 ${sheetOpen ? "pb-72" : ""}`}>
            <div className="br-card p-4">
              <p className="br-eyebrow">Study {loc.book} {loc.chapter}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => chooseTab("commentary")} className="br-btn-outline"><BookOpenText size={16} aria-hidden="true" /> Commentary</button>
                <button type="button" onClick={() => chooseTab("xrefs")} className="br-btn-outline"><Link2 size={16} aria-hidden="true" /> Cross references</button>
                <button type="button" onClick={() => chooseTab("places")} className="br-btn-outline"><MapPin size={16} aria-hidden="true" /> Places</button>
                <button type="button" onClick={() => chooseTab("sermons")} className="br-btn-outline"><ScrollText size={16} aria-hidden="true" /> Sermons</button>
                <button type="button" onClick={() => chooseTab("dictionary")} className="br-btn-outline"><BookA size={16} aria-hidden="true" /> Dictionary</button>
              </div>
            </div>
            {library}
          </aside>
        )}
      </div>
      {sheetOpen && (
        <div role="dialog" aria-label={sheetLabel} className="br-sheet fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] overflow-y-auto border-t-4 border-[var(--color-accent)] bg-[var(--color-surface)] p-4">
          <StudyPane idPrefix="m" compact tab={sheetTab} onTab={chooseTab} tabs={[
            { id: "words", label: "Word study", content: wordStudy(true) },
            ...(panelProps ? [{ id: "notes" as StudyTab, label: "My notes", content: <VerseStudyPanel {...panelProps} compact /> }] : []),
            { id: "commentary", label: "Commentary", content: commentaryPanel(true) },
            { id: "xrefs", label: "Cross-refs", content: xrefPanel(true) },
            { id: "places", label: "Places", content: placesPanel(true) },
            { id: "sermons", label: "Sermons", content: sermonsPanel(true) },
            { id: "dictionary", label: "Dictionary", content: dictionaryPanel(true) },
          ]} />
        </div>
      )}
    </div>
  );
}
