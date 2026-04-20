import React from "react";
import { Link } from "wouter";
import { channels, getSubTopicsByChannel } from "@/data/channels";
import { Building2, Sprout, ShieldCheck, ArrowRight } from "lucide-react";

const ICONS = {
  church: Building2,
  growth: Sprout,
  evidence: ShieldCheck,
} as const;

export default function Channels() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#0083de' }}>
          Resource Channels
        </div>
        <h1 className="text-4xl md:text-5xl mb-4" style={{ color: '#002f55' }}>
          Three Channels for Your Ministry Needs
        </h1>
        <div className="h-0.5 w-12 mb-5" style={{ backgroundColor: '#de5b00' }}></div>
        <p className="text-muted-foreground leading-relaxed text-lg">
          Carefully selected, free resources grouped to help you serve with greater
          effectiveness and spiritual vitality in fulfilling Christ's Great Commission.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {channels.map(channel => {
          const Icon = ICONS[channel.id];
          const subCount = getSubTopicsByChannel(channel.id).length;
          return (
            <Link
              key={channel.id}
              href={`/channels/${channel.id}`}
              className="group flex flex-col bg-white border border-border rounded overflow-hidden hover:shadow-lg transition-all"
              data-testid={`card-channel-${channel.id}`}
            >
              <div
                className="relative aspect-[16/9] flex items-center justify-center overflow-hidden"
                style={{ background: channel.gradient }}
              >
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 14px)",
                  }}
                />
                <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.1)', filter: 'blur(10px)' }} />
                <Icon className="w-14 h-14 relative z-10" strokeWidth={1.3} style={{ color: 'rgba(255,255,255,0.95)' }} />
              </div>

              <div className="p-6 flex flex-col flex-grow" style={{ borderTop: `4px solid ${channel.accentColor}` }}>
                <h2 className="text-2xl mb-1 group-hover:text-primary transition-colors" style={{ color: '#002f55' }}>
                  {channel.name}
                </h2>
                <p className="text-sm font-medium mb-4" style={{ color: channel.accentColor }}>
                  {channel.tagline}
                </p>
                <p className="text-muted-foreground leading-relaxed text-sm mb-5 flex-grow">
                  {channel.description}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                  <span className="text-xs font-semibold uppercase tracking-wider px-2 py-1 rounded" style={{ color: channel.accentColor, backgroundColor: `${channel.accentColor}11` }}>
                    {subCount} Topics
                  </span>
                  <span className="inline-flex items-center text-sm font-medium" style={{ color: channel.accentColor }}>
                    Explore
                    <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
