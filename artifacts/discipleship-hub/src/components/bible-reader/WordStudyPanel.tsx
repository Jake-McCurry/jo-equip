import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, X } from "lucide-react";
import { BOOKS } from "./catalog";
import { locationSearch, refLabel, translationLabel, type Location } from "./reader-utils";
import { loadChapterWords, loadEntry } from "./strongs-data";
import { decodeVerse, expandVerses, type LexEntry, type WordRow } from "./strongs-format";

const PAGE = 20;

type Props = {
  baseUrl: string;
  loc: Location;
  verse?: number;
  strongs: string | null;
  onOpen: (num: string) => void;
  onBack: () => void;
  onClose: () => void;
  onGo: (loc: Location) => void;
  compact?: boolean;
};

const langOf = (num: string) => (num.startsWith("H") ? { lang: "he", dir: "rtl" as const } : { lang: "grc", dir: "ltr" as const });

export function WordStudyPanel({ baseUrl, loc, verse, strongs, onOpen, onBack, onClose, onGo, compact }: Props) {
  return (
    <div className="flex flex-col">
      {strongs
        ? <EntryView key={strongs} baseUrl={baseUrl} loc={loc} verse={verse} num={strongs} onBack={onBack} onClose={onClose} onGo={onGo} compact={compact} />
        : verse
          ? <VerseWords baseUrl={baseUrl} loc={loc} verse={verse} onOpen={onOpen} onClose={onClose} />
          : <Intro loc={loc} />}
      <StrongsCredits />
    </div>
  );
}

function Intro({ loc }: { loc: Location }) {
  return (
    <div className="py-4">
      <p className="br-eyebrow">Word study</p>
      <p className="mt-2 text-[17px] leading-7 text-[var(--color-text-muted)]">
        Select a verse to see its original Hebrew or Greek words with Strong&rsquo;s numbers.
        {String(loc.translation) === "kjv"
          ? " Turn on “Show Strong’s” above the passage to tap individual KJV words."
          : " This works for NET and KJV. Switch to KJV to tap individual English words."}
      </p>
    </div>
  );
}

export function Header({ eyebrow, title, onClose, label, headingRef }: { eyebrow: string; title: ReactNode; onClose?: () => void; label: string; headingRef?: Ref<HTMLHeadingElement> }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="br-eyebrow">{eyebrow}</p>
        <h2 ref={headingRef} tabIndex={-1} className="mt-0.5 text-xl text-[var(--color-hero)] outline-none">{title}</h2>
      </div>
      {onClose && <button type="button" onClick={onClose} aria-label={label} className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)]"><X size={18} /></button>}
    </div>
  );
}

export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let live = true;
    setState({ loading: true });
    load().then(data => live && setState({ data, loading: false }))
      .catch(e => live && setState({ error: e instanceof Error ? e.message : "Word study data could not be loaded.", loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retry]);
  return { ...state, retry: () => setRetry(r => r + 1) };
}

export function LoadState({ loading, error, retry, label = "Loading word study" }: { loading: boolean; error?: string; retry: () => void; label?: string }) {
  if (loading) return <div role="status" aria-label={label} className="mt-4 space-y-2">{[0, 1, 2, 3].map(i => <div key={i} className="br-skel h-10" />)}</div>;
  if (error) return (
    <div role="alert" className="mt-4 rounded border border-[var(--warm-300)] bg-[var(--warm-50)] p-3 text-sm font-semibold">
      {error} <button type="button" onClick={retry} className="br-link ml-1 underline">Try again</button>
    </div>
  );
  return null;
}

