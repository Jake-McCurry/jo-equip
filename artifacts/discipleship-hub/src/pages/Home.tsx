import React from "react";
import { Link } from "wouter";
import {
  ArrowRight, Globe, Info, ShieldCheck, Smartphone,
  Building2, Sprout, ShieldCheck as ShieldIcon,
} from "lucide-react";
import { channels } from "@/data/channels";

const CHANNEL_ICONS = {
  church: Building2,
  growth: Sprout,
  evidence: ShieldIcon,
} as const;

function SectionHeading({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "text-center mb-8" : "mb-2"}>
      <h2 className="text-3xl md:text-4xl" style={{ color: '#002f55' }}>{children}</h2>
      <div className={`mt-2 h-0.5 w-12 ${center ? 'mx-auto' : ''}`} style={{ backgroundColor: '#de5b00' }}></div>
    </div>
  );
}

export default function Home() {
  const scrollToWelcome = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("welcome");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="w-full">

      {/* ── Hero Section ── */}
      <section className="relative py-24 md:py-36 px-4 text-center overflow-hidden" style={{ backgroundColor: '#0083de' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#002f55' }}></div>
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#002f55' }}></div>
          <div className="absolute top-1/4 left-8 w-2 h-2 rounded-full opacity-20 bg-white"></div>
          <div className="absolute top-1/3 right-12 w-3 h-3 rounded-full opacity-15 bg-white"></div>
          <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full opacity-20 bg-white"></div>
        </div>

        <div className="relative container mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
            <Globe className="w-3.5 h-3.5" />
            Make and Multiply Disciples
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight" style={{ color: '#ffffff', fontWeight: 500 }}>
            JO EQUIP <br className="hidden md:block" /> Ministry Resources Hub
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.92)' }}>
            A free digital library of practical discipleship tools for pastors and leaders for enhanced ministry impact.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#welcome"
              onClick={scrollToWelcome}
              className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3.5 font-semibold rounded transition-colors"
              style={{ backgroundColor: '#ffffff', color: '#0083de' }}
              data-testid="button-welcome"
            >
              Welcome to JO EQUIP
              <ArrowRight className="w-4 h-4 ml-2" />
            </a>
          </div>
        </div>
      </section>

      {/* ── Brand Info Strip: ABOUT / BELIEFS / JO APP ── */}
      <section style={{ backgroundColor: '#002f55' }}>
        <div className="container mx-auto px-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
            <Link
              href="/more"
              className="group flex items-center justify-center gap-4 py-6 px-6 transition-colors hover:bg-white/5"
              data-testid="strip-about"
            >
              <div className="w-10 h-10 rounded shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,131,222,0.2)' }}>
                <Info className="w-5 h-5" style={{ color: '#0083de' }} />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>About</div>
                <div className="text-base font-medium text-white group-hover:underline">JesusOnline Ministries</div>
              </div>
            </Link>
            <Link
              href="/more"
              className="group flex items-center justify-center gap-4 py-6 px-6 transition-colors hover:bg-white/5"
              data-testid="strip-beliefs"
            >
              <div className="w-10 h-10 rounded shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,131,222,0.2)' }}>
                <ShieldCheck className="w-5 h-5" style={{ color: '#0083de' }} />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Beliefs</div>
                <div className="text-base font-medium text-white group-hover:underline">Statement of Faith</div>
              </div>
            </Link>
            <a
              href="https://jesusonline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-center gap-4 py-6 px-6 transition-colors hover:bg-white/5"
              data-testid="strip-jo-app"
            >
              <div className="w-10 h-10 rounded shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(222,91,0,0.2)' }}>
                <Smartphone className="w-5 h-5" style={{ color: '#de5b00' }} />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>JO App</div>
                <div className="text-base font-medium text-white group-hover:underline">Growing in Christ</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── Welcome to JO EQUIP ── */}
      <section id="welcome" className="py-20 md:py-24 bg-white scroll-mt-20">
        <div className="container mx-auto px-4 max-w-4xl">
          <SectionHeading center>Welcome to JO EQUIP</SectionHeading>
          <div className="space-y-5 text-lg leading-relaxed text-center max-w-3xl mx-auto" style={{ color: '#374151' }}>
            <p>
              Welcome to <strong style={{ color: '#002f55' }}>JO EQUIP</strong> — a free digital library of practical discipleship
              tools created specifically to help better equip pastors and ministry leaders for a greater ministry impact and
              fruitful discipleship multiplication.
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

      {/* ── Three Channels for Your Ministry Needs ── */}
      <section className="py-20 border-t border-border" style={{ backgroundColor: '#f4f7fb' }}>
        <div className="container mx-auto px-4">
          <SectionHeading center>Three Channels for Your Ministry Needs</SectionHeading>
          <p className="text-center text-muted-foreground text-base max-w-2xl mx-auto mb-12 mt-3">
            Resources grouped by purpose so you can quickly find exactly what you need for your ministry context.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {channels.map(channel => {
              const Icon = CHANNEL_ICONS[channel.id];
              return (
                <Link
                  key={channel.id}
                  href={`/channels/${channel.id}`}
                  className="group flex flex-col bg-white border border-border rounded overflow-hidden hover:shadow-lg transition-all"
                  data-testid={`home-channel-${channel.id}`}
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
                  <div className="p-7 flex flex-col flex-grow" style={{ borderTop: `4px solid ${channel.accentColor}` }}>
                    <h3 className="text-2xl mb-1 group-hover:text-primary transition-colors" style={{ color: '#002f55' }}>
                      {channel.name}
                    </h3>
                    <p className="text-sm font-medium mb-4" style={{ color: channel.accentColor }}>
                      {channel.tagline}
                    </p>
                    <p className="text-muted-foreground leading-relaxed text-sm mb-5 flex-grow">
                      {channel.description}
                    </p>
                    <span className="inline-flex items-center text-sm font-medium mt-auto" style={{ color: channel.accentColor }}>
                      Explore {channel.shortName}
                      <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link href="/channels" className="inline-flex items-center text-sm font-semibold transition-colors hover:underline" style={{ color: '#0083de' }}>
              View all channels & topics
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
