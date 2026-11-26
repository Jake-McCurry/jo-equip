import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Printer, Search, X } from "lucide-react";
import { BOOKS } from "@/components/bible-reader/catalog";
import type { Journey } from "@/data/bible-maps/journeys";
import { MapLegend, MapView, type MapMarker, type MapRoute } from "./MapView";
import { basemapUrl, confidenceOf, loadPlaces, placeHref, placeTypes, readerHref, refText, type PlaceRow } from "./maps-data";
import "./bible-maps.css";

type Conf = "all" | "moderate" | "high";
const PAGE = 60;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const trim = (u: string) => u.replace(/\/$/, "");
/** "Stop 3: Lystra" / "Stops 8 and 10: Lystra" */
function stopTitle(j: Journey, slug: string, fallback: string) {
  const list = j.stops.filter(s => s.slug === slug);
  if (!list.length) return fallback;
  const nums = list.map(s => s.n);
  const n = nums.length === 1 ? `Stop ${nums[0]}` : `Stops ${nums.slice(0, -1).join(", ")} and ${nums[nums.length - 1]}`;
  return `${n}: ${list[0].label}`;
}

export default function MapExplorer({ baseUrl, journeys = [] }: { baseUrl: string; journeys?: Journey[] }) {
  const [rows, setRows] = useState<PlaceRow[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [q, setQ] = useState("");
  const [book, setBook] = useState(0);
  const [conf, setConf] = useState<Conf>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [ready, setReady] = useState(false);
  const [journeyId, setJourneyId] = useState("");
  const journeyMap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setQ(p.get("q") ?? "");
    const b = BOOKS.findIndex(x => x.name.toLowerCase() === (p.get("book") ?? "").toLowerCase());
    setBook(b + 1);
    const c = p.get("confidence");
    setConf(c === "high" || c === "moderate" ? c : "all");
    setSelected(p.get("place"));
    const j = p.get("journey") ?? "";
    setJourneyId(journeys.some(x => x.id === j) ? j : "");
    setReady(true);
  }, []);
  useEffect(() => {
    let live = true;
    setError("");
    loadPlaces(baseUrl).then(r => live && setRows(r)).catch(e => live && setError(e instanceof Error ? e.message : "The place list could not be loaded."));
    return () => { live = false; };
  }, [baseUrl, attempt]);
  // Keep the URL shareable without adding history entries for every keystroke.
  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (book) p.set("book", BOOKS[book - 1].name);
    if (conf !== "all") p.set("confidence", conf);
    if (journeyId) p.set("journey", journeyId);
    if (selected) p.set("place", selected);
    const s = p.toString();
    window.history.replaceState(null, "", window.location.pathname + (s ? `?${s}` : ""));
  }, [q, book, conf, selected, ready, journeyId]);
  useEffect(() => setLimit(PAGE), [q, book, conf]);

  const results = useMemo(() => {
    if (!rows) return [];
    const nq = norm(q);
    const min = conf === "high" ? 700 : conf === "moderate" ? 300 : -Infinity;
    return rows.filter(r => (!nq || norm(r[1]).includes(nq)) && (!book || r[6].includes(book)) && (r[2] === null ? min === -Infinity : r[4] >= min))
      .sort((a, b) => (nq ? Number(!norm(b[1]).startsWith(nq)) - Number(!norm(a[1]).startsWith(nq)) : 0) || a[1].localeCompare(b[1]));
  }, [rows, q, book, conf]);
  const sel = rows?.find(r => r[0] === selected) ?? null;
  const markers: MapMarker[] = useMemo(() => results.filter(r => r[2] !== null).map(r => ({
    id: r[0], x: r[2]!, y: r[3]!, label: r[1], tier: confidenceOf(r[4]).tier, active: r[0] === selected,
  })), [results, selected]);
  const journey = journeys.find(j => j.id === journeyId) ?? null;
  // One numbered marker per place; a place visited twice lists both stop numbers in its label.
  const stopMarkers: MapMarker[] = useMemo(() => {
    if (!journey) return [];
    const by = new Map<string, MapMarker & { nums: number[] }>();
    for (const s of journey.stops) {
      const prev = by.get(s.slug);
      if (prev) { prev.nums.push(s.n); continue; }
      by.set(s.slug, { id: s.slug, x: s.x, y: s.y, label: s.label, tier: "high", num: String(s.n), nums: [s.n] });
    }
    return [...by.values()].map(({ nums, ...m }) => ({ ...m, label: nums.length > 1 ? `${m.label} · ${nums.join(", ")}` : m.label, active: m.id === selected }));
  }, [journey, selected]);
  const routes: MapRoute[] = journey ? [{ points: journey.points, color: journey.color, dashed: journey.proposed }] : [];
  const pickJourney = (id: string) => { setJourneyId(id); setSelected(null); };
  const fitKey = journey ? `journey:${journey.id}` : `${q}|${book}|${conf}`;
  const filtered = !!(q.trim() || book || conf !== "all");

  return (
    <div className="mx-explorer">
      {journeys.length > 0 && (
        <label className="mx-field mx-journey">
          <span>Show a journey</span>
          <select value={journeyId} onChange={e => pickJourney(e.target.value)}>
            <option value="">None: show all places</option>
            <optgroup label="Old Testament">
              {journeys.filter(j => j.testament === "ot").map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </optgroup>
            <optgroup label="New Testament">
              {journeys.filter(j => j.testament === "nt").map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </optgroup>
          </select>
        </label>
      )}
      {!journey && <form className="mx-filters" role="search" onSubmit={e => e.preventDefault()}>
        <label className="mx-field mx-search">
          <span>Find a place</span>
          <span className="mx-input">
            <Search size={17} aria-hidden="true" />
            <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Bethel, Jordan River, Corinth…" autoComplete="off" />
          </span>
        </label>
        <label className="mx-field">
          <span>Mentioned in</span>
          <select value={book} onChange={e => setBook(Number(e.target.value))}>
            <option value={0}>Any book</option>
            {BOOKS.map((b, i) => <option key={b.name} value={i + 1}>{b.name}</option>)}
          </select>
        </label>
        <label className="mx-field">
          <span>Confidence</span>
          <select value={conf} onChange={e => setConf(e.target.value as Conf)}>
            <option value="all">Any (show uncertain)</option>
            <option value="moderate">Moderate or high</option>
            <option value="high">High only</option>
          </select>
        </label>
      </form>}
      {error && (
        <div role="alert" className="mx-error">{error} <button type="button" onClick={() => setAttempt(a => a + 1)}>Try again</button></div>
      )}
      {!rows && !error && <div role="status" aria-label="Loading the map" className="mx-skel" />}
      {rows && journey && (
        <div className="mx-layout mx-journey-layout">
          <div className="mx-mapcol" ref={journeyMap}>
            <MapView basemap={basemapUrl(baseUrl)} markers={stopMarkers} routes={routes} aspect={4 / 3} minSpan={8} fitKey={fitKey}
              labels="all" onMarker={m => setSelected(m.id)}
              label={`Map of ${journey.title}: ${journey.stops.map(s => s.label).join(", ")}. The numbered list beside the map has the same stops as links.`} />
            <ul className="bm-legend" aria-label="Map key">
              <li>
                <span className={`mx-line${journey.proposed ? " is-dashed" : ""}`} style={{ borderTopColor: journey.color }} aria-hidden="true" />
                {journey.proposed ? "One proposed route (the route is debated)" : "Approximate route: places in the order Scripture names them"}
              </li>
              <li><span className="mx-numkey" aria-hidden="true">1</span> Stop, in order</li>
            </ul>
            {sel && (
              <div className="mx-card" aria-live="polite">
                <button type="button" className="mx-card-close" onClick={() => setSelected(null)} aria-label="Clear the selected stop"><X size={16} /></button>
                <p className="mx-card-title">{stopTitle(journey, sel[0], sel[1])}</p>
                <p className="mx-card-meta">
                  <span className={`bm-conf is-${confidenceOf(sel[2] === null ? 0 : sel[4]).tier}`}>{confidenceOf(sel[2] === null ? 0 : sel[4]).label}</span>{" "}
                  {journey.stops.filter(s => s.slug === sel[0] && s.ref).map((s, i) => (
                    <span key={s.n}>{i ? ", " : ""}<a className="mx-card-ref" href={readerHref(baseUrl, s.ref![0])}>{refText(s.ref![0], s.ref![1])}</a></span>
                  ))}
                </p>
                <a href={placeHref(baseUrl, sel[0])} className="mx-card-link">Verses, identification and history <ChevronRight size={16} aria-hidden="true" /></a>
              </div>
            )}
          </div>
          <div className="mx-listcol">
            <div className="mx-jhead">
              <h2 className="mx-jtitle">{journey.title}</h2>
              <p className="mx-jmeta">
                {journey.period}{" "}
                <span className={`bm-conf ${journey.proposed ? "is-low" : "is-moderate"}`}>{journey.proposed ? "Route debated" : "Approximate"}</span>
              </p>
              {journey.routeName && journey.routeName !== journey.title && <p className="mx-jroute">Shown: {journey.routeName}{journey.proposed ? " (one proposal)" : ""}</p>}
              <p className="mx-jnote">{journey.note}</p>
            </div>
            <ol className="mx-stops" aria-label={`Stops on ${journey.title}`}>
              {journey.stops.map(s => (
                <li key={s.n} className={s.slug === selected ? "is-selected" : ""}>
                  <span className="mx-stopnum" aria-hidden="true">{s.n}</span>
                  <span className="mx-stopbody">
                    <a href={placeHref(baseUrl, s.slug)} className="mx-name">{s.label}</a>
                    {s.ref && <a href={readerHref(baseUrl, s.ref[0])} className="mx-stopref">{refText(s.ref[0], s.ref[1])}</a>}
                  </span>
                  <button type="button" className="mx-stopshow" onClick={() => { setSelected(s.slug); journeyMap.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }} aria-label={`Show ${s.label} on the map`}>Show</button>
                </li>
              ))}
            </ol>
            <div className="mx-jactions">
              <a className="mx-more mx-jbtn" href={`${trim(baseUrl)}/bible/atlas/${journey.atlas}`}><Printer size={16} aria-hidden="true" /> Printable atlas map</a>
              <button type="button" className="mx-more" onClick={() => pickJourney("")}>Show all places</button>
            </div>
          </div>
        </div>
      )}
      {rows && !journey && (
        <>
          <p className="mx-count" role="status">
            {results.length.toLocaleString()} {results.length === 1 ? "place" : "places"}{filtered ? " match" : ""}
            {book ? ` in ${BOOKS[book - 1].name}` : ""}
            {results.length > markers.length ? ` (${results.length - markers.length} without a known location)` : ""}
          </p>
          <div className="mx-layout">
            <div className="mx-mapcol">
              <MapView basemap={basemapUrl(baseUrl)} markers={markers} aspect={4 / 3} minSpan={20} fitKey={fitKey}
                labels={markers.length <= 80 ? "all" : "active"} onMarker={m => setSelected(m.id)}
                label={`Map of ${markers.length} Bible places. Use the list for the same places as links.`} />
              <MapLegend />
              {sel && (
                <div className="mx-card" aria-live="polite">
                  <button type="button" className="mx-card-close" onClick={() => setSelected(null)} aria-label="Clear the selected place"><X size={16} /></button>
                  <p className="mx-card-title">{sel[1]}</p>
                  <p className="mx-card-meta">
                    <span className={`bm-conf is-${confidenceOf(sel[2] === null ? 0 : sel[4]).tier}`}>{confidenceOf(sel[2] === null ? 0 : sel[4]).label}</span>{" "}
                    <span className="capitalize">{placeTypes(sel[5]).slice(0, 3).join(", ")}</span>
                  </p>
                  <a href={placeHref(baseUrl, sel[0])} className="mx-card-link">Verses, identification and history <ChevronRight size={16} aria-hidden="true" /></a>
                </div>
              )}
            </div>
            <div className="mx-listcol">
              {results.length === 0 ? (
                <p className="mx-empty">No places match. Try a shorter name or another book.</p>
              ) : (
                <ul className="mx-list" aria-label="Matching places">
                  {results.slice(0, limit).map(r => {
                    const c = confidenceOf(r[2] === null ? 0 : r[4]);
                    return (
                      <li key={r[0]} className={r[0] === selected ? "is-selected" : ""}>
                        <a href={placeHref(baseUrl, r[0])}>
                          <span className="mx-name">{r[1]}</span>
                          <span className="mx-types">{placeTypes(r[5]).slice(0, 2).join(", ")}</span>
                        </a>
                        <span className={`bm-conf is-${c.tier}`}>{c.tier === "unknown" ? "Unknown" : c.tier[0].toUpperCase() + c.tier.slice(1)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              {results.length > limit && (
                <button type="button" className="mx-more" onClick={() => setLimit(l => l + PAGE * 2)}>
                  Show more ({(results.length - limit).toLocaleString()} left)
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