function VerseWords({ baseUrl, loc, verse, onOpen, onClose }: { baseUrl: string; loc: Location; verse: number; onOpen: (n: string) => void; onClose: () => void }) {
  const { data, loading, error, retry } = useLoad(() => loadChapterWords(baseUrl, loc.book, loc.chapter), [baseUrl, loc.book, loc.chapter]);
  const rows = data?.w[String(verse)] ?? [];
  const testament = BOOKS.findIndex(b => b.name === loc.book) < 39 ? "Hebrew" : "Greek";
  const title = rows.filter(r => r[4] === "t");
  const body = rows.filter(r => r[4] !== "t");
  return (
    <div>
      <Header eyebrow="Word study" onClose={onClose} label="Close word study"
        title={<>{refLabel(loc.book, loc.chapter, verse)} <span className="text-sm font-semibold text-[var(--color-text-muted)]">{testament} words</span></>} />
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">
        Original words in order, for the verse you are reading in {translationLabel(loc.translation)}. Select a word for its Strong&rsquo;s entry.
      </p>
      <LoadState loading={loading} error={error} retry={retry} />
      {data && !rows.length && <p className="mt-4 text-sm font-semibold">No original-language words are recorded for this verse.</p>}
      {title.length > 0 && <WordList heading="Psalm title" rows={title} onOpen={onOpen} />}
      {body.length > 0 && <WordList heading={title.length ? "Verse" : undefined} rows={body} onOpen={onOpen} />}
    </div>
  );
}

