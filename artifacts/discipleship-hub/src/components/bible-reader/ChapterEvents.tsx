import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { dateSpan, timelineHref, type EventIndex } from "@/components/bible-maps/maps-data";

const SHOWN = 6;

type Props = { baseUrl: string; index: EventIndex; chapterName: string; verse?: number; onVerse: (v: number) => void };

/** Timeline events whose passages fall in the current chapter, with approximate dates. */
export function ChapterEvents({ baseUrl, index, chapterName, verse, onVerse }: Props) {
  const [all, setAll] = useState(false);
  const rows = (index.chapters[chapterName] ?? []).map(([i, from, to]) => {
    const [id, title, year, years, kind] = index.events[i];
    return { id, title, kind, date: dateSpan(year, years), from, to };
  });
  if (rows.length === 0) {
    return <p className="mt-2 text-sm text-[var(--color-text-muted)]">No timeline events are linked to {chapterName}.</p>;
  }
  const shown = all ? rows : rows.slice(0, SHOWN);
  return (
    <>
      <ul className="mt-2 divide-y divide-[var(--color-border-soft)] border-y border-[var(--color-border-soft)]">
        {shown.map(r => {
          const here = verse !== undefined && verse >= r.from && verse <= r.to;
          const chip = r.from === r.to ? `v. ${r.from}` : `vv. ${r.from}–${r.to}`;
          return (
            <li key={r.id} className={`flex items-start justify-between gap-2 px-1 py-2 ${here ? "bg-[var(--color-surface-soft)]" : ""}`}>
              <a href={timelineHref(baseUrl, r.id)} className="group min-w-0 font-bold text-[var(--color-hero)]">
                <span className="block text-xs font-semibold text-[var(--color-text-muted)]">
                  {r.date}{r.kind === "period" ? " · Period" : r.kind === "life" ? " · Lifetime" : ""}
                </span>
                <span className="group-hover:underline">{r.title}</span>
                <ChevronRight size={15} aria-hidden="true" className="ml-0.5 inline align-[-2px]" />
              </a>
              <button type="button" onClick={() => onVerse(r.from)} aria-pressed={here}
                aria-label={`Select ${chapterName}:${r.from}${r.to !== r.from ? `–${r.to}` : ""}`}
                className="br-chip br-chip-btn mt-0.5 shrink-0 whitespace-nowrap">{chip}</button>
            </li>
          );
        })}
      </ul>
      {rows.length > SHOWN && (
        <button type="button" onClick={() => setAll(a => !a)} aria-expanded={all} className="mt-2 text-sm font-bold text-[var(--color-hero)] underline">
          {all ? "Show fewer events" : `Show all ${rows.length} events`}
        </button>
      )}
      <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">
        Dates are approximate and follow the traditional (largely Ussher) chronology; many are debated.{" "}
        <a className="underline" href={timelineHref(baseUrl)}>See the full Bible timeline</a>.
      </p>
    </>
  );
}
