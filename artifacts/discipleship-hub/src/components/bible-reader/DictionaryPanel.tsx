import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, MapPin } from "lucide-react";
import { placeHref } from "@/components/bible-maps/maps-data";
import { dictEntryHref, dictIndexHref, loadDictEntry, loadDictIndex } from "@/components/bible-dictionary/dictionary-data";
import type { DictPara, DictSeg } from "@/data/bible-dictionary";
import { inReader, locationOf, rangeLabel } from "./CommentaryPanel";
import type { Location } from "./reader-utils";
import { Header, LoadState, useLoad } from "./WordStudyPanel";

type Props = {
  baseUrl: string; loc: Location; verse?: number;
  onVerse: (v: number | undefined) => void; onClose?: () => void;
  hrefFor: (l: Location) => string; onGo: (l: Location) => void;
};

export function DictionaryPanel({ baseUrl, loc, verse, onVerse, onClose, hrefFor, onGo }: Props) {
  const { data, loading, error, retry } = useLoad(() => loadDictIndex(baseUrl), [baseUrl]);
  const [open, setOpen] = useState<string | null>(null);
  const chapterName = `${loc.book} ${loc.chapter}`;
  useEffect(() => setOpen(null), [chapterName]);
  const rows = useMemo(() => (data?.chapters[chapterName] ?? []).map(([i, verses]) => ({ slug: data!.entries[i][0], title: data!.entries[i][1], verses })), [data, chapterName]);
  const shown = verse ? rows.filter(r => r.verses.includes(verse)) : rows;
  const titleOf = useMemo(() => new Map(data?.entries ?? []), [data]);

  if (open) {
    return <EntryView baseUrl={baseUrl} slug={open} title={titleOf.get(open) ?? open} places={data?.places[open] ?? []} onBack={() => setOpen(null)} onOpen={setOpen} onClose={onClose} hrefFor={hrefFor} onGo={onGo} />;
  }
  return (
    <div>
      <Header eyebrow="Easton’s Bible Dictionary" title={`Names and terms in ${chapterName}`} onClose={onClose} label="Close dictionary" />
      <LoadState loading={loading} error={error} retry={retry} label="Loading dictionary" />
      {data && rows.length === 0 && (
        <p className="mt-3 text-[17px] leading-7 text-[var(--color-text-muted)]">No dictionary entries were matched to {chapterName}.</p>
      )}
      {rows.length > 0 && (
        <>
          <p className="mt-3 text-sm text-[var(--color-text-muted)]">
            {verse
              ? <>{shown.length ? `${shown.length} of ${rows.length} entries apply to verse ${verse}.` : `No entry here applies to verse ${verse}.`}{" "}
                  <button type="button" className="br-link font-semibold underline" onClick={() => onVerse(undefined)}>Show the whole chapter</button></>
              : <>{rows.length} {rows.length === 1 ? "entry" : "entries"} for people, places and terms in this chapter. Select a verse to narrow the list.</>}
          </p>
          <ul className="mt-3 divide-y divide-[var(--color-border-soft)] border-y border-[var(--color-border-soft)]">
            {shown.map(r => (
              <li key={r.slug} className="flex items-baseline justify-between gap-3 px-1 py-2">
                <button type="button" onClick={() => setOpen(r.slug)} className="group min-w-0 text-left font-bold text-[var(--color-hero)]">
                  <span className="group-hover:underline">{r.title}</span>
                  <ChevronRight size={15} aria-hidden="true" className="ml-0.5 inline align-[-2px]" />
                </button>
                <span className="shrink-0 text-xs font-semibold text-[var(--color-text-muted)]">
                  {r.verses.length > 6 ? `${r.verses.length} verses` : `v. ${r.verses.join(", ")}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-4 text-sm"><a className="br-link font-semibold underline" href={dictIndexHref(baseUrl)}>Browse or search the whole dictionary</a></p>
      <DictionaryCredits />
    </div>
  );
}

function EntryView({ baseUrl, slug, title, places, onBack, onOpen, onClose, hrefFor, onGo }: {
  baseUrl: string; slug: string; title: string; places: string[]; onBack: () => void; onOpen: (s: string) => void; onClose?: () => void;
  hrefFor: (l: Location) => string; onGo: (l: Location) => void;
}) {
  const { data, loading, error, retry } = useLoad(() => loadDictEntry(baseUrl, slug), [baseUrl, slug]);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [slug]);
  return (
    <div>
      <button type="button" onClick={onBack} className="br-link mb-2 inline-flex items-center gap-1 text-sm font-semibold"><ArrowLeft size={15} aria-hidden="true" /> All entries for this chapter</button>
      <Header eyebrow="Easton’s Bible Dictionary" title={title} onClose={onClose} label="Close dictionary" headingRef={heading} />
      <LoadState loading={loading} error={error} retry={retry} label="Loading dictionary entry" />
      {data && <EntryParas paras={data} render={(seg, i) => <SegLink key={i} seg={seg} baseUrl={baseUrl} onOpen={onOpen} hrefFor={hrefFor} onGo={onGo} />} />}
      {data && places.map(p => (
        <p key={p} className="mt-3 text-sm"><a className="br-link inline-flex items-center gap-1 font-semibold underline" href={placeHref(baseUrl, p)}><MapPin size={15} aria-hidden="true" /> See {title} on the Bible map</a></p>
      ))}
      <p className="mt-4 text-sm"><a className="br-link font-semibold underline" href={dictEntryHref(baseUrl, slug)}>Open “{title}” on its own page</a></p>
      <DictionaryCredits />
    </div>
  );
}

export function EntryParas({ paras, render }: { paras: DictPara[]; render: (s: DictSeg, i: number) => ReactNode }) {
  return (
    <div className="br-cm">
      {paras.map((p, i) => p[0] === "h"
        ? <h3 key={i}>{(p.slice(1) as DictSeg[]).map(render)}</h3>
        : <p key={i}>{(p.slice(1) as DictSeg[]).map(render)}</p>)}
    </div>
  );
}

function SegLink({ seg, baseUrl, onOpen, hrefFor, onGo }: { seg: DictSeg; baseUrl: string; onOpen: (s: string) => void; hrefFor: (l: Location) => string; onGo: (l: Location) => void }) {
  if (typeof seg === "string") return <>{seg}</>;
  const text = seg[1] & 1 ? <em>{seg[0]}</em> : seg[0];
  if (seg.length === 2) return <>{text}</>;
  if (typeof seg[2] === "string") {
    const slug = seg[2];
    return <a href={dictEntryHref(baseUrl, slug)} onClick={inReader(() => onOpen(slug))} className="br-cm-ref">{text}</a>;
  }
  const from = seg[2], to = seg.length === 4 ? (seg[3] as number) : undefined;
  const target = locationOf(from, "kjv");
  return <a href={hrefFor(target)} onClick={inReader(() => onGo(target))} className="br-cm-ref" title={`${rangeLabel(from, to)} (KJV)`}>{text}</a>;
}

export function DictionaryCredits() {
  return (
    <p className="mt-5 border-t border-[var(--color-border-soft)] pt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
      M. G. Easton, <cite>Illustrated Bible Dictionary</cite>, 3rd edition (1897), public domain, from the{" "}
      <a className="underline" href="https://www.crosswire.org/sword/modules/ModInfo.jsp?modName=Easton" target="_blank" rel="noopener noreferrer">CrossWire SWORD module</a> (CCEL transcription).
      Bible links open the King James Version, which Easton quotes. It reflects the scholarship of its time.
    </p>
  );
}
