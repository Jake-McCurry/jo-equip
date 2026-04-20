import React from "react";
import { Link } from "wouter";
import { channels, getSubTopicsByChannel } from "@/data/channels";
import { ChannelArt } from "@/components/ChannelArt";
import { ArrowRight, ChevronRight } from "lucide-react";

export default function Welcome() {
  return (
    <div>
      {/* Welcome copy */}
      <section className="bg-white">
        <div className="container mx-auto px-4 py-14 md:py-20 max-w-4xl">
          <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#0083de' }}>
            Welcome
          </div>
          <h1 className="text-4xl md:text-5xl mb-4" style={{ color: '#002f55' }}>
            Welcome to JO EQUIP
          </h1>
          <div className="h-0.5 w-12 mb-7" style={{ backgroundColor: '#de5b00' }}></div>
          <div className="space-y-5 text-lg leading-relaxed" style={{ color: '#374151' }}>
            <p>
              Welcome to <strong style={{ color: '#002f55' }}>JO EQUIP</strong> — a free digital library of practical
              discipleship tools created specifically to help better equip pastors and ministry leaders for a greater
              ministry impact and fruitful discipleship multiplication.
            </p>
            <p>
              If you are a disciple-maker passionate about seeing God's Kingdom expand through spiritual multiplication,
              JO EQUIP is your free, trusted resource to help you strengthen His Church and advance His Kingdom.
            </p>
            <p>
              These carefully selected resources, grouped in the following channels, are designed to help you serve with
              greater effectiveness and spiritual vitality in fulfilling Christ's Great Commission.
            </p>
          </div>
        </div>
      </section>

      {/* Three Channels columns */}
      <section className="py-14 md:py-20 border-t border-border" style={{ backgroundColor: '#f4f7fb' }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl" style={{ color: '#002f55' }}>
              Three Channels of Resources for Your Ministry Needs
            </h2>
            <div className="mt-2 h-0.5 w-12 mx-auto" style={{ backgroundColor: '#de5b00' }}></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {channels.map(channel => {
              const subs = getSubTopicsByChannel(channel.id);
              return (
                <Link
                  key={channel.id}
                  href={`/channels/${channel.id}`}
                  className="group flex flex-col bg-white border border-border rounded overflow-hidden hover:shadow-lg transition-all"
                  data-testid={`welcome-channel-${channel.id}`}
                >
                  <div
                    className="relative aspect-[16/9] overflow-hidden"
                    style={{ background: channel.gradient }}
                  >
                    <ChannelArt channel={channel.id} className="absolute inset-0" />
                  </div>
                  <div className="p-6 flex flex-col flex-grow" style={{ borderTop: `4px solid ${channel.accentColor}` }}>
                    <h3 className="text-xl mb-1 group-hover:text-primary transition-colors" style={{ color: '#002f55' }}>
                      {channel.name}
                    </h3>
                    <p className="text-sm font-medium mb-4" style={{ color: channel.accentColor }}>
                      {channel.tagline}
                    </p>
                    <ul className="space-y-1.5 mb-4 flex-grow">
                      {subs.map(s => (
                        <li key={s.id} className="flex items-start gap-2 text-sm" style={{ color: '#4b5563' }}>
                          <ChevronRight className="w-3.5 h-3.5 mt-1 shrink-0" style={{ color: channel.accentColor }} />
                          <span className="leading-snug">{s.name}</span>
                        </li>
                      ))}
                    </ul>
                    <span className="inline-flex items-center text-sm font-semibold mt-auto pt-3 border-t border-border/60" style={{ color: channel.accentColor }}>
                      Explore {channel.shortName}
                      <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
