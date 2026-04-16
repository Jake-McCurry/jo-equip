import React from "react";

type FaviconProps = { size?: number };

// ── Option 1: Open book on navy with orange accent ──
function FaviconOpenBook({ size = 64 }: FaviconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-label="Open book favicon">
      <rect width="64" height="64" rx="10" fill="#002f55" />
      {/* Open book — two pages with a center spine */}
      <g stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M10 18 Q 22 14 32 20 L 32 50 Q 22 44 10 48 Z" />
        <path d="M54 18 Q 42 14 32 20 L 32 50 Q 42 44 54 48 Z" />
      </g>
      {/* Orange accent dot */}
      <circle cx="32" cy="20" r="3" fill="#de5b00" />
    </svg>
  );
}

// ── Option 2: "E" monogram on navy with orange underline ──
function FaviconMonogram({ size = 64 }: FaviconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-label="E monogram favicon">
      <rect width="64" height="64" rx="10" fill="#002f55" />
      <text
        x="50%"
        y="54%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily='"Helvetica Neue", Helvetica, Arial, sans-serif'
        fontWeight="700"
        fontSize="42"
        fill="#ffffff"
      >
        E
      </text>
      <rect x="18" y="48" width="28" height="3" rx="1.5" fill="#de5b00" />
    </svg>
  );
}

// ── Option 3: Cross + book combined ──
function FaviconCrossBook({ size = 64 }: FaviconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-label="Cross and book favicon">
      <rect width="64" height="64" rx="10" fill="#002f55" />
      {/* Cross above */}
      <g fill="#de5b00">
        <rect x="30" y="9" width="4" height="14" rx="1" />
        <rect x="25" y="13" width="14" height="4" rx="1" />
      </g>
      {/* Open book */}
      <g stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M10 30 Q 22 27 32 32 L 32 54 Q 22 49 10 52 Z" />
        <path d="M54 30 Q 42 27 32 32 L 32 54 Q 42 49 54 52 Z" />
      </g>
    </svg>
  );
}

// ── Option 4 (bonus): Stacked JO + book ──
function FaviconJOBook({ size = 64 }: FaviconProps) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-label="JO with book favicon">
      <rect width="64" height="64" rx="10" fill="#0083de" />
      <text
        x="50%"
        y="40%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily='"Helvetica Neue", Helvetica, Arial, sans-serif'
        fontWeight="700"
        fontSize="22"
        fill="#ffffff"
        letterSpacing="1"
      >
        JO
      </text>
      <rect x="14" y="44" width="36" height="2.5" rx="1.25" fill="#ffffff" opacity="0.55" />
      <text
        x="50%"
        y="64%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily='"Helvetica Neue", Helvetica, Arial, sans-serif'
        fontWeight="600"
        fontSize="11"
        fill="#de5b00"
        letterSpacing="2"
      >
        EQUIP
      </text>
    </svg>
  );
}

const OPTIONS = [
  {
    id: "open-book",
    name: "Open Book",
    label: "Recommended",
    description:
      "A simplified open book on navy, mirroring the EQUIP mark in your nav. Reads clearly as Scripture and equipping at any size. Carries all three brand colors.",
    Component: FaviconOpenBook,
  },
  {
    id: "monogram",
    name: "E Monogram",
    label: "Most minimal",
    description:
      'Bold white "E" on navy with an orange underline. Crisp and modern, instantly identifiable as Equip in a tab. Loses the explicit ministry metaphor.',
    Component: FaviconMonogram,
  },
  {
    id: "cross-book",
    name: "Cross + Book",
    label: "Most explicit",
    description:
      "Orange cross above an open book. The most overtly Christian and ministry-focused option. Slightly busier — readability dips at the smallest favicon size.",
    Component: FaviconCrossBook,
  },
  {
    id: "jo-equip",
    name: "JO · EQUIP (parent-brand)",
    label: "Tied to JesusOnline",
    description:
      'Brand blue tile with "JO" stacked over "EQUIP" in orange. Strongest visual connection to the parent JesusOnline.com favicon. Text-heavy at 16×16.',
    Component: FaviconJOBook,
  },
];

