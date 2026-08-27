import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Bookmark, BookmarkCheck, Check, ChevronDown, ChevronRight, Clipboard, Copy, Feather, Filter, Menu, Printer, Search, SlidersHorizontal, X } from "lucide-react";
import sourceData from "./sample-data.json";

type Passage = { reference: string; text: string };
type Topic = { title: string; sourcePages: number[]; passages: Passage[]; definition: string; additionalScripture: string; seeAlso: string[] };
const topics = sourceData.topics as Topic[];
const books = ["All books", "Leviticus", "Deuteronomy", "Psalms", "Proverbs", "Isaiah", "Jeremiah", "Ezekiel", "Matthew", "Mark", "Luke", "John", "Romans", "James", "Hebrews", "Revelation"];
const testamentFor = (ref: string) => /^(Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation)/.test(ref) ? "New Testament" : "Old Testament";

export function ConcordancePrototype() {
  const [selectedTitle, setSelectedTitle] = useState("Abiding");
  const [query, setQuery] = useState("");
  const [testament, setTestament] = useState("All Testaments");
  const [book, setBook] = useState("All books");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [study, setStudy] = useState<string[]>([]);
  const [studyLoaded, setStudyLoaded] = useState(false);
  const [copied, setCopied] = useState("");
  const selected = topics.find(t => t.title === selectedTitle) || topics[0];

  useEffect(() => {
    try {
      setStudy(JSON.parse(localStorage.getItem("knowing-god-study") || "[]"));
    } catch {
      setStudy([]);
    } finally {
      setStudyLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (studyLoaded) localStorage.setItem("knowing-god-study", JSON.stringify(study));
  }, [study, studyLoaded]);
  const filteredTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    return topics.filter(t => {
      const matchesQuery = !q || t.title.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q) || t.passages.some(p => `${p.reference} ${p.text}`.toLowerCase().includes(q));
      const passages = t.passages.filter(p => (testament === "All Testaments" || testamentFor(p.reference) === testament) && (book === "All books" || p.reference.startsWith(book)));
      return matchesQuery && (testament === "All Testaments" && book === "All books" ? true : passages.length > 0);
    });
  }, [query, testament, book]);
  const visiblePassages = selected.passages.filter(p => (testament === "All Testaments" || testamentFor(p.reference) === testament) && (book === "All books" || p.reference.startsWith(book)) && (!query || `${p.reference} ${p.text}`.toLowerCase().includes(query.toLowerCase()) || selected.title.toLowerCase().includes(query.toLowerCase())));
  const toggleStudy = (title: string) => setStudy(s => s.includes(title) ? s.filter(x => x !== title) : [...s, title]);
  const copy = async (text: string, label: string) => { await navigator.clipboard?.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 1600); };
  const printPage = () => window.print();

  return (
    <div className="min-h-[100dvh] text-[#20394a]" style={{ background: "#f3f0e9", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <style>{`
        .kg-sans{font-family:ui-sans-serif,system-ui,sans-serif}.kg-serif{font-family:Georgia,'Times New Roman',serif}
        .kg-focus:focus-visible{outline:3px solid #de5b00;outline-offset:2px}.kg-scroll::-webkit-scrollbar{width:6px}.kg-scroll::-webkit-scrollbar-thumb{background:#b5c2c3;border-radius:8px}
        @media print{.kg-no-print{display:none!important}.kg-reading{max-width:none!important}.kg-shell{display:block!important}}
      `}</style>
      <header className="kg-no-print sticky top-0 z-30 border-b border-[#274c5b]/20 bg-[#123f50] text-[#f8f5ed]">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-3 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-[#d9a458]/70 text-[#e5b66f]"><Feather size={18}/></div>
            <div><p className="kg-sans text-[10px] font-semibold uppercase tracking-[.25em] text-[#bdd0cc]">JO EQUIP · Zinzendorf Mission</p><h1 className="text-xl tracking-tight text-[#f8f5ed] md:text-2xl">Knowing God <span className="text-[#e4b16d]">/</span> Concordance</h1></div>
          </div>
          <div className="flex items-center gap-2">
            <span className="kg-sans hidden text-xs text-[#c2d1cf] sm:inline">Pages 29–50 sample</span>
            <button className="kg-focus rounded p-2 hover:bg-white/10 md:hidden" onClick={() => setMobileMenu(v => !v)} aria-label="Open topics menu" aria-expanded={mobileMenu}><Menu size={21}/></button>
            <button className="kg-focus hidden items-center gap-2 rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 sm:flex" onClick={printPage}><Printer size={15}/> Print</button>
          </div>
        </div>
        <div className="border-t border-white/10 bg-[#0e3544] px-4 py-2 text-center kg-sans text-[11px] tracking-wide text-[#c5d4d1]">A quiet place to trace the character and ways of God through Scripture · Sample prototype, pages 29–50 of 1,134</div>
      </header>

      <main className="kg-shell mx-auto grid max-w-[1500px] grid-cols-1 md:grid-cols-[270px_1fr] lg:grid-cols-[290px_1fr_265px]">
        <aside className={`${mobileMenu ? "block" : "hidden"} kg-no-print border-r border-[#b9c4c0] bg-[#e8e9e1] md:block`}>
          <div className="sticky top-[95px] max-h-[calc(100dvh-95px)] overflow-y-auto kg-scroll p-5">
            <div className="mb-6 flex items-end justify-between"><div><p className="kg-sans text-[10px] font-bold uppercase tracking-[.2em] text-[#b15d2b]">The index</p><h2 className="mt-1 text-2xl text-[#123f50]">Topics</h2></div><span className="kg-sans text-xs text-[#657978]">{filteredTopics.length} shown</span></div>
            <label className="kg-sans sr-only" htmlFor="topic-search">Search topics and verses</label>
            <div className="relative mb-4"><Search className="absolute left-3 top-3 text-[#6c7f7d]" size={16}/><input suppressHydrationWarning id="topic-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search the concordance" className="kg-focus w-full border border-[#aebcb8] bg-[#f8f7f2] py-2.5 pl-9 pr-3 text-sm text-[#20394a] placeholder:text-[#80908d]"/></div>
            <button onClick={() => setFilterOpen(v => !v)} className="kg-focus kg-sans mb-3 flex w-full items-center justify-between border-y border-[#c1cbc5] py-2 text-left text-xs font-semibold uppercase tracking-widest text-[#54706f]"><span className="flex items-center gap-2"><SlidersHorizontal size={14}/> Refine results</span><ChevronDown size={14} className={filterOpen ? "rotate-180" : ""}/></button>
            {filterOpen && <div className="kg-sans mb-4 space-y-3 border-b border-[#c1cbc5] pb-4">
              <label className="block text-xs font-semibold text-[#52706d]">Testament<select value={testament} onChange={e => setTestament(e.target.value)} className="kg-focus mt-1 w-full border border-[#b6c2bd] bg-[#f8f7f2] p-2 text-sm font-normal"><option>All Testaments</option><option>Old Testament</option><option>New Testament</option></select></label>
              <label className="block text-xs font-semibold text-[#52706d]">Bible book<select value={book} onChange={e => setBook(e.target.value)} className="kg-focus mt-1 w-full border border-[#b6c2bd] bg-[#f8f7f2] p-2 text-sm font-normal">{books.map(b => <option key={b}>{b}</option>)}</select></label>
              {(testament !== "All Testaments" || book !== "All books") && <button onClick={() => {setTestament("All Testaments");setBook("All books")}} className="text-xs text-[#b15d2b] underline">Clear filters</button>}
            </div>}
            <nav aria-label="Concordance topics" className="space-y-0.5">{filteredTopics.map(t => <button key={t.title} onClick={() => {setSelectedTitle(t.title);setMobileMenu(false)}} className={`kg-focus group flex w-full items-center justify-between border-l-2 px-3 py-2 text-left transition-colors ${selectedTitle === t.title ? "border-[#b15d2b] bg-[#d7ddd6] text-[#123f50]" : "border-transparent hover:bg-[#dde2db]"}`}><span className="text-[15px]">{t.title}</span><span className="kg-sans text-[10px] text-[#71827f]">{t.passages.length}</span></button>)}</nav>
            {filteredTopics.length === 0 && <div className="kg-sans py-8 text-center text-sm text-[#667a77]">No topics match that search.</div>}
          </div>
        </aside>

        <section className="kg-reading min-w-0 max-w-[920px] px-5 py-8 md:px-10 md:py-12 lg:px-14">
          <div className="kg-no-print mb-6 flex items-center gap-2 kg-sans text-xs text-[#69807c]"><BookOpen size={15} className="text-[#b15d2b]"/> Topic study <ChevronRight size={13}/> <span className="text-[#213d4b]">{selected.title}</span></div>
          <div className="mb-8 flex flex-col gap-4 border-b border-[#b7c2bb] pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="kg-sans mb-2 text-[11px] font-bold uppercase tracking-[.22em] text-[#b15d2b]">A topical study</p><h2 className="text-4xl leading-none text-[#123f50] md:text-6xl">{selected.title}</h2><p className="mt-3 max-w-2xl text-lg italic leading-relaxed text-[#61736f]">{selected.definition}</p></div>
            <div className="kg-no-print flex shrink-0 gap-2"><button onClick={() => toggleStudy(selected.title)} className="kg-focus kg-sans inline-flex items-center gap-2 border border-[#aebdb6] bg-[#eceee7] px-3 py-2 text-xs font-semibold text-[#315661] hover:bg-[#e0e5dd]">{study.includes(selected.title) ? <BookmarkCheck size={15}/> : <Bookmark size={15}/>} {study.includes(selected.title) ? "Saved" : "Save study"}</button><button onClick={() => copy(`${selected.title}\n${selected.passages.map(p => p.reference).join("; ")}`, "topic")} className="kg-focus kg-sans inline-flex items-center gap-2 border border-[#aebdb6] bg-[#eceee7] px-3 py-2 text-xs font-semibold text-[#315661] hover:bg-[#e0e5dd]"><Copy size={15}/> {copied === "topic" ? "Copied" : "Copy refs"}</button></div>
          </div>
          <div className="mb-8 border-l-4 border-[#d2a05b] bg-[#e8e5da] px-5 py-4"><p className="kg-sans text-[10px] font-bold uppercase tracking-[.19em] text-[#9a5d31]">In brief</p><p className="mt-1 text-[15px] leading-relaxed text-[#415c5d]">The passages gathered here invite careful reading. Let the repeated witness of Scripture shape the study, not merely confirm it.</p></div>
          <div className="mb-5 flex items-center justify-between"><h3 className="text-2xl text-[#123f50]">Scripture passages <span className="kg-sans ml-2 text-xs font-normal text-[#71817c]">{visiblePassages.length} results</span></h3><button onClick={() => copy(visiblePassages.map(p => `${p.reference}\n${p.text}`).join("\n\n"), "passages")} className="kg-focus kg-no-print kg-sans inline-flex items-center gap-1.5 text-xs font-semibold text-[#9b572e] hover:underline"><Clipboard size={14}/>{copied === "passages" ? "Copied to clipboard" : "Copy passages"}</button></div>
          <div className="space-y-3">{visiblePassages.map((p, i) => <article key={p.reference} className="group border-b border-[#c8cdc5] py-4 first:border-t"><div className="flex gap-4"><span className="kg-sans pt-1 text-xs text-[#9b572e]">{String(i + 1).padStart(2, "0")}</span><div><h4 className="kg-sans text-sm font-bold tracking-wide text-[#285c68]">{p.reference}</h4><p className="mt-2 text-[17px] leading-[1.75] text-[#30494f]">{p.text}</p></div></div></article>)}</div>
          {visiblePassages.length === 0 && <div className="border border-dashed border-[#aebcb4] py-14 text-center"><p className="text-lg text-[#526b69]">No passages found with these filters.</p><button onClick={() => {setTestament("All Testaments");setBook("All books");setQuery("")}} className="kg-sans mt-2 text-sm font-semibold text-[#a65a30] underline">Reset search</button></div>}
          <div className="mt-10 border-t border-[#b7c2bb] pt-6"><p className="kg-sans text-[10px] font-bold uppercase tracking-[.18em] text-[#71827c]">Additional Scripture</p><p className="mt-2 text-[15px] leading-relaxed text-[#4c6666]">{selected.additionalScripture}</p></div>
        </section>

        <aside className="kg-no-print border-l border-[#c2cbc4] bg-[#ecebe4] p-6 lg:min-h-[calc(100dvh-95px)]">
          <div className="mb-8"><div className="mb-3 flex items-center gap-2 text-[#b15d2b]"><Bookmark size={16}/><h3 className="kg-sans text-xs font-bold uppercase tracking-[.18em]">My study list</h3></div>{study.length ? <div className="space-y-1">{study.map(title => <div key={title} className="flex items-center border-b border-[#cbd2c9]"><button onClick={() => setSelectedTitle(title)} className="kg-focus flex-1 py-2 text-left text-sm text-[#315661] hover:text-[#a4532b]">{title}</button><button onClick={() => toggleStudy(title)} aria-label={`Remove ${title} from study list`} title={`Remove ${title}`} className="kg-focus ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center text-[#71827f] hover:bg-[#d7ddd6] hover:text-[#a4532b]"><X size={15}/></button></div>)}</div> : <p className="kg-sans text-sm leading-relaxed text-[#72817e]">Save topics here as you trace a theme through Scripture. Your list stays in this browser.</p>}</div>
          <div className="border-t border-[#c3cbc4] pt-6"><p className="kg-sans text-[10px] font-bold uppercase tracking-[.18em] text-[#71827c]">See also</p><div className="mt-3 flex flex-wrap gap-2">{selected.seeAlso.map(title => { const exists = topics.some(t => t.title === title); return <button key={title} disabled={!exists} onClick={() => exists && setSelectedTitle(title)} className={`kg-focus border px-2.5 py-1.5 text-left text-sm ${exists ? "border-[#b2c2bb] text-[#315d64] hover:border-[#a4532b] hover:text-[#a4532b]" : "cursor-not-allowed border-[#d0d3cc] text-[#9ba49e]"}`}>{title}</button>; })}</div></div>
          <div className="mt-10 border-t border-[#c3cbc4] pt-6"><p className="kg-sans text-[10px] font-bold uppercase tracking-[.18em] text-[#71827c]">About this sample</p><p className="mt-2 text-sm leading-relaxed text-[#687974]">Knowing God is a 1,134-page topical Scripture concordance published by Zinzendorf Mission. This interactive sample contains extracted pages 29–50.</p></div>
        </aside>
      </main>
      {copied && <div role="status" className="kg-sans fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 bg-[#123f50] px-4 py-3 text-sm text-white shadow-lg"><Check size={15} className="text-[#e4b16d]"/> {copied === "topic" ? "Topic references copied" : "Passages copied"}</div>}
    </div>
  );
}