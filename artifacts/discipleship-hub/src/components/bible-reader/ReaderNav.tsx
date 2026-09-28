import { useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { BOOKS, getNextChapter, getPreviousChapter, parseReference } from "./catalog";
import { TRANSLATIONS, refLabel, type Location } from "./reader-utils";
import type { Translation } from "./study-storage";

type Props = { loc: Location; onGo: (loc: Location) => void };

export function ReaderNav({ loc, onGo }: Props) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const book = BOOKS.find(b => b.name === loc.book) ?? BOOKS[0];
  const prev = getPreviousChapter(loc.book, loc.chapter);
  const next = getNextChapter(loc.book, loc.chapter);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    let r = null;
    try { r = parseReference(query); } catch { r = null; }
    if (!r) { setError(`"${query.trim() || " "}" is not a reference we recognize. Try "Romans 8" or "Jn 3:16".`); return; }
    setError(""); setQuery("");
    onGo({ book: r.book, chapter: r.chapter, verse: r.verse, translation: loc.translation });
  };

  return (
    <section aria-label="Bible navigation" className="br-card p-4 md:p-5">
      <form onSubmit={submit} role="search" className="flex gap-2">
        <label htmlFor="br-ref" className="sr-only">Go to a reference</label>
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" aria-hidden="true" />
          <input id="br-ref" value={query} onChange={e => { setQuery(e.target.value); setError(""); }} placeholder="Go to a reference, e.g. Romans 8:28"
            aria-invalid={!!error} aria-describedby={error ? "br-ref-err" : undefined}
            className="br-input w-full pl-9" />
        </div>
        <button type="submit" className="br-btn-primary">Go</button>
      </form>
      {error && <p id="br-ref-err" role="alert" className="mt-2 text-sm font-semibold text-[var(--color-action-warm)]">{error}</p>}

      <div className="mt-4 grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
        <label className="br-label">Book
          <select value={loc.book} onChange={e => onGo({ book: e.target.value, chapter: 1, translation: loc.translation })} className="br-input mt-1 w-full">
            {BOOKS.map(b => <option key={b.name}>{b.name}</option>)}
          </select>
        </label>
        <label className="br-label">Chapter
          <select value={loc.chapter} onChange={e => onGo({ book: loc.book, chapter: Number(e.target.value), translation: loc.translation })} className="br-input mt-1 w-24">
            {Array.from({ length: book.chapters }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <fieldset className="col-span-2 sm:col-span-1">
          <legend className="br-label">Translation</legend>
          <div className="mt-1 flex rounded border border-[var(--color-border-control)] bg-[var(--color-surface)] p-1">
            {TRANSLATIONS.map(t => (
              <button key={String(t.value)} type="button" aria-pressed={loc.translation === t.value}
                onClick={() => onGo({ ...loc, verse: loc.verse, translation: t.value as Translation })}
                className={`flex-1 rounded px-3 py-1.5 text-sm font-bold ${loc.translation === t.value ? "bg-[var(--color-selected-warm)] shadow-[inset_0_0_0_1px_var(--color-action-warm)] text-[var(--color-text)]" : "text-[var(--color-text-muted)]"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--color-border-soft)] pt-3">
        {prev ? <button type="button" onClick={() => onGo({ ...prev, translation: loc.translation })} className="br-link inline-flex items-center gap-1"><ChevronLeft size={16} /> {refLabel(prev.book, prev.chapter)}</button> : <span />}
        {next ? <button type="button" onClick={() => onGo({ ...next, translation: loc.translation })} className="br-link inline-flex items-center gap-1">{refLabel(next.book, next.chapter)} <ChevronRight size={16} /></button> : <span className="text-sm text-[var(--color-text-muted)]">End of the Bible</span>}
      </div>
    </section>
  );
}
