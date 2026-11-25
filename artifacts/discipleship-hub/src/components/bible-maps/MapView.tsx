import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as RPointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { MAP_SIZE } from "./maps-data";

export type Tier = "high" | "moderate" | "low" | "unknown";
export type MapMarker = { id: string; x: number; y: number; label: string; tier: Tier; href?: string; active?: boolean };
type View = { x: number; y: number; w: number };

type Props = {
  basemap: string;
  markers: MapMarker[];
  /** Accessible description of what the map shows. */
  label: string;
  /** Width / height of the map frame. */
  aspect?: number;
  /** Smallest initial span in map units (10 units = 1° of latitude). */
  minSpan?: number;
  /** Fit the initial view to these markers instead of all of them. */
  fitTo?: MapMarker[];
  /** Text labels: "all", only active markers, or none. */
  labels?: "all" | "active" | "none";
  interactive?: boolean;
  onMarker?: (m: MapMarker) => void;
  /** Changes whenever the caller wants the view re-fitted (for example a new search). */
  fitKey?: string;
};

const clampW = (w: number) => Math.min(Math.max(w, 4), MAP_SIZE.width * 1.2);

/** Fit to the markers, ignoring far outliers when there are many (Tarshish, India). */
function fit(markers: MapMarker[], aspect: number, minSpan: number): View {
  if (!markers.length) return { x: 380, y: 100, w: 260 }; // the eastern Mediterranean
  const xs = markers.map(m => m.x).sort((a, b) => a - b), ys = markers.map(m => m.y).sort((a, b) => a - b);
  const cut = markers.length >= 20 ? Math.floor(markers.length * 0.04) : 0;
  const x0 = xs[cut], x1 = xs[xs.length - 1 - cut], y0 = ys[cut], y1 = ys[ys.length - 1 - cut];
  let w = Math.max((x1 - x0) * 1.25, minSpan), h = Math.max((y1 - y0) * 1.25, minSpan / aspect);
  if (w / h < aspect) w = h * aspect;
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - w / aspect / 2, w };
}

const FILL: Record<Tier, string> = { high: "#004f86", moderate: "#2f86c8", low: "#ffffff", unknown: "#ffffff" };

