import { useEffect, useRef } from "react";
import { AlertCircle, Bookmark, BookmarkCheck, ChevronRight, StickyNote } from "lucide-react";
import { getNextChapter } from "./catalog";
import { refLabel, translationLabel, washFor, type Location, type Passage } from "./reader-utils";
import type { VerseRecord } from "./study-storage";

type Props = {
  loc: Location;
  passage: Passage | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
  records: VerseRecord[];
  selected?: number;
  onSelect: (verse: number) => void;
  chapterSaved: boolean;
  onToggleChapter: () => void;
  onGo: (loc: Location) => void;
};

export function PassageView({ loc, passage, loading, error, onRetry, records, selected, onSelect, chapterSaved, onToggleChapter, onGo }: Props) {
  const scrolled = useRef("");
  useEffect(() => {
    if (!passage || !loc.verse) return;
    const key = `${loc.book}-${loc.chapter}-${loc.verse}`;
    if (scrolled.current === key) return;
    const el = document.getElementById(`v${loc.verse}`);
    if (!el) return;
    scrolled.current = key;
    requestAnimationFrame(() => el.scrollIntoView({ block: "center" }));
  }, [passage, loc.book, loc.chapter, loc.verse]);

  const next = getNextChapter(loc.book, loc.chapter);

  return (
    <article aria-labelledby="br-title" className="br-card px-5 py-6 md:px-10 md:py-9">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border-soft)] pb-5">
        <div>
          <p className="br-eyebrow">{translationLabel(loc.translation)} Bible</p>
          <h1 id="br-title" className="mt-1 text-4xl md:text-5xl text-[var(--color-hero)]">{loc.book} {loc.chapter}</h1>
        </div>
        <button type="button" onClick={onToggleChapter} aria-pressed={chapterSaved} className={`br-link inline-flex items-center gap-2 ${chapterSaved ? "!text-[var(--color-action-warm)]" : ""}`}>
          {chapterSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />} {chapterSaved ? "Chapter saved" : "Save chapter"}
        </button>
      </header>

      {loading && (
        <div role="status" aria-label="Loading chapter" className="mt-6 space-y-3">
          {Array.from({ length: 9 }, (_, i) => <div key={i} className="br-skel h-5" style={{ width: `${92 - (i * 7) % 30}%` }} />)}
        </div>
      )}
      {!loading && error && (
        <div role="alert" className="mt-6 rounded border border-[var(--warm-300)] bg-[var(--warm-50)] p-4 text-[var(--color-text)]">
          <p className="flex items-start gap-2 font-semibold"><AlertCircle size={18} className="mt-0.5 shrink-0 text-[var(--color-action-warm)]" />{error}</p>
          <button type="button" onClick={onRetry} className="br-btn-primary mt-3">Try again</button>
        </div>
      )}
      {!loading && !error && passage && (
        <>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Tap or click a verse to highlight, bookmark, note, or share it.</p>
          <div className="br-scripture mt-5">
            {passage.verses.map(v => {
              const rec = records.find(r => r.verse === v.verse);
              const isSel = selected === v.verse;
              return (
                <span key={v.verse} id={`v${v.verse}`} className="scroll-mt-28">
                  <button type="button" onClick={() => onSelect(v.verse)} aria-pressed={isSel}
                    aria-label={`${refLabel(loc.book, loc.chapter, v.verse)}${rec?.bookmark ? ", bookmarked" : ""}${rec?.highlight ? `, ${rec.highlight} highlight` : ""}${rec?.note ? ", has note" : ""}`}
                    className={`br-verse ${isSel ? "is-selected" : ""}`} style={rec?.highlight ? { backgroundColor: washFor(rec.highlight) } : undefined}>
                    <sup className="br-vnum">{v.verse}</sup>
                    {v.text}
                    {rec?.bookmark && <BookmarkCheck size={13} className="inline ml-1 -mt-0.5 text-[var(--color-action-warm)]" aria-hidden="true" />}
                    {rec?.note && <StickyNote size={13} className="inline ml-1 -mt-0.5 text-[var(--color-hero)]" aria-hidden="true" />}
                  </button>{" "}
                </span>
              );
            })}
          </div>
          {next && (
            <div className="mt-8 border-t border-[var(--color-border-soft)] pt-4 text-right">
              <button type="button" onClick={() => onGo({ ...next, translation: loc.translation })} className="br-link inline-flex items-center gap-1">Next: {refLabel(next.book, next.chapter)} <ChevronRight size={16} /></button>
            </div>
          )}
        </>
      )}
    </article>
  );
}
