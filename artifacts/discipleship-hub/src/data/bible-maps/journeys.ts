// Journeys drawn on the interactive map (/bible/maps), built at page-build time
// from the same verse-ordered route definitions as the printable Bible Atlas
// (scripts/data/bible-atlas-maps.mjs), so the two always agree. Server-only:
// it reads the full place data; the page passes the small result to the island.
import { ATLAS } from "../../../scripts/data/bible-atlas-maps.mjs";
import { parseOsis, validRange } from "../../../scripts/lib/scripture-refs.mjs";
import { project } from "@/components/bible-maps/map-projection";
import { placeBySlug } from "./index";

type StopDef = [string, string?] | { lon: number; lat: number };
type AtlasDef = {
  slug: string; title: string; period: string; notes: string;
  routes: { name: string; color: string; proposed?: boolean; stops: StopDef[] }[];
  placeLabels?: Record<string, string>;
};

export type JourneyRef = [number] | [number, number];
export type JourneyStop = { n: number; slug: string; label: string; x: number; y: number; ref: JourneyRef | null };
export type Journey = {
  id: string;
  title: string;
  /** The route's name on the atlas map, e.g. "Traditional southern route". */
  routeName: string;
  testament: "ot" | "nt";
  period: string;
  /** True when the route is one of several scholarly proposals (drawn dashed). */
  proposed: boolean;
  note: string;
  /** Printable atlas map with the same route. */
  atlas: string;
  color: string;
  /** Projected line through the stops and the unlabeled waypoints between them. */
  points: [number, number][];
  stops: JourneyStop[];
};

// Which atlas routes become selectable journeys, in menu order.
const PICK: { id: string; atlas: string; route: number; title: string; testament: "ot" | "nt"; period?: string }[] = [
  { id: "abraham", atlas: "world-of-the-patriarchs", route: 0, title: "Abraham's journey to Canaan", testament: "ot" },
  { id: "exodus", atlas: "exodus", route: 0, title: "The Exodus and the wilderness", testament: "ot" },
  { id: "israel-to-assyria", atlas: "exile-and-return", route: 0, title: "Israel taken to Assyria", testament: "ot", period: "722 BC" },
  { id: "judah-to-babylon", atlas: "exile-and-return", route: 1, title: "Judah taken to Babylon", testament: "ot", period: "586 BC" },
  { id: "return-from-exile", atlas: "exile-and-return", route: 2, title: "The return from exile", testament: "ot", period: "538 BC onward" },
  { id: "paul-first-journey", atlas: "pauls-first-journey", route: 0, title: "Paul's first missionary journey", testament: "nt" },
  { id: "paul-second-journey", atlas: "pauls-second-journey", route: 0, title: "Paul's second missionary journey", testament: "nt" },
  { id: "paul-third-journey", atlas: "pauls-third-journey", route: 0, title: "Paul's third missionary journey", testament: "nt" },
  { id: "paul-to-rome", atlas: "pauls-voyage-to-rome", route: 0, title: "Paul's voyage to Rome", testament: "nt" },
];

const r2 = (n: number) => Math.round(n * 100) / 100;
const fail = (msg: string): never => { throw new Error(`journeys: ${msg}`); };
const refOf = (osis?: string): JourneyRef | null => {
  if (!osis) return null;
  const r = parseOsis(osis) as { from: number; to?: number } | null;
  if (!r || !validRange(r.from, r.to)) fail(`bad reference ${osis}`);
  return r!.to ? [r!.from, r!.to] : [r!.from];
};

const atlas = ATLAS as unknown as AtlasDef[];

export const journeys: Journey[] = PICK.map(({ id, atlas: slug, route, title, testament, period }) => {
  const map = atlas.find(m => m.slug === slug) ?? fail(`unknown atlas map ${slug}`);
  const r = map.routes[route] ?? fail(`${slug} has no route ${route}`);
  const points: [number, number][] = [];
  const stops: JourneyStop[] = [];
  for (const s of r.stops) {
    if (!Array.isArray(s)) { const [x, y] = project(s.lon, s.lat); points.push([r2(x), r2(y)]); continue; }
    const [placeSlug, osis] = s;
    const p = placeBySlug.get(placeSlug) ?? fail(`${id}: unknown place ${placeSlug}`);
    if (p.lon === null || p.lat === null) fail(`${id}: ${placeSlug} has no location`);
    const [x, y] = project(p.lon!, p.lat!);
    points.push([r2(x), r2(y)]);
    stops.push({ n: stops.length + 1, slug: placeSlug, label: map.placeLabels?.[placeSlug] ?? p.name, x: r2(x), y: r2(y), ref: refOf(osis) });
  }
  return { id, title, routeName: r.name, testament, period: period ?? map.period, proposed: !!r.proposed, note: map.notes, atlas: slug, color: r.color, points, stops };
});

export const journeyForAtlas = (atlasSlug: string) => journeys.find(j => j.atlas === atlasSlug) ?? null;
