import { TopicCrossReferences } from "./TopicCrossReferences";
import { DevotionalTopicGroups } from "./DevotionalTopicGroups";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BookOpen, Bookmark, BookmarkCheck, Check, ChevronDown, ChevronRight, Clipboard, Copy, Menu, Search, SlidersHorizontal, X } from "lucide-react";
import { fetchNetPassages, netCache, netNotes } from "./bible-api";
import { formatSourcePassage } from "./passage-format";
import { scriptureReaderPath } from "./scripture-link";
import { isDevotionalTopic } from "./devotional-topics";
import { pushTopicHash, subscribeToTopicHistory, topicIdFromHash } from "./topic-history.mjs";

type Passage = { reference: string; text: string };

type RelatedTopic = { sourceLabel: string; targetIds: string[] };
type TopicIndex = { id: string; title: string; letter: string; sourcePages: number[]; recordType: string; passageCount: number; payload: string };
type Topic = TopicIndex & { passages: Passage[]; definition: string; additionalScripture: AdditionalScriptureSection[]; seeAlso: RelatedTopic[]; sourceMarkers: string[] };
type Index = { counts: { topicCount: number; passageCount: number }; letterDistribution: Record<string, number>; topics: TopicIndex[] };
const alphabet = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const ntBooks = ["Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"];
const books = ["All books", "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", ...ntBooks];
const base = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, "")}${path}`;
const testamentFor = (ref: string) => ntBooks.some(book => ref.startsWith(book)) ? "New Testament" : "Old Testament";
const normalized = (value: string) => value.trim().toLocaleLowerCase();

export function ConcordancePrototype() {
  const [index, setIndex] = useState<Index | null>(null);
  const [indexError, setIndexError] = useState("");
  const [payloads, setPayloads] = useState<Record<string, Topic[]>>({});
  const [payloadError, setPayloadError] = useState<Record<string, string>>({});
  const loading = useRef(new Map<string, Promise<Topic[]>>());
  const [selectedId, setSelectedId] = useState("abiding");
  const [view, setView] = useState<"start" | "topic">("start");
  const [query, setQuery] = useState(""); const [testament, setTestament] = useState("All Testaments"); const [book, setBook] = useState("All books");
  const [mobileMenu, setMobileMenu] = useState(false); const [filterOpen, setFilterOpen] = useState(false);
  const topicsToggle = useRef<HTMLButtonElement>(null);
  const [study, setStudy] = useState<string[]>([]); const [studyLoaded, setStudyLoaded] = useState(false); const [copied, setCopied] = useState("");
  const [translation, setTranslation] = useState<"NET" | "KJV">("NET"); const [translationLoaded, setTranslationLoaded] = useState(false);
  const scriptureHref = (reference: string) => base(scriptureReaderPath(reference, translation));
  const [netLoading, setNetLoading] = useState(false); const [netError, setNetError] = useState(false); const [, setNetTick] = useState(0);
  const [netRetry, setNetRetry] = useState(0);
  const [expandedLetter, setExpandedLetter] = useState("A");
  const topicResults = useRef<HTMLDivElement>(null);
  const browseLetter = (letter: string) => {
    setQuery("");
    if (!query.trim() && expandedLetter === letter) {
      setExpandedLetter("");
      return;
    }
    setExpandedLetter(letter);
    loadLetter(letter).catch(() => undefined);
    requestAnimationFrame(() => {
      const alphabetGrid = topicResults.current?.closest("nav")?.querySelector<HTMLElement>(".grid");
      const scrollArea = alphabetGrid?.closest<HTMLElement>(".kg-scroll");
      if (!alphabetGrid || !scrollArea) return;
      const areaTop = scrollArea.getBoundingClientRect().top;
      const headerHeight = document.querySelector(".equip-header")?.getBoundingClientRect().height ?? 0;
      // Align the alphabet within its own scrolling panel, then bring that
      // panel beneath the sticky header without hiding the first letter row.
      scrollArea.scrollTo({
        top: scrollArea.scrollTop + alphabetGrid.getBoundingClientRect().top - areaTop,
        behavior: "smooth",
      });
      window.scrollTo({
        top: window.scrollY + areaTop - headerHeight - 8,
        behavior: "smooth",
      });
    });
  };
  const [topicScope, setTopicScope] = useState<"all" | "devotional">("all");
  useEffect(() => {
    document.documentElement.dataset.knowingGodView = view;
    return () => { delete document.documentElement.dataset.knowingGodView; };
  }, [view]);

  const loadLetter = (letter: string) => {
    if (payloads[letter]) return Promise.resolve(payloads[letter]);
    const active = loading.current.get(letter); if (active) return active;
    const request = fetch(base(`/knowing-god/data/topics-${letter.toLowerCase()}.json`)).then(async res => {
      if (!res.ok) throw new Error(`Unable to load ${letter} topics (${res.status}).`);
      return (await res.json() as { topics: Topic[] }).topics.map(topic => ({
        ...topic,
        passages: topic.passages.map(passage => ({
          ...passage,
          text: formatSourcePassage(passage.reference, passage.text),
        })),
      }));
    }).then(topics => { setPayloads(previous => ({ ...previous, [letter]: topics })); setPayloadError(previous => ({ ...previous, [letter]: "" })); return topics; })
      .catch(error => { const message = error instanceof Error ? error.message : `Unable to load ${letter} topics.`; setPayloadError(previous => ({ ...previous, [letter]: message })); throw error; })
      .finally(() => loading.current.delete(letter));
    loading.current.set(letter, request); return request;
  };
  const applyTopic = (item: TopicIndex) => {
    if (topicScope === "devotional" && !isDevotionalTopic(item)) setTopicScope("all");
    setSelectedId(item.id); setExpandedLetter(item.letter); setView("topic"); setMobileMenu(false);
    loadLetter(item.letter).catch(() => undefined);
  };
  const openTopic = (item: TopicIndex) => {
    if (selectedId === item.id && view === "topic") {
      setMobileMenu(false);
      return;
    }
    applyTopic(item);
    pushTopicHash(window, item.id);
  };
  const openStart = () => {
    setView("start");
    setMobileMenu(false);
    if (window.location.hash) {
      window.history.pushState(null, "", window.location.pathname + window.location.search);
    }
  };

  useEffect(() => {
    fetch(base("/knowing-god/data/index.json")).then(async res => {
      if (!res.ok) throw new Error(`Unable to load topical index (${res.status}).`);
      return res.json() as Promise<Index>;
    }).then(data => {
      setIndex(data);
      const hashId = topicIdFromHash(window.location.hash);
      const initial = data.topics.find(topic => topic.id === hashId) || data.topics.find(topic => topic.id === "abiding") || data.topics[0];
      if (initial) {
        setSelectedId(initial.id);
        setExpandedLetter(initial.letter);
        if (initial.id === hashId) {
          setView("topic");
          loadLetter(initial.letter).catch(() => undefined);
        }
      }
    }).catch(error => setIndexError(error instanceof Error ? error.message : "Unable to load the topical index."));
    try { setStudy(JSON.parse(localStorage.getItem("knowing-god-study") || "[]")); } catch { setStudy([]); } finally { setStudyLoaded(true); }
    const stored = localStorage.getItem("knowing-god-translation"); if (stored === "NET" || stored === "KJV") setTranslation(stored); setTranslationLoaded(true);
  }, []);
  useEffect(() => {
    if (!index) return;
    const restoreTopicFromHash = () => {
      const hashId = topicIdFromHash(window.location.hash);
      const target = hashId ? index.topics.find(topic => topic.id === hashId) : undefined;
      if (target) applyTopic(target);
      else { setView("start"); setMobileMenu(false); }
    };
    return subscribeToTopicHistory(window, restoreTopicFromHash);
  }, [index, payloads, topicScope]);
  useEffect(() => { if (studyLoaded) localStorage.setItem("knowing-god-study", JSON.stringify(study)); }, [study, studyLoaded]);

  // Cross-reference entries remain browsable but are not counted as topics.
  const topicCount = index?.topics.filter(topic => topic.recordType === "topic").length ?? 649;
  const selectedIndex = index?.topics.find(topic => topic.id === selectedId);
  const selected = selectedIndex ? payloads[selectedIndex.letter]?.find(topic => topic.id === selectedId) : undefined;
  const scopedTopics = useMemo(
    () => index?.topics.filter(item => topicScope === "all" || isDevotionalTopic(item)) || [],
    [index, topicScope],
  );
  const changeTopicScope = (scope: "all" | "devotional") => {
    setTopicScope(scope);
    if (scope === "devotional" && index) {
      const next = selectedIndex && isDevotionalTopic(selectedIndex)
        ? selectedIndex
        : index.topics.find(isDevotionalTopic);
      if (next) {
        setExpandedLetter(next.letter);
        if (next.id !== selectedId) {
          setSelectedId(next.id);
          loadLetter(next.letter).catch(() => undefined);
          if (view === "topic") pushTopicHash(window, next.id);
        }
      }
    }
  };
  const filtered = useMemo(() => {
    if (!index) return [];
    const q = normalized(query);
    if (!q) return scopedTopics;
    const ranked = scopedTopics.map(item => {
      const title = normalized(item.title);
      if (title === q) return { item, rank: 0 };
      if (title.startsWith(q)) return { item, rank: 1 };
      if (title.includes(q)) return { item, rank: 2 };
      const loaded = payloads[item.letter]?.find(topic => topic.id === item.id);
      const contentMatch = loaded && (normalized(loaded.definition).includes(q) ||
        loaded.passages.some(p => normalized(`${p.reference} ${p.text}`).includes(q)));
      return { item, rank: contentMatch ? 3 : 4 };
    });
    return ranked.filter(result => result.rank < 4)
      .sort((a, b) => a.rank - b.rank || a.item.title.localeCompare(b.item.title))
      .map(result => result.item);
  }, [index, scopedTopics, payloads, query]);
  // Topic search only affects the index; the open study changes on selection.
  const visiblePassages = selected?.passages.filter(p => (testament === "All Testaments" || testamentFor(p.reference) === testament) && (book === "All books" || p.reference.startsWith(book))) || [];
  useEffect(() => {
    if (view !== "topic" || !translationLoaded || translation !== "NET" || !selected) return;
    const controller = new AbortController();
    let current = true; const missing = visiblePassages.map(p => p.reference).filter(ref => !netCache.has(ref));
    if (!missing.length) { setNetLoading(false); setNetError(false); return; }
    setNetLoading(true); setNetError(false); fetchNetPassages(missing, 3, controller.signal).then(ok => { if (current) { setNetLoading(false); setNetError(!ok); setNetTick(x => x + 1); } });
    return () => { current = false; controller.abort(); };
  }, [view, selectedId, selected, translation, translationLoaded, testament, book, visiblePassages.length, netRetry]);
  const copy = async (what: "topic" | "passages") => {
    if (!selected) return;
    const text = what === "topic" ? `${selected.title}\n${selected.passages.map(p => p.reference).join("; ")}` : visiblePassages.map(p => {
      const useNet = translation === "NET" && netCache.has(p.reference);
      const note = useNet ? netNotes.get(p.reference) : undefined;
      return `${p.reference} (${useNet ? "NET" : "KJV"})\n${useNet ? netCache.get(p.reference) : p.text}${note ? `\nTranslation note: ${note}` : ""}`;
    }).join("\n\n");
    await navigator.clipboard?.writeText(text); setCopied(what); window.setTimeout(() => setCopied(""), 1600);
  };
  const toggleStudy = (id: string) => setStudy(list => list.includes(id) ? list.filter(value => value !== id) : [...list, id]);
  const topicById = (id: string) => index?.topics.find(t => t.id === id);
  const followCrossReference = (id: string) => {
    // A source "See…" link should not inherit filters from the previous topic.
    setQuery("");
    setTestament("All Testaments");
    setBook("All books");
    if (id === "*") { setTopicScope("all"); openStart(); return; }
    const target = topicById(id);
    if (target) openTopic(target);
  };
  const isFiltering = Boolean(query.trim());

  return <div className="flex flex-col min-h-[100dvh] text-[var(--color-text,#003A66)]" style={{ background: "var(--color-surface, #FFFDFB)", fontFamily: "var(--font-sans, 'Source Sans 3', system-ui, sans-serif)" }}>
    <style>{`.kg-sans{font-family:var(--font-sans, 'Source Sans 3', system-ui, sans-serif)}.kg-focus:focus-visible{outline:3px solid var(--color-focus,#0095FF);outline-offset:2px}.kg-scroll::-webkit-scrollbar{width:6px}.kg-scroll::-webkit-scrollbar-thumb{background:var(--color-border-control,#5B9BC4);border-radius:8px}@media print{.kg-no-print{display:none!important}.kg-reading{max-width:none!important}.kg-shell{display:block!important}}`}</style>
    <div className="kg-warm-theme flex-1 flex flex-col bg-[var(--color-surface,#FFFDFB)]">
      {view === "start" && <header className="kg-no-print px-5 pt-4 pb-3 text-center md:pt-6"><h1 className="kg-cover-title text-[var(--color-hero,#006BB3)]" style={{fontFamily:"var(--font-display, 'Playfair Display', serif)",fontVariant:"small-caps",fontSize:"clamp(1.6rem,4.5vw,2.4rem)",lineHeight:1.15,letterSpacing:".02em"}}>Knowing God Topical Bible</h1><p className="kg-sans mx-auto mt-1 max-w-[34rem] text-base leading-snug text-[var(--color-text,#003A66)] md:text-lg">{topicCount} topics and {index ? index.counts.passageCount.toLocaleString() : "thousands of"} curated passages on the Nature and Character of the Almighty</p><p className="kg-sans mt-0.5 text-sm text-[var(--color-text,#003A66)]"><a href="https://www.zmission.org/our-story.html" target="_blank" rel="noopener noreferrer" className="kg-focus underline underline-offset-4 decoration-[var(--color-action-warm,#C45100)] hover:text-[var(--color-action-warm,#C45100)]">© 2026 by Zinzendorf Mission</a></p><a href={base("/knowing-god/introduction")} className="kg-focus kg-sans mt-2 inline-flex min-h-11 items-center gap-1 text-base font-semibold text-[var(--color-hero,#006BB3)] underline-offset-4 hover:underline">See Introductory Articles <ChevronRight size={16} aria-hidden="true"/></a></header>}
      {view === "topic" && <div className="kg-no-print border-b border-[var(--color-border-soft,#CCEBFF)] bg-[var(--color-surface-soft,#E6F5FF)] px-5 py-1 md:hidden"><button ref={topicsToggle} type="button" onClick={() => setMobileMenu(v => !v)} aria-expanded={mobileMenu} className="kg-focus kg-sans flex scroll-mt-24 items-center gap-2 min-h-11 text-base font-bold text-[var(--color-hero,#006BB3)]"><Menu size={18}/> Topics &amp; filters</button></div>}
      <main className={`kg-shell flex-1 mx-auto w-full grid grid-cols-1 ${view === "start" ? "max-w-[1100px] md:grid-cols-[minmax(0,1fr)_280px] md:gap-6 md:px-5" : "max-w-[1500px] md:grid-cols-[270px_1fr] lg:grid-cols-[290px_1fr_265px]"}`}>
      <aside className={`${view === "start" || mobileMenu ? "block" : "hidden"} kg-no-print bg-[var(--color-surface-soft,#E6F5FF)] md:block ${view === "start" ? "md:rounded md:border md:border-[var(--color-border-soft,#CCEBFF)]" : "border-r border-[var(--color-border-soft,#CCEBFF)]"}`}><div className={view === "start" ? "px-5 py-4 md:p-6" : "sticky top-[95px] max-h-[calc(100dvh-95px)] overflow-y-auto kg-scroll p-5"}>
        {view === "start" ? null : <>
        <a href={base("/knowing-god")} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); openStart(); }} className="kg-focus kg-sans mb-4 flex min-h-11 items-center text-base text-[var(--color-hero,#006BB3)] underline underline-offset-2 hover:text-[var(--color-structure,#003A66)]">Return to Knowing God Intro</a></>}
        <p className="kg-sans mb-1 text-xs font-bold uppercase tracking-[.2em] text-[var(--color-action-warm,#C45100)]">Translation</p><div className="mb-4 flex rounded border border-[var(--color-border-control,#5B9BC4)] bg-[var(--color-surface,#FFFDFB)] p-1">{(["NET", "KJV"] as const).map(value => <button key={value} onClick={() => { setTranslation(value); localStorage.setItem("knowing-god-translation", value); }} aria-pressed={translation === value} className={`kg-focus kg-sans flex-1 min-h-11 whitespace-nowrap rounded px-2 py-1.5 text-sm font-bold ${translation === value ? "bg-[var(--color-selected-warm,#FFEADB)] text-[var(--color-text,#003A66)] shadow-[inset_0_0_0_1px_var(--color-action-warm,#C45100)]" : "text-[var(--color-text-muted,#2E5A7A)]"}`}>{value} Bible</button>)}</div>
        <fieldset className="mb-4"><legend className="kg-sans mb-1 text-xs font-bold uppercase tracking-[.2em] text-[var(--color-action-warm,#C45100)]">Topic selection</legend><div className="flex flex-col gap-1 rounded border border-[var(--color-border-control,#5B9BC4)] bg-[var(--color-surface,#FFFDFB)] p-1">{([{ value: "all", label: "All topics" }, { value: "devotional", label: "Devotional Topics" }] as const).map(option => <button type="button" key={option.value} disabled={!index} aria-pressed={topicScope === option.value} onClick={() => changeTopicScope(option.value)} className={`kg-focus kg-sans min-h-11 rounded px-2 py-2 text-left text-sm font-bold disabled:opacity-50 flex items-center justify-between ${topicScope === option.value ? "bg-[var(--color-selected-warm,#FFEADB)] text-[var(--color-text,#003A66)] shadow-[inset_0_0_0_1px_var(--color-action-warm,#C45100)]" : "text-[var(--color-text-muted,#2E5A7A)]"}`}><span>{option.label}</span> {topicScope === option.value && <Check size={14}/>}</button>)}</div></fieldset>
        <div className="mb-3 flex items-end justify-between border-t border-[var(--color-border-soft,#CCEBFF)] pt-4"><div><p className="kg-sans text-xs font-bold uppercase tracking-[.2em] text-[var(--color-action-warm,#C45100)]">The index</p><h2 className="mt-1 text-2xl text-[var(--color-hero,#006BB3)]">Topics</h2></div><span className="kg-sans whitespace-nowrap text-xs text-[var(--color-text-muted,#2E5A7A)]">{filtered.filter(topic => topic.recordType === "topic").length} shown</span></div>
        <label className="kg-sans sr-only" htmlFor="topic-search">Search topics and loaded passages</label><div className="relative mb-4"><Search className="absolute left-3 top-3 text-[var(--color-text-muted,#2E5A7A)]" size={16}/><input id="topic-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles; loaded text" className="kg-focus w-full border border-[var(--color-border-control,#5B9BC4)] bg-[var(--color-surface,#FFFDFB)] py-2.5 pl-9 pr-3 text-base text-[var(--color-text,#003A66)]"/></div>
        <button onClick={() => setFilterOpen(v => !v)} className="kg-focus kg-sans mb-3 flex min-h-11 w-full items-center justify-between border-y border-[var(--color-border-soft,#CCEBFF)] py-2 text-left text-xs font-semibold uppercase tracking-widest text-[var(--color-text,#003A66)]"><span className="flex gap-2"><SlidersHorizontal size={14}/>Passage filters</span><ChevronDown size={14}/></button>
        {filterOpen && <div className="kg-sans mb-4 space-y-3 border-b border-[var(--color-border-soft,#CCEBFF)] pb-4"><p className="text-xs text-[var(--color-text-muted,#2E5A7A)]">Filters apply to the open topic without loading other letters.</p><label className="block text-sm font-semibold">Testament<select value={testament} onChange={e => setTestament(e.target.value)} className="mt-1 w-full border border-[var(--color-border-control,#5B9BC4)] bg-[var(--color-surface,#FFFDFB)] p-2 text-base"><option>All Testaments</option><option>Old Testament</option><option>New Testament</option></select></label><label className="block text-sm font-semibold">Bible book<select value={book} onChange={e => setBook(e.target.value)} className="mt-1 w-full border border-[var(--color-border-control,#5B9BC4)] bg-[var(--color-surface,#FFFDFB)] p-2 text-base">{books.map(value => <option key={value}>{value}</option>)}</select></label></div>}
        {indexError && <div role="alert" className="kg-sans py-6 text-base text-[var(--color-action-warm,#C45100)]">{indexError}</div>}{!index && !indexError && <div role="status" className="kg-sans py-6 text-base text-[var(--color-text-muted,#2E5A7A)]">Loading complete topical index…</div>}
        {index && topicScope === "devotional" && <nav aria-label="Devotional topics by group"><DevotionalTopicGroups topics={scopedTopics} filtered={isFiltering ? filtered : null} query={query} selectedId={selectedId} onOpen={openTopic}/></nav>}
        {index && topicScope === "all" && <nav aria-label="Topical Bible topics"><div className="mb-3 grid grid-cols-9 gap-1 md:gap-1.5">{alphabet.map(letter => <button key={letter} disabled={!scopedTopics.some(topic => topic.letter === letter)} onClick={() => browseLetter(letter)} aria-label={`Browse ${letter} topics`} aria-expanded={!isFiltering && expandedLetter === letter} aria-controls="topic-letter-results" className={`kg-focus kg-sans h-9 min-w-0 rounded text-sm font-bold ${!scopedTopics.some(topic => topic.letter === letter) ? "cursor-not-allowed text-[var(--color-border-control,#5B9BC4)] border border-transparent" : !isFiltering && expandedLetter === letter ? "bg-[var(--color-selected-warm,#FFEADB)] text-[var(--color-text,#003A66)] shadow-[inset_0_0_0_1px_var(--color-action-warm,#C45100)]" : "border border-[var(--color-border-control,#5B9BC4)] bg-[var(--color-surface,#FFFDFB)] text-[var(--color-text,#003A66)]"}`}>{letter}</button>)}</div>
          {filtered.length === 0 && <p className="kg-sans py-6 text-center text-sm text-[var(--color-text-muted,#2E5A7A)]">No topics match that search.</p>}
          <div id="topic-letter-results" ref={topicResults} data-topic-results className={view === "start" ? "md:columns-2 md:gap-4 [&>button]:break-inside-avoid" : undefined}>
            {(isFiltering ? filtered : filtered.filter(item => item.letter === expandedLetter)).map(item => <button key={item.id} aria-pressed={selectedId === item.id} onClick={() => openTopic(item)} className={`kg-focus flex min-h-11 w-full items-center justify-between border-l-4 px-3 py-2 text-left text-base ${selectedId === item.id ? "border-[var(--color-action-warm,#C45100)] bg-[var(--color-selected-warm,#FFEADB)] text-[var(--color-text,#003A66)]" : "border-transparent text-[var(--color-text,#003A66)] hover:bg-[var(--color-surface-soft,#E6F5FF)]"}`}><span>{item.title}</span><span className="kg-sans text-xs text-[var(--color-text-muted,#2E5A7A)]">{item.passageCount}</span></button>)}
          </div>
        </nav>}</div></aside>
      {view === "start" ? null :
      <section className="kg-reading min-w-0 max-w-[920px] px-5 py-8 md:px-10 md:py-12 lg:px-14">{!selectedIndex ? <div role="status" className="kg-sans py-16 text-center text-base text-[var(--color-text-muted,#2E5A7A)]">Loading selected topic…</div> : !selected ? <div className="kg-sans py-16 text-center text-base text-[var(--color-text-muted,#2E5A7A)]">{payloadError[selectedIndex.letter] ? <div role="alert" className="text-[var(--color-action-warm,#C45100)]">{payloadError[selectedIndex.letter]} <button className="underline" onClick={() => loadLetter(selectedIndex.letter).catch(() => undefined)}>Try again</button></div> : <div role="status">Loading {selectedIndex.letter} topics…</div>}</div> : <><div className="kg-no-print mb-6 flex items-center gap-2 kg-sans text-sm text-[var(--color-text-muted,#2E5A7A)]"><BookOpen size={16}/>Topic study <ChevronRight size={14}/>{selected.title}</div><div className="mb-8 flex flex-col gap-4 border-b border-[var(--color-border-soft,#CCEBFF)] pb-7 sm:flex-row sm:justify-between"><div><p className="kg-sans text-xs font-bold uppercase tracking-[.22em] text-[var(--color-action-warm,#C45100)]">{selected.recordType === "cross-reference" ? "Cross-reference" : "A topical study"}</p><h2 className="mt-2 text-4xl text-[var(--color-hero,#006BB3)] md:text-6xl" style={{fontFamily: "var(--font-display, 'Playfair Display', serif)"}}>{selected.title}</h2>{selected.definition && <p className="mt-3 text-lg italic text-[var(--color-text-muted,#2E5A7A)]">{selected.definition}</p>}</div><div className="kg-no-print flex shrink-0 flex-wrap items-center self-start gap-x-5 gap-y-1"><button type="button" onClick={() => toggleStudy(selected.id)} aria-pressed={study.includes(selected.id)} className={`kg-focus kg-sans inline-flex min-h-11 items-center gap-2 border-0 bg-transparent py-2 text-sm font-bold hover:underline underline-offset-4 ${study.includes(selected.id) ? "text-[var(--color-action-warm,#C45100)]" : "text-[var(--color-text,#003A66)]"}`}>{study.includes(selected.id) ? <BookmarkCheck size={16}/> : <Bookmark size={16}/>} {study.includes(selected.id) ? "Saved" : "Save study"}</button><button type="button" onClick={() => copy("topic")} className="kg-focus kg-sans inline-flex min-h-11 items-center gap-2 border-0 bg-transparent py-2 text-sm font-bold text-[var(--color-text,#003A66)] hover:underline underline-offset-4"><Copy size={16}/> {copied === "topic" ? "Copied" : "Copy refs"}</button></div></div>
        {selected.passages.length > 0 && translation === "NET" && netError && <div role="alert" className="kg-no-print mb-4 flex flex-wrap items-center gap-2 text-base text-[var(--color-action-warm,#C45100)]"><AlertCircle size={18}/>Some NET passages could not be loaded from this site. Those passages are labeled KJV below. <button type="button" className="kg-focus underline font-bold" onClick={() => setNetRetry(value => value + 1)}>Try again</button></div>}
        {selected.passages.length > 0 ? <><div className="mb-5 flex items-center justify-between"><h3 className="text-2xl text-[var(--color-text,#003A66)]">Scripture passages <span className="kg-sans text-xs text-[var(--color-text-muted,#2E5A7A)]">{visiblePassages.length} results</span></h3><button onClick={() => copy("passages")} className="kg-focus kg-no-print kg-sans flex items-center gap-1.5 text-base font-bold text-[var(--color-hero,#006BB3)] hover:text-[var(--color-structure,#003A66)]"><Clipboard size={16}/> {copied === "passages" ? "Copied" : "Copy passages"}</button></div>{netLoading && translation === "NET" ? <div role="status" className="kg-sans py-10 text-center text-base text-[var(--color-text-muted,#2E5A7A)]">Loading NET Bible text…</div> : <div>{visiblePassages.map((p, i) => {
          const net = netCache.get(p.reference);
          return <article key={`${p.reference}-${i}`} className="border-b border-[var(--color-border-soft,#CCEBFF)] py-5">
            <p className="kg-sans text-base font-bold text-[var(--color-hero,#006BB3)]">
              <a href={scriptureHref(p.reference)} target="_blank" rel="noopener noreferrer" className="kg-focus underline underline-offset-4" title="Open this chapter in the Bible reader (new tab)">{p.reference}</a> <span className="text-xs text-[var(--color-text-muted,#2E5A7A)] font-normal ml-2">
                {translation === "KJV" ? "KJV" : netCache.has(p.reference) ? "NET" : "Fallback KJV"}
              </span>
            </p>
            <p className="mt-2 whitespace-pre-line text-lg leading-[1.75] text-[var(--color-text,#003A66)]">{translation === "NET" ? net ?? formatSourcePassage(p.reference, p.text) : formatSourcePassage(p.reference, p.text)}</p>
            {translation === "NET" && netCache.has(p.reference) && netNotes.has(p.reference) && <p className="kg-sans mt-3 border-l-2 border-[var(--color-border-soft,#CCEBFF)] pl-3 text-sm leading-relaxed text-[var(--color-text-muted,#2E5A7A)]"><strong>Translation note:</strong> {netNotes.get(p.reference)}</p>}
          </article>;
        })}</div>}{visiblePassages.length === 0 && <div className="border border-dashed border-[var(--color-border-control,#5B9BC4)] py-10 text-center text-base text-[var(--color-text-muted,#2E5A7A)]">No passages match the current filters.</div>}</> : <TopicCrossReferences onNavigate={followCrossReference} related={selected.seeAlso} topics={index?.topics || []} />}{selected.additionalScripture.length > 0 && <div className="mt-10 border-t border-[var(--color-border-soft,#CCEBFF)] pt-6"><p className="kg-sans text-xs font-bold uppercase text-[var(--color-text-muted,#2E5A7A)]">Additional Scripture</p>{selected.additionalScripture.map((section, sectionIndex) => <p className="mt-2 text-base text-[var(--color-text,#003A66)]" key={`${selected.id}-additional-${sectionIndex}`}>{section.links.map((reference, index, all) => { const unchanged = reference.queries.length === 1 && normalized(reference.sourceLabel.replace(/\.$/, "")) === normalized(reference.queries[0]); return <span key={`${reference.sourceLabel}-${index}`}>{unchanged ? <a className="kg-focus text-[var(--color-hero,#006BB3)] underline hover:text-[var(--color-structure,#003A66)]" href={scriptureHref(reference.queries[0])} target="_blank" rel="noopener noreferrer">{reference.sourceLabel}</a> : <span>{reference.sourceLabel} <span className="kg-sans text-xs text-[var(--color-text-muted,#2E5A7A)]">({reference.queries.map((query, queryIndex) => <span key={query}><a className="kg-focus text-[var(--color-hero,#006BB3)] underline hover:text-[var(--color-structure,#003A66)]" href={scriptureHref(query)} target="_blank" rel="noopener noreferrer">{query}</a>{queryIndex < reference.queries.length - 1 ? ", " : ""}</span>)})</span></span>}{index < all.length - 1 ? "; " : ""}</span>; })}</p>)}</div>}</>}</section>}
      <aside className={`kg-no-print bg-[var(--color-surface-soft,#E6F5FF)] p-5 md:p-6 ${view === "start" ? "md:self-start md:rounded md:border md:border-[var(--color-border-soft,#CCEBFF)] md:sticky md:top-[100px]" : "border-l border-[var(--color-border-soft,#CCEBFF)] md:col-span-2 lg:col-span-1 lg:min-h-[calc(100dvh-95px)]"}`}><div className="mb-8"><div className="mb-3 flex items-center gap-2 text-[var(--color-action-warm,#C45100)]"><Bookmark size={18}/><h3 className="kg-sans text-sm font-bold uppercase">My study list</h3></div>{study.length ? study.map(id => { const item = topicById(id); return item ? <div className="flex items-center border-b border-[var(--color-border-soft,#CCEBFF)]" key={id}><button className="kg-focus flex-1 py-3 text-left text-base font-semibold text-[var(--color-text,#003A66)] hover:text-[var(--color-hero,#006BB3)]" onClick={() => openTopic(item)}>{item.title}</button><button className="kg-focus text-[var(--color-text-muted,#2E5A7A)] hover:text-[var(--color-action-warm,#C45100)]" onClick={() => toggleStudy(id)} aria-label={`Remove ${item.title} from study list`}><X size={18}/></button></div> : null; }) : <p className="kg-sans text-base text-[var(--color-text-muted,#2E5A7A)]">Save topics here as you trace a theme through Scripture.</p>}</div>{view === "topic" && selected && (
        <div className="border-t border-[var(--color-border-soft,#CCEBFF)] pt-6">
          <p className="kg-sans text-xs font-bold uppercase text-[var(--color-text-muted,#2E5A7A)]">See also</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[...new Set(selected.seeAlso.flatMap(related => related.targetIds))].map(id => {
              const target = id === "*" ? undefined : topicById(id);
              if (id !== "*" && !target) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => id === "*" ? openStart() : target && openTopic(target)}
                  className="kg-focus min-h-11 max-w-full rounded border border-[var(--color-border-control,#5B9BC4)] bg-[var(--color-surface,#FFFDFB)] px-3 py-2 kg-sans text-sm font-semibold text-left text-[var(--color-text,#003A66)] hover:bg-[var(--color-surface-soft,#E6F5FF)]"
                >
                  {id === "*" ? "Browse all topics" : target?.title}
                </button>
              );
            })}
          </div>
        </div>
      )}<div className="mt-6 border-t border-[var(--color-border-soft,#CCEBFF)] pt-5"><p className="kg-sans text-xs font-bold uppercase text-[var(--color-text-muted,#2E5A7A)]">About Knowing God</p><p className="mt-2 text-base text-[var(--color-text-muted,#2E5A7A)]">This digital topical Bible includes the complete generated corpus: {topicCount} topics and {(index?.counts.passageCount ?? 13506).toLocaleString()} passages.</p></div></aside>
      </main>
      <p className="kg-sans border-t border-[var(--color-border-soft,#CCEBFF)] px-5 py-5 text-sm leading-relaxed text-[var(--color-text-muted,#2E5A7A)]">
        Scripture quoted by permission. Quotations designated NET are from the NET Bible® copyright ©1996, 2019 by Biblical Studies Press, L.L.C. <a href="https://netbible.com" target="_blank" rel="noopener noreferrer" className="kg-focus underline">netbible.com</a>. All rights reserved.
      </p>
    </div>{copied && <div role="status" className="kg-sans fixed bottom-5 left-1/2 z-50 flex items-center gap-2 -translate-x-1/2 rounded bg-[var(--color-structure,#003A66)] px-4 py-3 text-base font-bold text-white shadow-lg"><Check size={18}/> {copied === "topic" ? "Topic references copied" : "Passages copied"}</div>}
  </div>;
}

type AdditionalScriptureSection = { sourceValue: string; links: { sourceLabel: string; queries: string[] }[] };
