import React, { useState } from "react";
import { Link, useParams } from "wouter";
import { getChannel, getSubTopic, ResourceFormat } from "@/data/channels";
import { Book, ListVideo, Smartphone, ArrowLeft, ChevronRight, Clock } from "lucide-react";
import NotFound from "./not-found";

const FORMAT_META: Record<ResourceFormat, { label: string; icon: React.ComponentType<{ className?: string }>; description: string }> = {
  book: { label: "Book", icon: Book, description: "Read in-depth chapters covering this topic." },
  playlist: { label: "Playlist", icon: ListVideo, description: "Watch a video series exploring each question." },
  app: { label: "App", icon: Smartphone, description: "Open the JO mobile app for the interactive experience." },
};

export default function SubTopic() {
  const params = useParams();
  const channel = getChannel(params.channelId ?? "");
  const sub = getSubTopic(params.channelId ?? "", params.subId ?? "");
  const [activeFormat, setActiveFormat] = useState<ResourceFormat | null>(null);

  if (!channel || !sub) return <NotFound />;

  const formats = sub.formats ?? [];
  const hasItems = (sub.items?.length ?? 0) > 0;

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: channel.gradient }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 18px)",
          }}
        />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.08)', filter: 'blur(20px)' }} />
        <div className="container mx-auto px-4 py-12 md:py-16 relative max-w-5xl">
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm mb-6 flex-wrap gap-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
            <Link href="/channels" className="hover:text-white transition-colors">Channels</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href={`/channels/${channel.id}`} className="hover:text-white transition-colors">{channel.shortName}</Link>
            <ChevronRight className="w-3 h-3" />
            <span style={{ color: 'rgba(255,255,255,0.95)' }}>{sub.name}</span>
          </nav>

          <div className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
            {channel.name}
          </div>
          <h1 className="text-3xl md:text-5xl mb-5" style={{ color: '#ffffff', fontWeight: 500 }}>
            {sub.name}
          </h1>

          {/* Format tabs */}
          {formats.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {formats.map(fmt => {
                const meta = FORMAT_META[fmt];
                const FmtIcon = meta.icon;
                const isActive = activeFormat === fmt;
                return (
                  <button
                    key={fmt}
                    onClick={() => setActiveFormat(isActive ? null : fmt)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded transition-all text-sm font-medium"
                    style={{
                      backgroundColor: isActive ? '#ffffff' : 'rgba(255,255,255,0.15)',
                      color: isActive ? channel.accentColor : '#ffffff',
                      border: `1px solid ${isActive ? '#ffffff' : 'rgba(255,255,255,0.25)'}`,
                    }}
                    data-testid={`format-${fmt}`}
                  >
                    <FmtIcon className="w-4 h-4" />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
        <Link href={`/channels/${channel.id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to {channel.name}
        </Link>

        {/* Active format details */}
        {activeFormat && (
          <div className="mb-10 p-6 rounded border" style={{ backgroundColor: `${channel.accentColor}08`, borderColor: `${channel.accentColor}33` }}>
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: channel.accentColor }}>
                {React.createElement(FORMAT_META[activeFormat].icon, { className: "w-5 h-5 text-white" })}
              </div>
              <div className="flex-grow">
                <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: channel.accentColor }}>
                  {FORMAT_META[activeFormat].label} Format
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {FORMAT_META[activeFormat].description}
                </p>
                <div className="inline-flex items-center gap-2 text-xs" style={{ color: '#6b7280' }}>
                  <Clock className="w-3.5 h-3.5" />
                  Linked content coming soon
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Numbered items */}
        {hasItems ? (
          <>
            <div className="mb-6 pb-4 border-b border-border">
              <h2 className="text-2xl" style={{ color: '#002f55' }}>Questions Explored</h2>
              <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: '#de5b00' }}></div>
            </div>
            <ol className="space-y-2">
              {sub.items!.map(item => (
                <li
                  key={item.number}
                  className="flex items-start gap-4 p-4 bg-white border border-border rounded hover:shadow-sm hover:border-primary/40 transition-all group cursor-pointer"
                  data-testid={`item-${sub.id}-${item.number}`}
                >
                  <span
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-mono font-semibold text-sm"
                    style={{ backgroundColor: `${channel.accentColor}15`, color: channel.accentColor }}
                  >
                    {item.number}
                  </span>
                  <div className="flex-grow min-w-0 pt-1.5">
                    <h3 className="text-base leading-snug group-hover:text-primary transition-colors" style={{ color: '#002f55' }}>
                      {item.title}
                    </h3>
                  </div>
                  <ChevronRight className="shrink-0 w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all mt-2" />
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="py-16 text-center border border-dashed border-border rounded bg-white">
            <p className="text-muted-foreground mb-2">Resources for this topic are being prepared.</p>
            <p className="text-sm text-muted-foreground/70">Check back soon for books, playlists, and app content.</p>
          </div>
        )}
      </div>
    </div>
  );
}
