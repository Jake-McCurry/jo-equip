import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, MapPin, Search } from "lucide-react";
import { placeHref } from "@/components/bible-maps/maps-data";
import { dictEntryHref, dictIndexHref, loadDictEntry, loadDictIndex, loadDictSearch } from "@/components/bible-dictionary/dictionary-data";
import { dictSearchTerms, dictSnippet, searchDict, type DictSearchHit } from "@/components/bible-dictionary/dictionary-search";
import type { DictPara, DictSeg } from "@/data/bible-dictionary";
import { inReader, locationOf, rangeLabel } from "./CommentaryPanel";
import type { Location } from "./reader-utils";
import { Header, LoadState, useLoad } from "./WordStudyPanel";

type Props = {
  baseUrl: string; loc: Location; verse?: number;
  onVerse: (v: number | undefined) => void; onClose?: () => void;
  /** Open entry slug (null shows the chapter list); owned by the reader so links and taps in the text can open it. */
  entry: string | null; onEntry: (slug: string | null) => void;
  hrefFor: (l: Location) => string; onGo: (l: Location) => void;
};

export function DictionaryPanel({ baseUrl, loc, verse, onVerse, onClose, entry: open, onEntry: setOpen, hrefFor, onGo }: Props) {
  const { data, loading, error, retry } = useLoad(() => loadDictIndex(baseUrl), [baseUrl]);
  const chapterName = `${loc.book} ${loc.chapter}`;
  const rows = useMemo(() => (data?.chapters[chapterName] ?? []).map(([i, verses]) => ({ slug: data!.entries[i][0], title: data!.entries[i][1], verses })), [data, chapterName]);
  const shown = verse ? rows.filter(r => r.verses.includes(verse)) : rows;
  const titleOf = useMemo(() => new Map(data?.entries ?? []), [data]);
  const [query, setQuery] = useState("");
  const search = useDictSearch(baseUrl, query);
  const searching = query.trim() !== "";

  if (open) {
    const title = titleOf.get(open) ?? search.hits?.find(h => h.slug === open)?.title ?? open;
    return <EntryView baseUrl={baseUrl} slug={open} title={title} places={data?.places[open] ?? []} backLabel={searching ? "Back to search results" : "All entries for this chapter"} onBack={() => setOpen(null)} onOpen={setOpen} onClose={onClose} hrefFor={hrefFor} onGo={onGo} />;
  }
  return (
    <div>
      <Header eyebrow="Easton’s Bible Dictionary" title={searching ? "Search the dictionary" : `Names and terms in ${chapterName}`} onClose={onClose} label="Close dictionary" />
      <div role="search" className="relative mt-3">
        <label htmlFor="br-dict-q" className="sr-only">Search inside all the dictionary articles</label>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          id="br-dict-q" type="search" autoComplete="off" spellCheck={false} value={query}
          onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === "Escape" && query) { e.stopPropagation(); setQuery(""); } }}
          placeholder="Search all articles, e.g. Passover"
          className="min-h-11 w-full rounded border border-[var(--color-border-control,#7aa7c7)] bg-white py-2 pl-8 pr-2 text-base outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-hero)]"
        />
      </div>
      {searching ? <SearchResults search={search} query={query.trim()} onOpen={setOpen} onClear={() => setQuery("")} chapterName={chapterName} /> : <>
      <LoadState loading={loading} error={error} retry={retry} label="Loading dictionary" />
      {data && rows.length === 0 && (
        <p className="mt-3 text-[17px] leading-7 text-[var(--color-text-muted)]">No dictionary entries were matched to {chapterName}.</p>
      )}
      {rows.length > 0 && (
        <>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            {verse
              ? <>{shown.length ? `${shown.length} of ${rows.length} entries apply to verse ${verse}.` : `No entry here applies to verse ${verse}.`}{" "}
                  <button type="button" className="br-link font-semibold underline" onClick={() => onVerse(undefined)}>Show the whole chapter</button></>
              : <>{rows.length} {rows.length === 1 ? "entry" : "entries"} for people, places and terms in this chapter. Select a verse to narrow the list.</>}
          </p>
          <ul className="mt-3 divide-y divide-[var(--color-border-soft)] border-y border-[var(--color-border-soft)]">
            {shown.map(r => (
              <li key={r.slug} className="flex items-baseline justify-between gap-3 px-1 py-2">
                <button type="button" onClick={() => setOpen(r.slug)} className="group min-w-0 text-left font-bold text-[var(--color-hero)]">
                  <span className="group-hover:underline">{r.title}</span>
                  <ChevronRight size={15} aria-hidden="true" className="ml-0.5 inline align-[-2px]" />
                </button>
                <span className="shrink-0 text-xs font-semibold text-[var(--color-text-muted)]">
                  {r.verses.length > 6 ? `${r.verses.length} verses` : `v. ${r.verses.join(", ")}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      </>}
      <p className="mt-4 text-sm"><a className="br-link font-semibold underline" href={dictIndexHref(baseUrl)}>Browse or search the whole dictionary</a></p>
      <DictionaryCredits />
    </div>
  );
}

type SearchState = { status: "idle" | "short" | "loading" | "error" | "ready"; hits?: DictSearchHit[]; terms?: string[]; error?: string; retry: () => void };

/** Full-text search over every article (the same file and matching rules as /bible/dictionary). */
function useDictSearch(baseUrl: string, query: string): SearchState {
  const [debounced, setDebounced] = useState(query);
  useEffect(() => { const t = window.setTimeout(() => setDebounced(query), 200); return () => window.clearTimeout(t); }, [query]);
  const terms = useMemo(() => dictSearchTerms(debounced), [debounced]);
  const [state, setState] = useState<Omit<SearchState, "retry">>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!debounced.trim()) { setState({ status: "idle" }); return; }
    if (!terms) { setState({ status: "short" }); return; }
    let live = true;
    setState(s => (s.status === "ready" ? s : { status: "loading" }));
    loadDictSearch(baseUrl)
      .then(docs => { if (live) setState({ status: "ready", hits: searchDict(docs, terms), terms }); })
      .catch(e => { if (live) setState({ status: "error", error: e instanceof Error ? e.message : "The full text of the dictionary could not be loaded." }); });
    return () => { live = false; };
  }, [baseUrl, debounced, terms, attempt]);
  return { ...state, retry: () => setAttempt(a => a + 1) };
}

const PAGE = 20;
function SearchResults({ search, query, onOpen, onClear, chapterName }: { search: SearchState; query: string; onOpen: (slug: string) => void; onClear: () => void; chapterName: string }) {
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => setLimit(PAGE), [search.hits]);
  const hits = search.hits ?? [];
  const quoted = `“${query}”`;
  const message =
    search.status === "short" ? "Type at least 3 letters to search inside the articles."
    : search.status === "loading" ? "Searching the full text of the dictionary…"
    : search.status === "ready" ? (hits.length
      ? `${hits.length.toLocaleString("en-US")} ${hits.length === 1 ? "article mentions" : "articles mention"} ${quoted}${hits.length > PAGE ? ", best matches first" : ""}.`
      : `No article mentions ${quoted}.`)
    : "";
  return (
    <div>
      <p role="status" aria-live="polite" className="mt-3 text-sm font-semibold text-[var(--color-text-muted)]">{message}</p>
      {search.status === "error" && (
        <div role="alert" className="mt-3 rounded border border-[var(--warm-300)] bg-[var(--warm-50)] p-3 text-sm font-semibold">
          {search.error} <button type="button" onClick={search.retry} className="br-link ml-1 underline">Try again</button>
        </div>
      )}
      {hits.length > 0 && (
        <ol className="mt-3 divide-y divide-[var(--color-border-soft)] border-y border-[var(--color-border-soft)]">
          {hits.slice(0, limit).map(h => (
            <li key={h.slug} className="px-1 py-2">
              <button type="button" onClick={() => onOpen(h.slug)} className="group text-left font-bold text-[var(--color-hero)]">
                <span className="group-hover:underline">{h.title}</span>
                <ChevronRight size={15} aria-hidden="true" className="ml-0.5 inline align-[-2px]" />
              </button>
              <p className="mt-0.5 text-sm leading-6">
                {dictSnippet(h.text, search.terms ?? []).map(([t, mark], i) => mark ? <mark key={i} className="bg-[#fff1a8] px-[.05em] text-inherit">{t}</mark> : <span key={i}>{t}</span>)}
              </p>
            </li>
          ))}
        </ol>
      )}
      {hits.length > limit && (
        <button type="button" onClick={() => setLimit(l => l + PAGE)} className="br-link mt-3 text-sm font-semibold underline">
          Show {Math.min(PAGE, hits.length - limit)} more results
        </button>
      )}
      <p className="mt-3 text-sm"><button type="button" onClick={onClear} className="br-link font-semibold underline">Back to the entries for {chapterName}</button></p>
    </div>
  );
}

function EntryView({ baseUrl, slug, title, places, backLabel, onBack, onOpen, onClose, hrefFor, onGo }: {
  baseUrl: string; slug: string; title: string; places: string[]; backLabel: string; onBack: () => void; onOpen: (s: string) => void; onClose?: () => void;
  hrefFor: (l: Location) => string; onGo: (l: Location) => void;
}) {
  const { data, loading, error, retry } = useLoad(() => loadDictEntry(baseUrl, slug), [baseUrl, slug]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [slug]);
  return (
    <div>
      <button type="button" onClick={onBack} className="br-link mb-2 inline-flex items-center gap-1 text-sm font-semibold"><ArrowLeft size={15} aria-hidden="true" /> {backLabel}</button>
      <Header eyebrow="Easton’s Bible Dictionary" title={title} onClose={onClose} label="Close dictionary" headingRef={heading} />
      <LoadState loading={loading} error={error} retry={retry} label="Loading dictionary entry" />
      {data && <EntryParas paras={data} render={(seg, i) => <SegLink key={i} seg={seg} baseUrl={baseUrl} onOpen={onOpen} hrefFor={hrefFor} onGo={onGo} />} />}
      {data && places.map(p => (
        <p key={p} className="mt-3 text-sm"><a className="br-link inline-flex items-center gap-1 font-semibold underline" href={placeHref(baseUrl, p)}><MapPin size={15} aria-hidden="true" /> See {title} on the Bible map</a></p>
      ))}
      <p className="mt-4 text-sm"><a className="br-link font-semibold underline" href={dictEntryHref(baseUrl, slug)}>Open “{title}” on its own page</a></p>
      <DictionaryCredits />
    </div>
  );
}

export function EntryParas({ paras, render }: { paras: DictPara[]; render: (s: DictSeg, i: number) => ReactNode }) {
  return (
    <div className="br-cm">
      {paras.map((p, i) => p[0] === "h"
        ? <h3 key={i}>{(p.slice(1) as DictSeg[]).map(render)}</h3>
        : <p key={i}>{(p.slice(1) as DictSeg[]).map(render)}</p>)}
    </div>
  );
}

function SegLink({ seg, baseUrl, onOpen, hrefFor, onGo }: { seg: DictSeg; baseUrl: string; onOpen: (s: string) => void; hrefFor: (l: Location) => string; onGo: (l: Location) => void }) {
  if (typeof seg === "string") return <>{seg}</>;
  const text = seg[1] & 1 ? <em>{seg[0]}</em> : seg[0];
  if (seg.length === 2) return <>{text}</>;
  if (typeof seg[2] === "string") {
    const slug = seg[2];
    return <a href={dictEntryHref(baseUrl, slug)} onClick={inReader(() => onOpen(slug))} className="br-cm-ref">{text}</a>;
  }
  const from = seg[2], to = seg.length === 4 ? (seg[3] as number) : undefined;
  const target = locationOf(from, "kjv");
  return <a href={hrefFor(target)} onClick={inReader(() => onGo(target))} className="br-cm-ref" title={`${rangeLabel(from, to)} (KJV)`}>{text}</a>;
}

export function DictionaryCredits() {
  return (
    <p className="mt-5 border-t border-[var(--color-border-soft)] pt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
      M. G. Easton, <cite>Illustrated Bible Dictionary</cite>, 3rd edition (1897), public domain, from the{" "}
      <a className="underline" href="https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=Easton" target="_blank" rel="noopener noreferrer">CrossWire SWORD module</a> (CCEL transcription).
      Bible links open the King James Version, which Easton quotes. It reflects the scholarship of its time.
    </p>
  );
}