export function MapView({ basemap, markers, label, aspect = 4 / 3, minSpan = 30, fitTo, labels = "none", interactive = true, onMarker, fitKey = "" }: Props) {
  const home = useMemo(() => fit(fitTo ?? markers, aspect, minSpan), // eslint-disable-next-line react-hooks/exhaustive-deps
    [fitKey, aspect, minSpan, interactive ? "" : markers]);
  const [view, setView] = useState<View>(home);
  useEffect(() => setView(home), [home]);
  const ref = useRef<SVGSVGElement>(null);
  const [px, setPx] = useState(480); // rendered width in CSS pixels, for marker and label sizing
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setPx(e.contentRect.width || 480));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = view.w / aspect;
  const unit = view.w / px; // map units per CSS pixel

  const zoom = (f: number, cx = view.x + view.w / 2, cy = view.y + h / 2) => setView(v => {
    const w = clampW(v.w * f);
    return { w, x: cx - (cx - v.x) * (w / v.w), y: cy - (cy - v.y) * (w / v.w) };
  });
  const pan = (dx: number, dy: number) => setView(v => ({ ...v, x: v.x + dx * v.w, y: v.y + dy * v.w }));

  // Drag to pan, two fingers to pinch.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const moved = useRef(false);
  const onDown = (e: RPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
  };
  const onMove = (e: RPointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const pts = [...pointers.current.entries()];
    if (pts.length === 1) {
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      if (!moved.current && Math.hypot(dx, dy) < 4) return;
      if (!moved.current) e.currentTarget.setPointerCapture(e.pointerId);
      moved.current = true;
      setView(v => ({ ...v, x: v.x - dx * (v.w / px), y: v.y - dy * (v.w / px) }));
    } else if (pts.length === 2) {
      const other = pts.find(([id]) => id !== e.pointerId)![1];
      const before = Math.hypot(prev.x - other.x, prev.y - other.y), after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
      if (before > 0 && after > 0) {
        const r = e.currentTarget.getBoundingClientRect();
        const mx = ((prev.x + other.x) / 2 - r.left) / r.width, my = ((prev.y + other.y) / 2 - r.top) / r.height;
        moved.current = true;
        setView(v => {
          const w = clampW(v.w * before / after), cx = v.x + mx * v.w, cy = v.y + my * (v.w / aspect);
          return { w, x: cx - mx * w, y: cy - my * (w / aspect) };
        });
      }
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onUp = (e: RPointerEvent<SVGSVGElement>) => { pointers.current.delete(e.pointerId); };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const k: Record<string, () => void> = {
      ArrowLeft: () => pan(-0.15, 0), ArrowRight: () => pan(0.15, 0), ArrowUp: () => pan(0, -0.15), ArrowDown: () => pan(0, 0.15),
      "+": () => zoom(0.7), "=": () => zoom(0.7), "-": () => zoom(1 / 0.7),
    };
    if (k[e.key] && e.target === e.currentTarget) { e.preventDefault(); k[e.key](); }
  };

  const ordered = useMemo(() => [...markers].sort((a, b) => Number(!!a.active) - Number(!!b.active)), [markers]);
  const r = (m: MapMarker) => (m.active ? 7 : markers.length > 200 ? 3.5 : 5) * unit;
  const font = 12.5 * unit;
  // Greedy label placement: active markers first, then skip any label that would overlap one already placed.
  const labelled = new Set<string>();
  if (labels !== "none") {
    const boxes: number[][] = [];
    for (const m of [...ordered].reverse()) {
      if (labels === "active" && !m.active) continue;
      const x0 = m.x + r(m) + 2 * unit, y0 = m.y - font * 0.7;
      const box = [x0, y0, x0 + m.label.length * font * 0.56, y0 + font * 1.3];
      if (!m.active && boxes.some(o => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue;
      boxes.push(box); labelled.add(m.id);
    }
  }
  const showLabel = (m: MapMarker) => labelled.has(m.id);

  return (
    <div className="bm-map">
      <svg ref={ref} viewBox={`${view.x} ${view.y} ${view.w} ${h}`} style={{ aspectRatio: String(aspect) }}
        role={interactive ? "application" : "img"} aria-roledescription={interactive ? "map" : undefined} aria-label={label}
        tabIndex={interactive ? 0 : undefined} onKeyDown={interactive ? onKey : undefined}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onDoubleClick={interactive ? e => {
          const rc = e.currentTarget.getBoundingClientRect();
          zoom(0.6, view.x + ((e.clientX - rc.left) / rc.width) * view.w, view.y + ((e.clientY - rc.top) / rc.height) * h);
        } : undefined}
        className={interactive ? "bm-svg is-interactive" : "bm-svg"}>
        <rect x={-2000} y={-2000} width={MAP_SIZE.width + 4000} height={MAP_SIZE.height + 4000} fill="#d4e9f7" />
        <use href={`${basemap}#bm-base`} />
        {ordered.map(m => {
          const dot = (
            <>
              <circle cx={m.x} cy={m.y} r={r(m)} fill={m.active ? "#c45100" : FILL[m.tier]}
                stroke={m.active ? "#ffffff" : m.tier === "low" ? "#c45100" : "#ffffff"} strokeWidth={(m.tier === "low" && !m.active ? 1.6 : 1.2) * unit}
                strokeDasharray={m.tier === "low" && !m.active ? `${2 * unit} ${1.5 * unit}` : undefined} />
              {showLabel(m) && (
                <text x={m.x + r(m) + 3 * unit} y={m.y + font * 0.35} fontSize={font} className="bm-label" strokeWidth={3 * unit}>{m.label}</text>
              )}
            </>
          );
          const title = <title>{m.label}</title>;
          if (m.href) return <a key={m.id} href={m.href} aria-label={m.label} onClick={e => { if (moved.current) e.preventDefault(); }}>{title}{dot}</a>;
          if (onMarker) return (
            <g key={m.id} role="button" tabIndex={0} aria-label={m.label} className="bm-marker"
              onClick={() => { if (!moved.current) onMarker(m); }} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onMarker(m); } }}>
              {title}{dot}
            </g>
          );
          return <g key={m.id}>{title}{dot}</g>;
        })}
      </svg>
      {interactive && (
        <div className="bm-controls">
          <button type="button" onClick={() => zoom(0.7)} aria-label="Zoom in"><Plus size={18} aria-hidden="true" /></button>
          <button type="button" onClick={() => zoom(1 / 0.7)} aria-label="Zoom out"><Minus size={18} aria-hidden="true" /></button>
          <button type="button" onClick={() => setView(home)} aria-label="Reset the map view"><RotateCcw size={16} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  );
}

export function MapLegend() {
  return (
    <ul className="bm-legend" aria-label="Map key">
      <li><span className="bm-key" style={{ background: FILL.high }} /> High confidence</li>
      <li><span className="bm-key" style={{ background: FILL.moderate }} /> Moderate</li>
      <li><span className="bm-key is-low" /> Low (location uncertain)</li>
    </ul>
  );
}
