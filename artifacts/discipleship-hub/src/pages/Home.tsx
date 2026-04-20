import React from "react";
import { Link } from "wouter";
import { ArrowRight, Globe, Users2, BookOpen, Smartphone } from "lucide-react";
import { channels } from "@/data/channels";
import { ChannelArt } from "@/components/ChannelArt";

function SectionHeading({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={center ? "text-center mb-6" : "mb-2"}>
      <h2 className="text-3xl md:text-4xl" style={{ color: '#002f55' }}>{children}</h2>
      <div className={`mt-2 h-0.5 w-12 ${center ? 'mx-auto' : ''}`} style={{ backgroundColor: '#de5b00' }}></div>
    </div>
  );
}

/* Banner item — switched emphasis: big primary word, small caption beneath */
function StripItem({
  primary,
  caption,
  icon: Icon,
  iconBg,
  iconColor,
  href,
  external,
  testId,
}: {
  primary: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  href: string;
  external?: boolean;
  testId: string;
}) {
  const inner = (
    <>
      <div className="w-11 h-11 rounded shrink-0 flex items-center justify-center" style={{ backgroundColor: iconBg }}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-left">
        <div className="text-lg md:text-xl font-semibold text-white leading-tight tracking-wide group-hover:underline" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
          {primary}
        </div>
        <div className="text-[11px] mt-1 font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {caption}
        </div>
      </div>
    </>
  );
  const className = "group flex items-center justify-center gap-4 py-6 px-6 transition-colors hover:bg-white/5";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} data-testid={testId} style={{ color: iconColor }}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className} data-testid={testId} style={{ color: iconColor }}>
      {inner}
    </Link>
  );
}

export default function Home() {
  return (
    <div className="w-full">

      {/* ── Hero — tighter padding to tease the next blade ── */}
      <section className="relative py-12 md:py-20 px-4 text-center overflow-hidden" style={{ backgroundColor: '#0083de' }}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#002f55' }}></div>
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#002f55' }}></div>
          <div className="absolute top-1/4 left-8 w-2 h-2 rounded-full opacity-20 bg-white"></div>
          <div className="absolute top-1/3 right-12 w-3 h-3 rounded-full opacity-15 bg-white"></div>
          <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full opacity-20 bg-white"></div>
        </div>

        <div className="relative container mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
            <Globe className="w-3.5 h-3.5" />
            Make and Multiply Disciples
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl mb-3 leading-tight" style={{ color: '#ffffff', fontWeight: 500 }}>
            JO EQUIP
          </h1>
          <div className="text-xl md:text-2xl mb-5 font-medium" style={{ color: 'rgba(255,255,255,0.92)' }}>
            Ministry Resources Hub
          </div>
          <p className="text-base md:text-lg mb-7 max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.92)' }}>
            A free digital library of practical discipleship tools for pastors and leaders for enhanced ministry impact.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/welcome"
              className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 font-semibold rounded transition-colors"
              style={{ backgroundColor: '#ffffff', color: '#0083de' }}
              data-testid="button-welcome"
            >
              Welcome to JO EQUIP
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Brand Info Strip — emphasis switched (big word, small caption) ── */}
      <section style={{ backgroundColor: '#002f55' }}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
            <StripItem
              primary="About"
              caption="JesusOnline Ministries"
              icon={Users2}
              iconBg="rgba(0,131,222,0.2)"
              iconColor="#0083de"
              href="/more"
              testId="strip-about"
            />
            <StripItem
              primary="Beliefs"
              caption="Statement of Faith"
              icon={BookOpen}
              iconBg="rgba(0,131,222,0.2)"
              iconColor="#0083de"
              href="/more"
              testId="strip-beliefs"
            />
            <StripItem
              primary="JO App"
              caption="Growing in Christ"
              icon={Smartphone}
              iconBg="rgba(222,91,0,0.2)"
              iconColor="#de5b00"
              href="https://jesusonline.com"
              external
              testId="strip-jo-app"
            />
          </div>
        </div>
      </section>

      {/* ── Welcome teaser — tightened to lead the eye into the channels blade ── */}
      <section className="py-12 md:py-14 bg-white">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <SectionHeading center>Welcome to JO EQUIP</SectionHeading>
          <p className="text-lg leading-relaxed mb-5" style={{ color: '#374151' }}>
            A free digital library of practical discipleship tools, carefully selected and grouped into <strong style={{ color: '#002f55' }}>three channels</strong> to
            help pastors and ministry leaders fulfill Christ's Great Commission with greater effectiveness.
          </p>
          <Link href="/welcome" className="inline-flex items-center text-sm font-semibold hover:underline" style={{ color: '#0083de' }}>
            Read the full welcome
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>
      </section>

      {/* ── Three Channels for Your Ministry Needs ── */}
      <section className="py-16 md:py-20 border-t border-border" style={{ backgroundColor: '#f4f7fb' }}>
        <div className="container mx-auto px-4">
          <SectionHeading center>Three Channels for Your Ministry Needs</SectionHeading>
          <p className="text-center text-muted-foreground text-base max-w-2xl mx-auto mb-10 mt-3">
            Resources grouped by purpose so you can quickly find exactly what you need for your ministry context.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {channels.map(channel => (
              <Link
                key={channel.id}
                href={`/channels/${channel.id}`}
                className="group flex flex-col bg-white border border-border rounded overflow-hidden hover:shadow-lg transition-all"
                data-testid={`home-channel-${channel.id}`}
              >
                <div className="relative aspect-[16/9] overflow-hidden" style={{ background: channel.gradient }}>
                  <ChannelArt channel={channel.id} className="absolute inset-0" />
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
            ))}
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
