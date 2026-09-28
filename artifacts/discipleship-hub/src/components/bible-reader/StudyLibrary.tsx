import { useState } from "react";
import { ArrowRight, Trash2 } from "lucide-react";
import { getNextChapter } from "./catalog";
import { HIGHLIGHTS, refLabel, translationLabel, type Location } from "./reader-utils";
import type { ChapterRecord, StudyData, Translation } from "./study-storage";

type Props = {
  study: StudyData;
  loc: Location;
  initialLastRead?: ChapterRecord;
  onGo: (loc: Location) => void;
  onRemoveChapter: (c: ChapterRecord) => void;
};

export function StudyLibrary({ study, loc, initialLastRead, onGo, onRemoveChapter }: Props) {
  const [tab, setTab] = useState<"verses" | "chapters">("verses");
  let cont: { book: string; chapter: number; translation: Translation } | null = null;
  if (initialLastRead) {
    const onIt = initialLastRead.book === loc.book && initialLastRead.chapter === loc.chapter;
    if (!onIt) cont = initialLastRead;
    else {
      const n = getNextChapter(loc.book, loc.chapter);
      cont = n ? { ...n, translation: loc.translation } : null;
    }
  }
  const verses = [...study.verses].reverse();

  return (
    <section aria-labelledby="br-lib" className="br-card p-5">
      {cont && (
        <button type="button" onClick={() => onGo({ book: cont!.book, chapter: cont!.chapter, translation: cont!.translation })}
          className="mb-5 flex w-full items-center justify-between rounded bg-[var(--color-structure)] px-4 py-3 text-left text-[#fffdfb] hover:bg-[var(--color-hero)]">
          <span><span className="block text-xs font-bold uppercase tracking-[.18em] text-[var(--warm-200)]">Continue reading</span><span className="text-lg font-bold">{refLabel(cont.book, cont.chapter)}</span></span>
          <ArrowRight size={20} />
        </button>
      )}
      <h2 id="br-lib" className="text-lg">My study</h2>
      <div role="tablist" className="mt-2 flex border-b border-[var(--color-border-soft)]">
        {(["verses", "chapters"] as const).map(t => (
          <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-bold capitalize ${tab === t ? "border-[var(--color-accent)] text-[var(--color-text)]" : "border-transparent text-[var(--color-text-muted)]"}`}>
            {t} ({t === "verses" ? study.verses.length : study.chapters.length})
          </button>
        ))}
      </div>
      <div className="br-scroll mt-2 max-h-[22rem] overflow-y-auto">
        {tab === "verses" && (verses.length === 0 ? (
          <p className="py-6 text-sm leading-relaxed text-[var(--color-text-muted)]">Select any verse to highlight, bookmark, or write a note. It will appear here.</p>
        ) : verses.map(v => {
          const sw = HIGHLIGHTS.find(h => h.value === v.highlight)?.swatch;
          return (
            <button key={`${v.book}-${v.chapter}-${v.verse}-${v.translation}`} type="button" onClick={() => onGo({ book: v.book, chapter: v.chapter, verse: v.verse, translation: v.translation })}
              className="block w-full border-b border-[var(--color-border-soft)] py-2.5 text-left hover:bg-[var(--color-surface-soft)]">
              <span className="flex items-center gap-2 text-sm font-bold text-[var(--color-hero)]">
                {sw && <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: sw }} />}
                {refLabel(v.book, v.chapter, v.verse)} <span className="font-semibold text-[var(--color-text-muted)]">{translationLabel(v.translation)}</span>
                {v.bookmark && <span className="text-xs text-[var(--color-action-warm)]">Bookmarked</span>}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-sm text-[var(--color-text)]">{v.text}</span>
              {v.note && <span className="mt-0.5 line-clamp-2 block text-xs italic text-[var(--color-text-muted)]">Note: {v.note}</span>}
            </button>
          );
        }))}
        {tab === "chapters" && (study.chapters.length === 0 ? (
          <p className="py-6 text-sm leading-relaxed text-[var(--color-text-muted)]">Use "Save chapter" above a passage to keep it here.</p>
        ) : study.chapters.map(c => (
          <div key={`${c.book}-${c.chapter}-${c.translation}`} className="flex items-center justify-between border-b border-[var(--color-border-soft)] py-2">
            <button type="button" onClick={() => onGo({ book: c.book, chapter: c.chapter, translation: c.translation })} className="br-link">{refLabel(c.book, c.chapter)} <span className="text-[var(--color-text-muted)]">{translationLabel(c.translation)}</span></button>
            <button type="button" onClick={() => onRemoveChapter(c)} aria-label={`Remove ${refLabel(c.book, c.chapter)}`} className="rounded p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-action-warm)]"><Trash2 size={15} /></button>
          </div>
        )))}
      </div>
    </section>
  );
}
