import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { MapView, type MapMarker } from "@/components/bible-maps/MapView";
import { basemapUrl, confidenceOf, loadChapterIndex, loadEventIndex, loadPlaces, placeHref, placeTypes } from "@/components/bible-maps/maps-data";
import "@/components/bible-maps/bible-maps.css";
import type { Location } from "./reader-utils";
import { Header, LoadState, useLoad } from "./WordStudyPanel";
import { ChapterEvents } from "./ChapterEvents";

type Props = { baseUrl: string; loc: Location; verse?: number; onVerse: (v: number | undefined) => void; onClose?: () => void };

export function PlacesPanel({ baseUrl, loc, verse, onVerse, onClose }: Props) {
  const { data, loading, error, retry } = useLoad(
    () => Promise.all([loadPlaces(baseUrl), loadChapterIndex(baseUrl), loadEventIndex(baseUrl)]),
    [baseUrl],
  );
  const [focus, setFocus] = useState<string | null>(null);
  const rows = useMemo(() => {
    if (!data) return [];
    const [places, chapters] = data;
    return (chapters[`${loc.book} ${loc.chapter}`] ?? []).map(([i, verses]) => {
      const [slug, label, x, y, score, types] = places[i];
      return { slug, label, x, y, verses, conf: confidenceOf(x === null ? 0 : score), types: placeTypes(types) };
    });
  }, [data, loc.book, loc.chapter]);
  const inVerse = verse ? rows.filter(r => r.verses.includes(verse)) : [];
  const markers: MapMarker[] = rows.filter(r => r.x !== null).map(r => ({
    id: r.slug, x: r.x!, y: r.y!, label: r.label, tier: r.conf.tier, href: placeHref(baseUrl, r.slug),
    active: r.slug === focus || (!focus && inVerse.some(p => p.slug === r.slug)),
  }));
  const chapterName = `${loc.book} ${loc.chapter}`;

  return (
    <div>
      <Header eyebrow="Places and dates" title={`Where and when: ${chapterName}`} onClose={onClose} label="Close places" />
      <LoadState loading={loading} error={error} retry={retry} label="Loading places and dates" />
      {data && (
        <section aria-labelledby="br-when-h">
          <h3 id="br-when-h" className="br-label mt-3">When it happened</h3>
          <ChapterEvents baseUrl={baseUrl} index={data[2]} chapterName={chapterName} verse={verse} onVerse={onVerse} />
        </section>
      )}
      {data && <h3 className="br-label mt-5">Places mentioned</h3>}
      {data && rows.length === 0 && (
        <p className="mt-2 text-[17px] leading-7 text-[var(--color-text-muted)]">No named places are mentioned in {chapterName}.</p>
      )}
      {rows.length > 0 && (
        <>
          {markers.length > 0 && (
            <div className="mt-3">
              <MapView basemap={basemapUrl(baseUrl)} markers={markers} fitKey={chapterName} minSpan={18} aspect={4 / 3}
                labels="all" label={`Map of the places mentioned in ${chapterName}`} />
            </div>
          )}
          {verse && (
            <p className="mt-3 text-sm text-[var(--color-text-muted)]">
              {inVerse.length ? <>Verse {verse} mentions {inVerse.map(p => p.label).join(", ")}.</> : <>Verse {verse} does not mention a place.</>}
            </p>
          )}
          <ul className="mt-3 divide-y divide-[var(--color-border-soft)] border-y border-[var(--color-border-soft)]">
            {rows.map(r => (
              <li key={r.slug} className={`py-2.5 ${verse && r.verses.includes(verse) ? "bg-[var(--color-surface-soft)]" : ""}`}
                onMouseEnter={() => setFocus(r.slug)} onMouseLeave={() => setFocus(null)} onFocus={() => setFocus(r.slug)} onBlur={() => setFocus(null)}>
                <div className="flex items-start justify-between gap-2 px-1">
                  <a href={placeHref(baseUrl, r.slug)} className="group min-w-0 font-bold text-[var(--color-hero)]">
                    <span className="group-hover:underline">{r.label}</span>
                    <ChevronRight size={15} aria-hidden="true" className="ml-0.5 inline align-[-2px]" />
                    <span className="block text-xs font-semibold capitalize text-[var(--color-text-muted)]">{r.types.slice(0, 3).join(", ")}</span>
                  </a>
                  <span className={`bm-conf is-${r.conf.tier} mt-0.5`}>{r.conf.label}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
                  <span className="text-xs font-semibold text-[var(--color-text-muted)]">Verse{r.verses.length > 1 ? "s" : ""}</span>
                  {r.verses.map(v => (
                    <button key={v} type="button" onClick={() => onVerse(v)} aria-pressed={v === verse}
                      aria-label={`Select ${chapterName}:${v}`} className="br-chip br-chip-btn">{v}</button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      <MapCredits />
    </div>
  );
}

export function MapCredits() {
  return (
    <p className="mt-5 border-t border-[var(--color-border-soft)] pt-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
      Places and confidence scores:{" "}
      <a className="underline" href="https://www.openbible.info/geo/" target="_blank" rel="noopener noreferrer">OpenBible.info Bible Geocoding Data</a>{" "}
      (<a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>).
      Events and dates:{" "}
      <a className="underline" href="https://theographic.netlify.app/" target="_blank" rel="noopener noreferrer">Theographic Bible Metadata</a>{" "}
      (<a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>).
      Base map: <a className="underline" href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth</a> (public domain).
      Confidence reflects how sure current scholarship is of each identification; modern coastlines and rivers are shown.
    </p>
  );
}
