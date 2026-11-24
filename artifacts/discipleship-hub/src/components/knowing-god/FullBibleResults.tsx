import { useEffect, useRef, useState } from "react";
import type { BibleVerse } from "./full-bible-search";
type Props = { query: string; translation: "NET" | "KJV"; testament: string; book: string; scriptureHref: (reference: string) => string };
type Result = { key: string; total: number; page: number; pages: number; verses: Omit<BibleVerse, "normalized">[]; error?: string; attribution?: string; numberingNote?: string };
export function FullBibleResults({ query, translation, testament, book, scriptureHref }: Props) {
  const worker = useRef<Worker | null>(null), serial = useRef(0);
  const [retry, setRetry] = useState(0);
  const filterKey = JSON.stringify([query, translation, testament, book]);
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const page = pagination.key === filterKey ? pagination.page : 1;
  const key = JSON.stringify([filterKey, page, retry]);
  const [result, setResult] = useState<Result | null>(null);
  useEffect(() => {
    const id = ++serial.current;
    const timer = window.setTimeout(() => {
      try {
        if (!worker.current) worker.current = new Worker(new URL("./full-bible.worker.ts", import.meta.url), { type: "module" });
        worker.current.onmessage = event => { if (serial.current === id && event.data.id === id) setResult({ ...event.data, key }); };
        worker.current.onerror = () => {
          if (serial.current === id) setResult({ key, error: "Bible search could not start. Please retry.", total: 0, page: 1, pages: 1, verses: [] });
          worker.current?.terminate(); worker.current = null;
        };
        worker.current.postMessage({ id, base: `${import.meta.env.BASE_URL.replace(/\/$/, "")}/knowing-god/bible-search/`, query, translation, testament, book, page });
      } catch {
        setResult({ key, error: "Background Bible search is unavailable. Please retry.", total: 0, page: 1, pages: 1, verses: [] });
      }
    }, 250);
    return () => { serial.current++; window.clearTimeout(timer); };
  }, [key]);
  useEffect(() => () => { worker.current?.terminate(); }, []);
  const current = result?.key === key ? result : null;
  return <section className="kg-sans mt-6 border-t border-[var(--color-border-soft,#CCEBFF)] pt-4" aria-labelledby="full-bible-heading" aria-live="polite">
    <h3 id="full-bible-heading" className="text-base font-bold">Full Bible verse matches{current && !current.error ? ` (${current.total})` : ""}</h3>
    <p className="mt-1 text-xs">Searches all 66 books in {translation}, independently of the curated topic collection.</p>
    {!current ? <p role="status" className="py-3 text-sm">Loading and searching the {translation} Bible…</p>
      : current.error ? <p role="alert" className="py-3 text-sm">{current.error} <button className="underline" onClick={() => setRetry(r => r + 1)}>Try again</button></p>
      : <>
        {current.total === 0 && <p className="py-3 text-sm">No Bible verses match the current query and filters.</p>}
        {current.verses.map(v => {
          const reference = `${v.book} ${v.chapter}:${v.verse}`;
          return <article key={reference} className="border-b border-[var(--color-border-soft,#CCEBFF)] py-3">
            <a className="kg-focus inline-flex min-h-11 items-center text-sm font-bold underline" href={scriptureHref(reference)} target="_blank" rel="noopener noreferrer">{reference}</a>
            <span className="ml-2 text-xs">{translation}</span><p className="text-sm leading-relaxed">{v.text}</p>
          </article>;
        })}
        {current.total > 0 && <nav aria-label="Full Bible result pages" className="flex flex-wrap items-center gap-4 py-3 text-sm">
          <button className="kg-focus min-h-11 underline disabled:opacity-40" disabled={current.page <= 1} onClick={() => setPagination({ key: filterKey, page: current.page - 1 })}>Previous</button>
          <span>Page {current.page} of {current.pages} · {current.total} matching verses</span>
          <button className="kg-focus min-h-11 underline disabled:opacity-40" disabled={current.page >= current.pages} onClick={() => setPagination({ key: filterKey, page: current.page + 1 })}>Next</button>
        </nav>}
        {current.numberingNote && <p className="my-2 text-xs">{current.numberingNote} Omitted main-text verses are not filled from KJV.</p>}
        <p className="my-2 text-xs">{current.attribution} {translation === "NET" && <a className="underline" href="https://netbible.com" target="_blank" rel="noopener noreferrer">NET Bible attribution</a>}</p>
      </>}
  </section>;
}
