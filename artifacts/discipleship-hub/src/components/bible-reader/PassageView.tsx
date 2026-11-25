import { useEffect, useRef } from "react";
import { AlertCircle, Bookmark, BookmarkCheck, ChevronRight, Languages, StickyNote } from "lucide-react";
import { getNextChapter } from "./catalog";
import { refLabel, translationLabel, washFor, type Location, type Passage } from "./reader-utils";
import type { VerseRecord } from "./study-storage";
import { scrollToPassage } from "./passage-scroll";
import { alignKjv, segmentKjv, type KjvTag } from "./strongs-align";

type Props = {
  loc: Location;
  navigationId: number;
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
  /** KJV only: Strong's-tagged words for this chapter (null while loading). */
  strongs?: { on: boolean; tags: Record<string, KjvTag[]> | null; error: string; onToggle: () => void; onWord: (verse: number, num: string) => void; active?: string | null };
};

export function PassageView({ loc, navigationId, passage, loading, error, onRetry, records, selected, onSelect, chapterSaved, onToggleChapter, onGo, strongs }: Props) {
  const lastNavigation = useRef(-1);
  useEffect(() => scrollToPassage(loc, passage, loading, error, navigationId, lastNavigation),
    [passage, loading, error, loc.book, loc.chapter, loc.verse, loc.translation, navigationId]);

  const next = getNextChapter(loc.book, loc.chapter);
  const tagged = strongs?.on ? strongs.tags : null;

  return (
    <article aria-labelledby="br-title" className="br-card px-5 py-6 md:px-10 md:py-9">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--color-border-soft)] pb-5">
        <div>
          <p className="br-eyebrow">{translationLabel(loc.translation)} Bible</p>
          <h1 id="br-title" className="mt-1 text-4xl md:text-5xl text-[var(--color-hero)]">{loc.book} {loc.chapter}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-5">
        {strongs && (
          <button type="button" onClick={strongs.onToggle} aria-pressed={strongs.on} className={`br-link inline-flex items-center gap-2 ${strongs.on ? "!text-[var(--color-action-warm)]" : ""}`}>
            <Languages size={17} /> {strongs.on ? "Hide Strong’s" : "Show Strong’s"}
          </button>
        )}
        <button type="button" onClick={onToggleChapter} aria-pressed={chapterSaved} className={`br-link inline-flex items-center gap-2 ${chapterSaved ? "!text-[var(--color-action-warm)]" : ""}`}>
          {chapterSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />} {chapterSaved ? "Chapter saved" : "Save chapter"}
        </button>
        </div>
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
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            {tagged ? "Tap a word for its Strong’s entry, or a verse number to highlight, bookmark, note, or share the verse." : "Tap or click a verse to highlight, bookmark, note, or share it."}
          </p>
          {strongs?.on && strongs.error && <p role="alert" className="mt-2 text-sm font-semibold text-[var(--color-action-warm)]">{strongs.error}</p>}
          {strongs?.on && !strongs.tags && !strongs.error && <p role="status" className="mt-2 text-sm text-[var(--color-text-muted)]">Loading Strong’s numbers…</p>}
          <div className="br-scripture mt-5">
            {passage.verses.map(v => {
              const rec = records.find(r => r.verse === v.verse);
              const isSel = selected === v.verse;
              const label = `${refLabel(loc.book, loc.chapter, v.verse)}${rec?.bookmark ? ", bookmarked" : ""}${rec?.highlight ? `, ${rec.highlight} highlight` : ""}${rec?.note ? ", has note" : ""}`;
              if (tagged) {
                const segments = segmentKjv(v.text, alignKjv(v.text, tagged[String(v.verse)] ?? []));
                return (
                  <span key={v.verse} id={`v${v.verse}`} className={`br-verse scroll-mt-28 ${isSel ? "is-selected" : ""}`} style={rec?.highlight ? { backgroundColor: washFor(rec.highlight) } : undefined}>
                    <button type="button" onClick={() => onSelect(v.verse)} aria-pressed={isSel} aria-label={`Select ${label}`} className="br-vnum-btn"><sup className="br-vnum">{v.verse}</sup></button>
                    {segments.map((seg, i) => seg.strongs
                      ? <button key={i} type="button" onClick={() => strongs!.onWord(v.verse, seg.strongs!)} aria-label={`${seg.text}, Strong's ${seg.strongs}`}
                          className={`br-sword ${strongs!.active === seg.strongs ? "is-active" : ""}`}>{seg.text}</button>
                      : <span key={i}>{seg.text}</span>)}
                    {rec?.bookmark && <BookmarkCheck size={13} className="inline ml-1 -mt-0.5 text-[var(--color-action-warm)]" aria-hidden="true" />}
                    {rec?.note && <StickyNote size={13} className="inline ml-1 -mt-0.5 text-[var(--color-hero)]" aria-hidden="true" />}
                    {" "}
                  </span>
                );
              }
              return (
                <span key={v.verse} id={`v${v.verse}`} className="scroll-mt-28">
                  <button type="button" onClick={() => onSelect(v.verse)} aria-pressed={isSel}
                    aria-label={label}
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