function WordList({ heading, rows, onOpen }: { heading?: string; rows: WordRow[]; onOpen: (n: string) => void }) {
  return (
    <>
      {heading && <h3 className="br-label mt-4">{heading}</h3>}
      <ol className="mt-2 divide-y divide-[var(--color-border-soft)] border-y border-[var(--color-border-soft)]">
        {rows.map(([orig, translit, num, gloss, flag], i) => {
          const { lang, dir } = langOf(num);
          return (
            <li key={i}>
              <button type="button" onClick={() => onOpen(num)} aria-label={`${translit || orig}, ${gloss}, Strong's ${num}`}
                className="br-word-row grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-1 py-2 text-left">
                <span className="min-w-0">
                  <span lang={lang} dir={dir} className="br-orig">{orig}</span>
                  <span className="ml-2 text-sm italic text-[var(--color-text-muted)]">{translit}</span>
                  <span className="block text-[15px] leading-6">{gloss}</span>
                  {flag === "n" && <span className="br-flag">Not in the KJV&rsquo;s Greek text</span>}
                  {flag === "r" && <span className="br-flag">Only in the KJV&rsquo;s Greek text</span>}
                </span>
                <span className="text-sm font-bold text-[var(--color-hero)]">{num}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );
}

function EntryView({ baseUrl, loc, verse, num, onBack, onClose, onGo, compact }: { baseUrl: string; loc: Location; verse?: number; num: string; onBack: () => void; onClose: () => void; onGo: (loc: Location) => void; compact?: boolean }) {
  const { data: entry, loading, error, retry } = useLoad<LexEntry | null>(() => loadEntry(baseUrl, num), [baseUrl, num]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (!compact) heading.current?.focus({ preventScroll: true }); }, [num, compact]);
  const { lang, dir } = langOf(num);
  return (
    <div>
      {verse && (
        <button type="button" onClick={onBack} className="br-link -mt-1 mb-1 inline-flex items-center gap-1.5 text-sm">
          <ArrowLeft size={16} /> Words in {refLabel(loc.book, loc.chapter, verse)}
        </button>
      )}
      <Header eyebrow={`Strong's ${num}`} onClose={onClose} label="Close word study" headingRef={heading}
        title={entry ? <span lang={lang} dir={dir} className="br-orig br-orig-lg">{entry.l || num}</span> : `Strong's ${num}`} />
      <LoadState loading={loading} error={error} retry={retry} />
      {!loading && !error && !entry && (
        <p role="alert" className="mt-3 text-sm font-semibold">Strong&rsquo;s number {num} was not found. Hebrew numbers run H1–H8674 and Greek numbers G1–G5624.</p>
      )}
      {entry && <EntryBody entry={entry} num={num} loc={loc} verse={verse} onGo={onGo} />}
    </div>
  );
}

function EntryBody({ entry, num, loc, verse, onGo }: { entry: LexEntry; num: string; loc: Location; verse?: number; onGo: (loc: Location) => void }) {
  const refs = expandVerses(entry.v).map(decodeVerse);
  const pages = Math.max(1, Math.ceil(refs.length / PAGE));
  const currentIndex = refs.findIndex(r => BOOKS[r.book - 1]?.name === loc.book && r.chapter === loc.chapter && r.verse === verse);
  const [page, setPage] = useState(currentIndex >= 0 ? Math.floor(currentIndex / PAGE) : 0);
  // Show the page containing the verse being read whenever it changes.
  useEffect(() => { if (currentIndex >= 0) setPage(Math.floor(currentIndex / PAGE)); }, [currentIndex]);
  const shown = refs.slice(page * PAGE, page * PAGE + PAGE);
  const listId = `br-strongs-refs-${num}`;
  return (
    <div className="mt-1">
      <p className="text-[15px]">
        {entry.x && <span className="italic">{entry.x}</span>}
        {entry.p && <span className="text-[var(--color-text-muted)]"> · pronounced <span className="font-semibold">{entry.p}</span></span>}
      </p>
      {entry.t && <p className="mt-1 text-sm font-semibold text-[var(--color-text-muted)]">{entry.t}</p>}
      <dl className="br-entry mt-3">
        {entry.s && <><dt>Definition</dt><dd>{entry.s}</dd></>}
        {!entry.s && entry.g && <><dt>Short gloss</dt><dd>{entry.g}</dd></>}
        {entry.d && <><dt>Derivation</dt><dd>{entry.d}</dd></>}
        {entry.k && <><dt>KJV translates it as</dt><dd>{entry.k}</dd></>}
        {entry.r.length > 0 && (
          <><dt>Most common KJV wording</dt>
            <dd><ul className="flex flex-wrap gap-1.5">{entry.r.map(([w, n]) => <li key={w} className="br-chip">{w} <span className="text-[var(--color-text-muted)]">{n}</span></li>)}</ul></dd></>
        )}
      </dl>
      {entry.n && <p className="mt-2 text-sm text-[var(--color-text-muted)]">Strong&rsquo;s dictionary has no entry for this number; the short gloss is from STEPBible.</p>}

      <h3 className="br-label mt-5" id={listId}>Verses with {num} <span className="normal-case tracking-normal">({refs.length.toLocaleString()})</span></h3>
      <ul aria-labelledby={listId} className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
        {shown.map(r => {
          const book = BOOKS[r.book - 1]?.name ?? "";
          const target: Location = { book, chapter: r.chapter, verse: r.verse, translation: loc.translation };
          const here = book === loc.book && r.chapter === loc.chapter && r.verse === verse;
          return (
            <li key={`${r.book}.${r.chapter}.${r.verse}`}>
              <a href={`${window.location.pathname}${locationSearch(target, num)}`} aria-current={here ? "location" : undefined}
                onClick={e => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; e.preventDefault(); onGo(target); }}
                className={`br-link inline-flex min-h-9 items-center text-[15px] ${here ? "!text-[var(--color-action-warm)] underline" : ""}`}>
                {refLabel(book, r.chapter, r.verse)}
              </a>
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <nav aria-label={`Pages of verses with ${num}`} className="mt-3 flex items-center justify-between gap-2">
          <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="br-btn-outline disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
          <span className="text-sm font-semibold" aria-live="polite">Page {page + 1} of {pages}</span>
          <button type="button" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} className="br-btn-outline disabled:opacity-40">Next <ChevronRight size={16} /></button>
        </nav>
      )}
    </div>
  );
}

export function StrongsCredits() {
  return (
    <p className="mt-5 border-t border-[var(--color-border-soft)] pt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
      Word study: Strong&rsquo;s dictionaries (public domain; digital edition by{" "}
      <a className="underline" href="https://github.com/openscriptures/strongs" target="_blank" rel="noopener noreferrer">Open Scriptures</a>, CC BY-SA);
      original words, transliterations and glosses from{" "}
      <a className="underline" href="https://github.com/STEPBible/STEPBible-Data" target="_blank" rel="noopener noreferrer">STEPBible.org</a> TAHOT/TAGNT (CC BY 4.0);
      KJV Strong&rsquo;s tagging from <a className="underline" href="https://ebible.org/kjv/" target="_blank" rel="noopener noreferrer">eBible.org</a> (public domain).
    </p>
  );
}
