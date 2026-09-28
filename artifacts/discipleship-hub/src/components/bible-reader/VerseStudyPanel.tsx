import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck, Check, Share2, X } from "lucide-react";
import { HIGHLIGHTS, refLabel, shareUrl, translationLabel, type Location } from "./reader-utils";
import type { Highlight, VerseRecord } from "./study-storage";

type Props = {
  loc: Location;
  verse: number;
  text: string;
  record?: VerseRecord;
  onChange: (patch: Partial<Pick<VerseRecord, "bookmark" | "highlight" | "note">>) => boolean;
  onClose: () => void;
  compact?: boolean;
};

export function VerseStudyPanel({ loc, verse, text, record, onChange, onClose, compact }: Props) {
  const [note, setNote] = useState(record?.note ?? "");
  const [status, setStatus] = useState("");
  useEffect(() => { setNote(record?.note ?? ""); setStatus(""); }, [loc.book, loc.chapter, loc.translation, verse, record?.note]);

  const flash = (m: string) => { setStatus(m); window.setTimeout(() => setStatus(s => (s === m ? "" : s)), 2200); };
  const share = async () => {
    const url = shareUrl({ ...loc, verse });
    const title = `${refLabel(loc.book, loc.chapter, verse)} (${translationLabel(loc.translation)})`;
    try {
      if (navigator.share) { await navigator.share({ title, text: `"${text}" ${title}`, url }); return; }
      await navigator.clipboard.writeText(url); flash("Link copied");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      flash("Could not share. Copy the address bar instead.");
    }
  };
  const bookmarked = !!record?.bookmark;

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="br-eyebrow">Selected verse</p>
          <h2 className="mt-0.5 text-xl text-[var(--color-hero)]">{refLabel(loc.book, loc.chapter, verse)} <span className="text-sm font-semibold text-[var(--color-text-muted)]">{translationLabel(loc.translation)}</span></h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close verse panel" className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)]"><X size={18} /></button>
      </div>
      <blockquote className={`mt-2 border-l-4 border-[var(--color-accent)] pl-3 text-[17px] leading-7 ${compact ? "max-h-[7.5rem] overflow-y-auto" : ""}`}>{text}</blockquote>

      <fieldset className="mt-4">
        <legend className="br-label">Highlight</legend>
        <div className="mt-1.5 flex items-center gap-2.5">
          {HIGHLIGHTS.map(h => {
            const on = record?.highlight === h.value;
            return (
              <button key={String(h.value)} type="button" aria-pressed={on} aria-label={`${h.label} highlight${on ? " (remove)" : ""}`} title={h.label}
                onClick={() => onChange({ highlight: on ? undefined : (h.value as Highlight) })}
                className="grid h-9 w-9 place-items-center rounded-full border-2 transition-transform hover:scale-110"
                style={{ backgroundColor: h.swatch, borderColor: on ? "var(--color-text)" : "transparent", boxShadow: "inset 0 0 0 2px rgba(255,253,251,.7)" }}>
                {on && <Check size={16} color="#fffdfb" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        <button type="button" onClick={() => onChange({ bookmark: !bookmarked })} aria-pressed={bookmarked} className={`br-link inline-flex items-center gap-1.5 ${bookmarked ? "!text-[var(--color-action-warm)]" : ""}`}>
          {bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />} {bookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        <button type="button" onClick={share} className="br-link inline-flex items-center gap-1.5"><Share2 size={17} /> Share</button>
      </div>

      <label className="br-label mt-4" htmlFor={`br-note-${compact ? "m" : "d"}`}>Note</label>
      <textarea id={`br-note-${compact ? "m" : "d"}`} value={note} onChange={e => setNote(e.target.value)} rows={compact ? 2 : 5}
        placeholder="What is God saying to you here?" className="br-input mt-1 w-full resize-y" />
      <div className="mt-2 flex items-center gap-3">
        <button type="button" disabled={note === (record?.note ?? "")} onClick={() => { if (onChange({ note })) flash("Note saved"); }} className="br-btn-primary disabled:opacity-50">Save note</button>
        <span role="status" className="text-sm font-semibold text-[var(--color-hero)]">{status}</span>
      </div>
    </div>
  );
}
