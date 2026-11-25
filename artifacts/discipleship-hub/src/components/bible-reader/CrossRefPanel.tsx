import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BOOKS } from "./catalog";
import { decodeCode, type XrefRow } from "./commentary-format";
import { loadBookText, loadXrefs } from "./commentary-data";
import { inReader, locationOf, rangeLabel } from "./CommentaryPanel";
import { refLabel, translationLabel, type Location } from "./reader-utils";
import { Header, LoadState, useLoad } from "./WordStudyPanel";

const PAGE = 10;
const PREVIEW = 160;

type Props = {
  baseUrl: string;
  loc: Location;
  verse?: number;
  hrefFor: (l: Location) => string;
  onGo: (l: Location) => void;
  onClose?: () => void;
};

export function CrossRefPanel({ baseUrl, loc, verse, hrefFor, onGo, onClose }: Props) {
  return (
    <div className="flex flex-col">
      {verse
        ? <VerseRefs key={`${loc.book}|${loc.chapter}|${verse}`} baseUrl={baseUrl} loc={loc} verse={verse} hrefFor={hrefFor} onGo={onGo} onClose={onClose} />
        : (
          <div className="py-4">
            <Header eyebrow="Cross references" title={refLabel(loc.book, loc.chapter)} onClose={onClose} label="Close cross references" />
            <p className="mt-2 text-[17px] leading-7 text-[var(--color-text-muted)]">Select a verse to see related passages elsewhere in the Bible, most relevant first.</p>
          </div>
        )}
      <CrossRefCredits />
    </div>
  );
}

function VerseRefs({ baseUrl, loc, verse, hrefFor, onGo, onClose }: Props & { verse: number }) {
  const { data, loading, error, retry } = useLoad(() => loadXrefs(baseUrl, loc.book, loc.chapter), [baseUrl, loc.book, loc.chapter]);
  const entry = data?.[String(verse)];
  const rows = entry?.r ?? [];
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
  const listId = `br-xrefs-${loc.book}-${loc.chapter}-${verse}`.replace(/\s+/g, "-");
  return (
    <div>
      <Header eyebrow="Cross references" title={refLabel(loc.book, loc.chapter, verse)} onClose={onClose} label="Close cross references" />
      <LoadState loading={loading} error={error} retry={retry} label="Loading cross references" />
      {data && !rows.length && <p className="mt-4 text-[15px] font-semibold">No cross references are recorded for this verse.</p>}
      {rows.length > 0 && (
        <>
          <p id={listId} className="br-label mt-3">{rows.length.toLocaleString()} related passages <span className="normal-case tracking-normal">· most relevant first</span></p>
          <Previews key={page} baseUrl={baseUrl} loc={loc} rows={shown} words={entry?.w ?? []} listId={listId} hrefFor={hrefFor} onGo={onGo} />
          {pages > 1 && (
            <nav aria-label="Pages of cross references" className="mt-3 flex items-center justify-between gap-2">
              <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)} className="br-btn-outline disabled:opacity-40"><ChevronLeft size={16} /> Previous</button>
              <span className="text-sm font-semibold" aria-live="polite">Page {page + 1} of {pages}</span>
              <button type="button" disabled={page >= pages - 1} onClick={() => setPage(p => p + 1)} className="br-btn-outline disabled:opacity-40">Next <ChevronRight size={16} /></button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

function Previews({ baseUrl, loc, rows, words, listId, hrefFor, onGo }: { baseUrl: string; loc: Location; rows: XrefRow[]; words: string[]; listId: string; hrefFor: (l: Location) => string; onGo: (l: Location) => void }) {
  // Verse text for this page only, from the locally hosted NET/KJV text.
  const [texts, setTexts] = useState<Map<number, string> | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    const books = [...new Set(rows.map(r => decodeCode(r[0]).book))];
    Promise.all(books.map(b => loadBookText(baseUrl, loc.translation, BOOKS[b - 1].name).then(m => [b, m] as const)))
      .then(all => {
        if (!live) return;
        const out = new Map<number, string>();
        for (const [from] of rows) {
          const r = decodeCode(from);
          const m = all.find(([b]) => b === r.book)?.[1];
          const text = m?.get(r.chapter * 1000 + (r.verse || 1));
          if (text) out.set(from, text);
        }
        setTexts(out);
      })
      .catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [rows, baseUrl, loc.translation]);

  return (
    <ol aria-labelledby={listId} className="mt-2 divide-y divide-[var(--color-border-soft)] border-y border-[var(--color-border-soft)]">
      {rows.map(([from, to, votes, word]) => {
        const target = locationOf(from, loc.translation);
        const text = texts?.get(from);
        const preview = text && text.length > PREVIEW ? `${text.slice(0, PREVIEW).replace(/\s+\S*$/, "")}…` : text;
        return (
          <li key={from} className="py-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <a href={hrefFor(target)} onClick={inReader(() => onGo(target))} className="br-link inline-flex min-h-9 items-center text-[15px]">
                {rangeLabel(from, to || undefined)}
              </a>
              <span className="text-xs text-[var(--color-text-muted)]">
                {word >= 0 && words[word] ? <>on &ldquo;{words[word]}&rdquo; · </> : null}
                {votes >= 0 ? `${votes.toLocaleString()} vote${votes === 1 ? "" : "s"}` : "TSK"}
              </span>
            </div>
            <p className="mt-0.5 text-[15px] leading-6">
              {preview
                ? <>{preview}{to ? <span className="text-[var(--color-text-muted)]"> (first verse)</span> : null}</>
                : texts || failed
                  ? <span className="text-[var(--color-text-muted)]">{decodeCode(from).verse ? `Preview not available in the ${translationLabel(loc.translation)} text.` : "Whole chapter."}</span>
                  : <span className="br-skel block h-5" aria-hidden="true" />}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function CrossRefCredits() {
  return (
    <p className="mt-5 border-t border-[var(--color-border-soft)] pt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
      Cross references: Treasury of Scripture Knowledge (public domain; digital text from the{" "}
      <a className="underline" href="https://crosswire.org/sword/modules/" target="_blank" rel="noopener noreferrer">CrossWire Bible Society</a>) combined with{" "}
      <a className="underline" href="https://www.openbible.info/labs/cross-references/" target="_blank" rel="noopener noreferrer">OpenBible.info</a> cross references (CC BY), ranked by OpenBible.info community votes.
      Previews use the version you are reading.
    </p>
  );
}
