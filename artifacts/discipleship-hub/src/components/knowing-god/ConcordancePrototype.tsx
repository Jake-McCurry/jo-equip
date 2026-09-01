import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, BookOpen, Bookmark, BookmarkCheck, Check, ChevronDown, ChevronRight, Clipboard, Copy, Feather, Menu, Printer, Search, SlidersHorizontal, X } from "lucide-react";
import { fetchNetPassages, netCache } from "./bible-api";

type Passage = { reference: string; text: string };
type TopicIndex = { id: string; title: string; letter: string; sourcePages: number[]; recordType: string; passageCount: number; payload: string };
type Topic = TopicIndex & { passages: Passage[]; definition: string; additionalScripture: string; seeAlso: string[]; sourceMarkers: string[] };
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
  const [view, setView] = useState<"start" | "topic">("topic");
  const [query, setQuery] = useState(""); const [testament, setTestament] = useState("All Testaments"); const [book, setBook] = useState("All books");
  const [mobileMenu, setMobileMenu] = useState(false); const [filterOpen, setFilterOpen] = useState(false);
  const [study, setStudy] = useState<string[]>([]); const [studyLoaded, setStudyLoaded] = useState(false); const [copied, setCopied] = useState("");
  const [translation, setTranslation] = useState<"NET" | "KJV">("NET"); const [translationLoaded, setTranslationLoaded] = useState(false);
  const [netLoading, setNetLoading] = useState(false); const [netError, setNetError] = useState(false); const [, setNetTick] = useState(0);
  const [expandedLetter, setExpandedLetter] = useState("A");

  const loadLetter = (letter: string) => {
    if (payloads[letter]) return Promise.resolve(payloads[letter]);
    const active = loading.current.get(letter); if (active) return active;
    const request = fetch(base(`/knowing-god/data/topics-${letter.toLowerCase()}.json`)).then(async res => {
      if (!res.ok) throw new Error(`Unable to load ${letter} topics (${res.status}).`);
      return (await res.json() as { topics: Topic[] }).topics;
    }).then(topics => { setPayloads(previous => ({ ...previous, [letter]: topics })); setPayloadError(previous => ({ ...previous, [letter]: "" })); return topics; })
      .catch(error => { const message = error instanceof Error ? error.message : `Unable to load ${letter} topics.`; setPayloadError(previous => ({ ...previous, [letter]: message })); throw error; })
      .finally(() => loading.current.delete(letter));
    loading.current.set(letter, request); return request;
  };
  const applyTopic = (item: TopicIndex) => {
    setSelectedId(item.id); setExpandedLetter(item.letter); setView("topic"); setMobileMenu(false);
    loadLetter(item.letter).catch(() => undefined);
  };
  const openTopic = (item: TopicIndex) => {
    if (selectedId === item.id && view === "topic") {
      setMobileMenu(false);
      return;
    }
    applyTopic(item);
    window.history.pushState(null, "", `#topic=${encodeURIComponent(item.id)}`);
  };

  useEffect(() => {
    fetch(base("/knowing-god/data/index.json")).then(async res => {
      if (!res.ok) throw new Error(`Unable to load topical index (${res.status}).`);
      return res.json() as Promise<Index>;
    }).then(data => {
      setIndex(data);
      const hashId = new URLSearchParams(window.location.hash.slice(1)).get("topic");
      const initial = data.topics.find(topic => topic.id === hashId) || data.topics.find(topic => topic.id === "abiding") || data.topics[0];
      if (initial) { setSelectedId(initial.id); setExpandedLetter(initial.letter); loadLetter(initial.letter).catch(() => undefined); }
    }).catch(error => setIndexError(error instanceof Error ? error.message : "Unable to load the topical index."));
    try { setStudy(JSON.parse(localStorage.getItem("knowing-god-study") || "[]")); } catch { setStudy([]); } finally { setStudyLoaded(true); }
    const stored = localStorage.getItem("knowing-god-translation"); if (stored === "NET" || stored === "KJV") setTranslation(stored); setTranslationLoaded(true);
  }, []);
  useEffect(() => {
    if (!index) return;
    const restoreTopicFromHash = () => {
      const hashId = new URLSearchParams(window.location.hash.slice(1)).get("topic");
      const fallback = index.topics.find(topic => topic.id === "abiding") || index.topics[0];
      const target = (hashId ? index.topics.find(topic => topic.id === hashId) : fallback);
      if (target) applyTopic(target);
    };
    window.addEventListener("popstate", restoreTopicFromHash);
    window.addEventListener("hashchange", restoreTopicFromHash);
    return () => {
      window.removeEventListener("popstate", restoreTopicFromHash);
      window.removeEventListener("hashchange", restoreTopicFromHash);
    };
  }, [index, payloads]);
  useEffect(() => { if (studyLoaded) localStorage.setItem("knowing-god-study", JSON.stringify(study)); }, [study, studyLoaded]);

  const selectedIndex = index?.topics.find(topic => topic.id === selectedId);
  const selected = selectedIndex ? payloads[selectedIndex.letter]?.find(topic => topic.id === selectedId) : undefined;
  const filtered = useMemo(() => {
    if (!index) return [];
    const q = normalized(query);
    return index.topics.filter(item => !q || item.title.toLocaleLowerCase().includes(q) ||
      (payloads[item.letter]?.find(topic => topic.id === item.id) && (() => { const t = payloads[item.letter].find(topic => topic.id === item.id)!; return t.definition.toLocaleLowerCase().includes(q) || t.passages.some(p => `${p.reference} ${p.text}`.toLocaleLowerCase().includes(q)); })()));
  }, [index, payloads, query]);
  const visiblePassages = selected?.passages.filter(p => (testament === "All Testaments" || testamentFor(p.reference) === testament) && (book === "All books" || p.reference.startsWith(book)) && (!query || `${p.reference} ${p.text} ${selected.title}`.toLocaleLowerCase().includes(normalized(query)))) || [];
  useEffect(() => {
    if (!translationLoaded || translation !== "NET" || !selected) return;
    const controller = new AbortController();
    let current = true; const missing = visiblePassages.map(p => p.reference).filter(ref => !netCache.has(ref));
    if (!missing.length) { setNetLoading(false); return; }
    setNetLoading(true); setNetError(false); fetchNetPassages(missing, 3, controller.signal).then(ok => { if (current) { setNetLoading(false); setNetError(!ok); setNetTick(x => x + 1); } });
    return () => { current = false; controller.abort(); };
  }, [selectedId, selected, translation, translationLoaded, testament, book, query, visiblePassages.length]);
  const copy = async (what: "topic" | "passages") => {
    if (!selected) return;
    const text = what === "topic" ? `${selected.title}\n${selected.passages.map(p => p.reference).join("; ")}` : visiblePassages.map(p => `${p.reference}${translation === "NET" && netCache.has(p.reference) ? " (NET)" : ""}\n${translation === "NET" ? netCache.get(p.reference) || p.text : p.text}`).join("\n\n");
    await navigator.clipboard?.writeText(text); setCopied(what); window.setTimeout(() => setCopied(""), 1600);
  };
  const toggleStudy = (id: string) => setStudy(list => list.includes(id) ? list.filter(value => value !== id) : [...list, id]);
  const topicById = (id: string) => index?.topics.find(t => t.id === id);
  const isFiltering = Boolean(query.trim());

  return <div className="min-h-[100dvh] text-[#20394a]" style={{ background: "#f3f0e9", fontFamily: "Georgia, 'Times New Roman', serif" }}>
    <style>{`.kg-sans{font-family:ui-sans-serif,system-ui,sans-serif}.kg-focus:focus-visible{outline:3px solid #de5b00;outline-offset:2px}.kg-scroll::-webkit-scrollbar{width:6px}.kg-scroll::-webkit-scrollbar-thumb{background:#b5c2c3;border-radius:8px}@media print{.kg-no-print{display:none!important}.kg-reading{max-width:none!important}.kg-shell{display:block!important}}`}</style>
    <header className="kg-no-print sticky top-0 z-30 border-b border-[#274c5b]/20 bg-[#123f50] text-[#f8f5ed]"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 md:px-8"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#d9a458]/70 text-[#e5b66f]"><Feather size={18}/></div><div className="min-w-0"><p className="kg-sans text-[10px] font-semibold uppercase tracking-[.25em] text-[#bdd0cc]">JO EQUIP · Zinzendorf Mission</p><h1 className="whitespace-nowrap text-base tracking-tight text-[#f8f5ed] sm:text-xl md:text-2xl">Knowing God <span className="text-[#e4b16d]">/</span> Topical Bible</h1></div></div><div className="flex shrink-0 items-center gap-2"><span className="kg-sans hidden text-xs text-[#c2d1cf] sm:inline">{index ? `${index.counts.topicCount} topics · ${index.counts.passageCount.toLocaleString()} passages` : "Loading corpus…"}</span><button className="kg-focus rounded p-2 hover:bg-white/10 md:hidden" onClick={() => setMobileMenu(v => !v)} aria-label="Open topics menu" aria-expanded={mobileMenu}><Menu size={21}/></button><button className="kg-focus hidden items-center gap-2 rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 sm:flex" onClick={() => window.print()}><Printer size={15}/> Print</button></div></div><div className="border-t border-white/10 bg-[#0e3544] px-4 py-2 text-center kg-sans text-[11px] tracking-wide text-[#c5d4d1]">Explore the complete Knowing God topical Bible corpus through Scripture</div></header>
    <main className="kg-shell mx-auto grid max-w-[1500px] grid-cols-1 md:grid-cols-[270px_1fr] lg:grid-cols-[290px_1fr_265px]">
      <aside className={`${mobileMenu ? "block" : "hidden"} kg-no-print border-r border-[#b9c4c0] bg-[#e8e9e1] md:block`}><div className="sticky top-[95px] max-h-[calc(100dvh-95px)] overflow-y-auto kg-scroll p-5">
        <button onClick={() => { setView("start"); setMobileMenu(false); }} className={`kg-focus kg-sans mb-6 flex w-full items-center gap-2 rounded px-3 py-2.5 text-left text-sm font-bold ${view === "start" ? "bg-[#123f50] text-white" : "border border-[#aebcb8] bg-[#f8f7f2]"}`}><Feather size={16}/>Start Here</button>
        <p className="kg-sans mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#b15d2b]">Translation</p><div className="mb-6 flex rounded border border-[#aebcb8] bg-[#f8f7f2] p-1">{(["NET", "KJV"] as const).map(value => <button key={value} onClick={() => { setTranslation(value); localStorage.setItem("knowing-god-translation", value); }} className={`kg-focus kg-sans flex-1 rounded py-1.5 text-[11px] font-bold ${translation === value ? "bg-[#d4dad2]" : ""}`}>{value === "NET" ? "NET Bible" : "KJV"}</button>)}</div>
        <div className="mb-4 flex items-end justify-between border-t border-[#c1cbc5] pt-5"><div><p className="kg-sans text-[10px] font-bold uppercase tracking-[.2em] text-[#b15d2b]">The index</p><h2 className="mt-1 text-2xl text-[#123f50]">Topics</h2></div><span className="kg-sans text-xs text-[#657978]">{filtered.length} shown</span></div>
        <label className="kg-sans sr-only" htmlFor="topic-search">Search topics and loaded passages</label><div className="relative mb-4"><Search className="absolute left-3 top-3 text-[#6c7f7d]" size={16}/><input id="topic-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search titles; loaded text" className="kg-focus w-full border border-[#aebcb8] bg-[#f8f7f2] py-2.5 pl-9 pr-3 text-sm"/></div>
        <button onClick={() => setFilterOpen(v => !v)} className="kg-focus kg-sans mb-3 flex w-full items-center justify-between border-y border-[#c1cbc5] py-2 text-left text-xs font-semibold uppercase tracking-widest"><span className="flex gap-2"><SlidersHorizontal size={14}/>Passage filters</span><ChevronDown size={14}/></button>
        {filterOpen && <div className="kg-sans mb-4 space-y-3 border-b border-[#c1cbc5] pb-4"><p className="text-xs text-[#657978]">Filters apply to the open topic without loading other letters.</p><label className="block text-xs font-semibold">Testament<select value={testament} onChange={e => setTestament(e.target.value)} className="mt-1 w-full border p-2"><option>All Testaments</option><option>Old Testament</option><option>New Testament</option></select></label><label className="block text-xs font-semibold">Bible book<select value={book} onChange={e => setBook(e.target.value)} className="mt-1 w-full border p-2">{books.map(value => <option key={value}>{value}</option>)}</select></label></div>}
        {indexError && <div role="alert" className="kg-sans py-6 text-sm text-[#a4532b]">{indexError}</div>}{!index && !indexError && <div role="status" className="kg-sans py-6 text-sm">Loading complete topical index…</div>}
        {index && <nav aria-label="Topical Bible topics">{!isFiltering && <div className="mb-5 grid grid-cols-6 gap-1">{alphabet.map(letter => <button key={letter} disabled={!index.letterDistribution[letter]} onClick={() => { setExpandedLetter(expandedLetter === letter ? "" : letter); loadLetter(letter).catch(() => undefined); }} aria-expanded={expandedLetter === letter} className={`kg-focus kg-sans h-8 rounded text-[13px] font-bold ${!index.letterDistribution[letter] ? "cursor-not-allowed text-[#b9c4c0]" : expandedLetter === letter ? "bg-[#b15d2b] text-white" : "border bg-[#f8f7f2]"}`}>{letter}</button>)}</div>}
          {filtered.length === 0 && <p className="kg-sans py-6 text-center text-sm">No topics match that search.</p>}
          {alphabet.map(letter => { const entries = isFiltering ? filtered.filter(t => t.letter === letter) : expandedLetter === letter ? index.topics.filter(t => t.letter === letter) : []; return entries.length ? <div key={letter}>{isFiltering && <h3 className="kg-sans border-b py-1 text-[10px] font-bold">{letter}</h3>}{entries.map(item => <button key={item.id} onClick={() => openTopic(item)} className={`kg-focus flex w-full justify-between border-l-2 px-3 py-2 text-left ${selectedId === item.id ? "border-[#b15d2b] bg-[#d7ddd6]" : "border-transparent hover:bg-[#dde2db]"}`}><span>{item.title}</span><span className="kg-sans text-[10px] text-[#71827f]">{item.passageCount}</span></button>)}</div> : null; })}
        </nav>}</div></aside>
      {view === "start" ? <section className="kg-reading min-w-0 max-w-[920px] px-5 py-8 md:px-10 md:py-12 lg:px-14"><p className="kg-sans text-[11px] font-bold uppercase tracking-[.22em] text-[#b15d2b]">Introduction</p><h2 className="mt-2 text-4xl text-[#123f50] md:text-6xl">Knowing God</h2><p className="mt-4 text-xl italic text-[#61736f]">Topical Bible Verses on the Nature and Character of the Almighty</p><div className="mt-8 space-y-6 text-[17px] leading-[1.75]"><p>The complete topical Bible offers {index?.counts.topicCount ?? "hundreds of"} topics and {index?.counts.passageCount.toLocaleString() ?? "thousands of"} curated Scripture passages for study, worship, and prayer.</p><a href={base("/knowing-god/introduction")} className="kg-focus kg-sans inline-flex items-center gap-1 font-bold text-[#a4532b] underline">See introductory articles <ChevronRight size={16}/></a><p>Browse A–Z, search topic titles globally, and search definitions and passages as letters are loaded. Save studies locally, copy references, or print your study.</p><button onClick={() => setView("topic")} className="kg-focus kg-sans bg-[#123f50] px-5 py-3 text-sm font-bold text-white">Browse the topics</button></div></section> :
      <section className="kg-reading min-w-0 max-w-[920px] px-5 py-8 md:px-10 md:py-12 lg:px-14">{!selectedIndex ? <div role="status" className="kg-sans py-16 text-center">Loading selected topic…</div> : !selected ? <div className="kg-sans py-16 text-center">{payloadError[selectedIndex.letter] ? <div role="alert">{payloadError[selectedIndex.letter]} <button className="underline" onClick={() => loadLetter(selectedIndex.letter).catch(() => undefined)}>Try again</button></div> : <div role="status">Loading {selectedIndex.letter} topics…</div>}</div> : <><div className="kg-no-print mb-6 flex items-center gap-2 kg-sans text-xs"><BookOpen size={15}/>Topic study <ChevronRight size={13}/>{selected.title}</div><div className="mb-8 flex flex-col gap-4 border-b pb-7 sm:flex-row sm:justify-between"><div><p className="kg-sans text-[11px] font-bold uppercase tracking-[.22em] text-[#b15d2b]">{selected.recordType === "cross-reference" ? "Cross-reference" : "A topical study"}</p><h2 className="mt-2 text-4xl text-[#123f50] md:text-6xl">{selected.title}</h2>{selected.definition && <p className="mt-3 text-lg italic text-[#61736f]">{selected.definition}</p>}</div><div className="kg-no-print flex gap-2"><button onClick={() => toggleStudy(selected.id)} className="kg-focus kg-sans border px-3 py-2 text-xs">{study.includes(selected.id) ? <BookmarkCheck size={15}/> : <Bookmark size={15}/>} {study.includes(selected.id) ? "Saved" : "Save study"}</button><button onClick={() => copy("topic")} className="kg-focus kg-sans border px-3 py-2 text-xs"><Copy size={15}/> {copied === "topic" ? "Copied" : "Copy refs"}</button></div></div>
        {translation === "NET" && <p className="kg-no-print mb-6 border bg-[#dce1dc] p-3 kg-sans text-xs">NET passages are loaded on demand; unavailable passages retain the source KJV wording.</p>}{netError && <div role="alert" className="mb-4 flex gap-2 text-sm text-[#a4532b]"><AlertCircle size={16}/>Unable to connect to the NET Bible. KJV fallback is shown.</div>}
        <div className="mb-5 flex justify-between"><h3 className="text-2xl text-[#123f50]">Scripture passages <span className="kg-sans text-xs">{visiblePassages.length} results</span></h3><button onClick={() => copy("passages")} className="kg-focus kg-no-print kg-sans text-xs"><Clipboard size={14}/> {copied === "passages" ? "Copied" : "Copy passages"}</button></div>{netLoading && translation === "NET" ? <div role="status" className="kg-sans py-10 text-center">Loading NET Bible text…</div> : <div>{visiblePassages.map((p, i) => { const net = netCache.get(p.reference); return <article key={`${p.reference}-${i}`} className="border-b py-4"><p className="kg-sans text-sm font-bold text-[#285c68]">{p.reference} {translation === "NET" && <span className="text-[10px]">{net ? "NET" : "Fallback KJV"}</span>}</p><p className="mt-2 text-[17px] leading-[1.75]">{translation === "NET" ? net || p.text : p.text}</p></article>; })}</div>}{visiblePassages.length === 0 && <div className="border border-dashed py-10 text-center">This cross-reference or filter has no passages to display.</div>}{selected.additionalScripture && <div className="mt-10 border-t pt-6"><p className="kg-sans text-[10px] font-bold uppercase">Additional Scripture</p><p className="mt-2">{selected.additionalScripture}</p></div>}</>}</section>}
      <aside className="kg-no-print border-l bg-[#ecebe4] p-6 lg:min-h-[calc(100dvh-95px)]"><div className="mb-8"><div className="mb-3 flex gap-2 text-[#b15d2b]"><Bookmark size={16}/><h3 className="kg-sans text-xs font-bold uppercase">My study list</h3></div>{study.length ? study.map(id => { const item = topicById(id); return item ? <div className="flex border-b" key={id}><button className="kg-focus flex-1 py-2 text-left text-sm" onClick={() => openTopic(item)}>{item.title}</button><button className="kg-focus" onClick={() => toggleStudy(id)} aria-label={`Remove ${item.title} from study list`}><X size={15}/></button></div> : null; }) : <p className="kg-sans text-sm text-[#72817e]">Save topics here as you trace a theme through Scripture.</p>}</div>{selected && <div className="border-t pt-6"><p className="kg-sans text-[10px] font-bold uppercase">See also</p><div className="mt-3 flex flex-wrap gap-2">{selected.seeAlso.map(title => { const target = index?.topics.find(item => normalized(item.title) === normalized(title)); return <button key={title} disabled={!target} onClick={() => target && openTopic(target)} className={`kg-focus border px-2.5 py-1.5 text-sm ${target ? "" : "cursor-not-allowed text-[#9ba49e]"}`}>{title}</button>; })}</div></div>}<div className="mt-10 border-t pt-6"><p className="kg-sans text-[10px] font-bold uppercase">About Knowing God</p><p className="mt-2 text-sm text-[#687974]">This digital topical Bible includes the complete generated corpus: {index?.counts.topicCount ?? 773} topics and {(index?.counts.passageCount ?? 13506).toLocaleString()} passages.</p></div></aside>
    </main>{copied && <div role="status" className="kg-sans fixed bottom-5 left-1/2 z-50 -translate-x-1/2 bg-[#123f50] px-4 py-3 text-sm text-white"><Check size={15}/> {copied === "topic" ? "Topic references copied" : "Passages copied"}</div>}
  </div>;
}