function TabPreview({ Component, name }: { Component: React.ComponentType<FaviconProps>; name: string }) {
  return (
    <div className="rounded overflow-hidden border border-border bg-white shadow-sm" style={{ width: 280 }}>
      {/* Browser chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2" style={{ backgroundColor: '#e5e7eb' }}>
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#ef4444' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#eab308' }} />
        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#22c55e' }} />
      </div>
      {/* Tab bar */}
      <div className="flex items-end px-2 pt-2" style={{ backgroundColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2 px-3 py-2 rounded-t-md bg-white max-w-full">
          <Component size={16} />
          <span className="text-xs truncate" style={{ color: '#374151', maxWidth: 180 }}>
            {name} · Equip
          </span>
        </div>
      </div>
      {/* URL bar */}
      <div className="px-3 py-2 bg-white border-t border-border">
        <div className="text-xs px-2 py-1 rounded truncate" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
          equip.jesusonline.com
        </div>
      </div>
    </div>
  );
}

export default function Brand() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-6xl">
      <div className="mb-12 max-w-3xl">
        <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#0083de' }}>
          Brand · Favicon Selection
        </div>
        <h1 className="text-4xl md:text-5xl mb-4" style={{ color: '#002f55' }}>
          Choose a favicon for Equip
        </h1>
        <div className="h-0.5 w-12 mb-5" style={{ backgroundColor: '#de5b00' }}></div>
        <p className="text-muted-foreground leading-relaxed text-lg">
          Each option is shown at favicon size (16×16), system tile size (32×32), Apple touch icon size (180×180),
          and rendered inside a real browser tab so you can see how it will actually appear.
        </p>
      </div>

      {/* Brand color reference strip */}
      <div className="mb-12 p-5 bg-white border border-border rounded">
        <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#002f55' }}>
          Brand palette
        </div>
        <div className="flex flex-wrap gap-4">
          {[
            { hex: '#002f55', name: 'Navy' },
            { hex: '#0083de', name: 'Primary Blue' },
            { hex: '#de5b00', name: 'Orange Accent' },
            { hex: '#ffffff', name: 'White', border: true },
          ].map(c => (
            <div key={c.hex} className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded"
                style={{ backgroundColor: c.hex, border: c.border ? '1px solid #e5e7eb' : 'none' }}
              />
              <div>
                <div className="text-sm font-medium" style={{ color: '#002f55' }}>{c.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{c.hex}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {OPTIONS.map(({ id, name, label, description, Component }) => (
          <div key={id} className="bg-white border border-border rounded overflow-hidden" data-testid={`favicon-option-${id}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

              {/* Left: Size showcase */}
              <div className="lg:col-span-7 p-8 border-b lg:border-b-0 lg:border-r border-border" style={{ backgroundColor: '#f9fafb' }}>
                <div className="flex flex-wrap items-end gap-10 mb-8">
                  <div className="text-center">
                    <Component size={180} />
                    <div className="mt-3 text-xs font-medium text-muted-foreground">180 × 180</div>
                    <div className="text-[10px] text-muted-foreground/70">Apple touch</div>
                  </div>
                  <div className="text-center">
                    <Component size={64} />
                    <div className="mt-3 text-xs font-medium text-muted-foreground">64 × 64</div>
                    <div className="text-[10px] text-muted-foreground/70">High-res tab</div>
                  </div>
                  <div className="text-center">
                    <Component size={32} />
                    <div className="mt-3 text-xs font-medium text-muted-foreground">32 × 32</div>
                    <div className="text-[10px] text-muted-foreground/70">Bookmark</div>
                  </div>
                  <div className="text-center">
                    <Component size={16} />
                    <div className="mt-3 text-xs font-medium text-muted-foreground">16 × 16</div>
                    <div className="text-[10px] text-muted-foreground/70">Browser tab</div>
                  </div>
                </div>

                {/* Real browser tab preview */}
                <div className="pt-6 border-t border-border">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#002f55' }}>
                    In a browser tab
                  </div>
                  <TabPreview Component={Component} name={name} />
                </div>
              </div>

              {/* Right: Info */}
              <div className="lg:col-span-5 p-8 flex flex-col">
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,131,222,0.1)', color: '#0083de' }}>
                    {label}
                  </span>
                </div>
                <h2 className="text-2xl mb-3" style={{ color: '#002f55' }}>
                  {name}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6 flex-grow">
                  {description}
                </p>

                {/* On-dark sample */}
                <div className="rounded p-5 flex items-center gap-4" style={{ backgroundColor: '#002f55' }}>
                  <Component size={48} />
                  <div>
                    <div className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      On navy backgrounds
                    </div>
                    <div className="text-sm" style={{ color: 'white' }}>Renders cleanly</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 p-6 rounded text-center" style={{ backgroundColor: 'rgba(0,131,222,0.06)', border: '1px dashed rgba(0,131,222,0.3)' }}>
        <p className="text-sm text-muted-foreground">
          Tell me which option you'd like (or any tweaks — different color, swap orange for blue, lighter background, etc.)
          and I'll generate the production favicon files (`.ico`, `.svg`, and Apple touch icon) and wire them up.
        </p>
      </div>
    </div>
  );
}
