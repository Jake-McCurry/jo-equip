import React from "react";
import { Link, useParams } from "wouter";
import { getChannel, getSubTopicsByChannel } from "@/data/channels";
import { Building2, Sprout, ShieldCheck, ArrowRight, Book, ListVideo, Smartphone } from "lucide-react";
import NotFound from "./not-found";

const CHANNEL_ICONS = {
  church: Building2,
  growth: Sprout,
  evidence: ShieldCheck,
} as const;

const FORMAT_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  book: { label: "Book", icon: Book },
  playlist: { label: "Playlist", icon: ListVideo },
  app: { label: "App", icon: Smartphone },
};

export default function ChannelDetail() {
  const params = useParams();
  const channel = getChannel(params.channelId ?? "");

  if (!channel) return <NotFound />;

  const subs = getSubTopicsByChannel(channel.id);
  const Icon = CHANNEL_ICONS[channel.id];

  return (
    <div>
      {/* Channel hero */}
      <div className="relative overflow-hidden" style={{ background: channel.gradient }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 18px)",
          }}
        />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.08)', filter: 'blur(20px)' }} />
        <div className="container mx-auto px-4 py-14 md:py-20 relative">
          <Link href="/channels" className="inline-flex items-center text-sm font-medium mb-6 transition-colors" style={{ color: 'rgba(255,255,255,0.85)' }}>
            ← All Channels
          </Link>
          <div className="flex items-start gap-5 max-w-3xl">
            <div className="shrink-0 w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Icon className="w-7 h-7" strokeWidth={1.5} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl mb-3" style={{ color: '#ffffff', fontWeight: 500 }}>{channel.name}</h1>
              <p className="text-lg leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.95)' }}>
                {channel.tagline}
              </p>
              <p className="leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {channel.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div>
            <h2 className="text-2xl" style={{ color: '#002f55' }}>Topics in this Channel</h2>
            <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: '#de5b00' }}></div>
          </div>
          <span className="text-sm text-muted-foreground">{subs.length} topics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subs.map((sub, idx) => (
            <Link
              key={sub.id}
              href={`/channels/${channel.id}/${sub.id}`}
              className="group flex flex-col bg-white border border-border rounded p-5 hover:shadow-md transition-all"
              style={{ borderLeft: `4px solid ${channel.accentColor}` }}
              data-testid={`card-subtopic-${sub.id}`}
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <span
                  className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
                  style={{ color: channel.accentColor, backgroundColor: `${channel.accentColor}11` }}
                >
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <ArrowRight className="w-4 h-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold mb-3 group-hover:text-primary transition-colors leading-snug" style={{ color: '#002f55' }}>
                {sub.name}
              </h3>
              {sub.formats && sub.formats.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-auto pt-3 border-t border-border/50">
                  {sub.formats.map(fmt => {
                    const meta = FORMAT_META[fmt];
                    const FmtIcon = meta.icon;
                    return (
                      <span key={fmt} className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ color: '#002f55', backgroundColor: 'rgba(0,47,85,0.06)' }}>
                        <FmtIcon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    );
                  })}
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
