import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { refText } from "@/components/bible-maps/maps-data";
import { coversVerse, loadSermonIndex, preacherName, sermonHref, sermonsIndexHref } from "@/components/sermons/sermons-data";
import type { Location } from "./reader-utils";
import { Header, LoadState, useLoad } from "./WordStudyPanel";

type Props = { baseUrl: string; loc: Location; verse?: number; onVerse: (v: number | undefined) => void; onClose?: () => void };

export function SermonsPanel({ baseUrl, loc, verse, onVerse, onClose }: Props) {
  const { data, loading, error, retry } = useLoad(() => loadSermonIndex(baseUrl), [baseUrl]);
  const chapterName = `${loc.book} ${loc.chapter}`;
  const rows = useMemo(() => {
    if (!data) return [];
    return (data.chapters[chapterName] ?? [])
      .map(([i, ranges]) => {
        const [slug, title, number, year, refs, preacher] = data.sermons[i];
        return { slug, title, number, year, ranges, preacher: preacherName(preacher), ref: refs.map(([f, t]) => refText(f, t)).join("; ") };
      })
      .sort((a, b) => (a.ranges[0][0] - b.ranges[0][0]) || a.year - b.year || (Number(a.number.split("–")[0]) - Number(b.number.split("–")[0])));
  }, [data, chapterName]);
  const onVerseCount = verse ? rows.filter(r => coversVerse(r.ranges, verse)).length : 0;

  return (
    <div>
      <Header eyebrow="Classic sermons" title={`Sermons on ${chapterName}`} onClose={onClose} label="Close sermons" />
      <LoadState loading={loading} error={error} retry={retry} label="Loading sermons" />
      {data && rows.length === 0 && (
        <p className="mt-3 text-[17px] leading-7 text-[var(--color-text-muted)]">
          None of the classic sermons published here so far takes its text from {chapterName}.
        </p>
      )}
      {rows.length > 0 && (
        <>
          {verse && (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              {onVerseCount ? <>{onVerseCount === 1 ? "1 sermon is" : `${onVerseCount} sermons are`} on verse {verse} (highlighted).</> : <>No sermon here is on verse {verse}.</>}
            </p>
          )}
          <ul className="mt-3 divide-y divide-[var(--color-border-soft)] border-y border-[var(--color-border-soft)]">
            {rows.map(r => {
              const hit = !!verse && coversVerse(r.ranges, verse);
              const verses = r.ranges.filter(([a]) => a > 0);
              return (
                <li key={r.slug} className={`px-1 py-2.5 ${hit ? "bg-[var(--color-surface-soft)]" : ""}`}>
                  <a href={sermonHref(baseUrl, r.slug)} className="group block font-bold text-[var(--color-hero)]">
                    <span className="group-hover:underline">{r.title}</span>
                    <ChevronRight size={15} aria-hidden="true" className="ml-0.5 inline align-[-2px]" />
                  </a>
                  <p className="text-xs font-semibold text-[var(--color-text-muted)]">{r.preacher} · No. {r.number} · {r.year} · {r.ref}</p>
                  {verses.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-[var(--color-text-muted)]">Text</span>
                      {verses.map(([a, b]) => (
                        <button key={`${a}-${b}`} type="button" onClick={() => onVerse(a)} aria-pressed={a <= (verse ?? 0) && (verse ?? 0) <= b}
                          aria-label={`Select ${chapterName}:${a}`} className="br-chip br-chip-btn">{a === b ? a : `${a}–${b}`}</button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-4 text-sm"><a className="br-link font-semibold underline" href={sermonsIndexHref(baseUrl)}>Browse all classic sermons by book</a></p>
      <p className="mt-5 border-t border-[var(--color-border-soft)] pt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
        Sermons by C. H. Spurgeon, John Wesley, George Whitefield and Alexander Maclaren (public domain), checked word for word against scans of the original printings. Transcriptions:{" "}
        <a className="underline" href="https://github.com/lyteword/chspurgeon-sermons" target="_blank" rel="noopener noreferrer">lyteword/chspurgeon-sermons</a> (CC0),{" "}
        <a className="underline" href="https://ccel.org/ccel/wesley/sermons" target="_blank" rel="noopener noreferrer">CCEL</a> (Wesley’s later sermons) and{" "}
        <a className="underline" href="https://www.gutenberg.org/" target="_blank" rel="noopener noreferrer">Project Gutenberg</a> (Wesley’s Works, 1771; Whitefield’s Works, 1772; Maclaren’s Expositions).
        Bible links open the King James Version, which these preachers normally quote; each sermon page names its sources.
      </p>
    </div>
  );
}
