import React from "react";
import { Link, useParams } from "wouter";
import { getChannel, getSubTopic, getNextSubTopic, SubTopicItem } from "@/data/channels";
import { FileText, Video, Smartphone, ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import NotFound from "./not-found";

function FormatButton({
  label,
  icon: Icon,
  href,
  accent,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  accent: string;
}) {
  const enabled = !!href && href !== "#";
  const className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wider transition-all";
  const enabledStyle = { backgroundColor: `${accent}15`, color: accent, border: `1px solid ${accent}33` };
  const disabledStyle = { backgroundColor: 'rgba(0,0,0,0.04)', color: '#9ca3af', border: '1px solid rgba(0,0,0,0.06)' };
  if (enabled) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className={`${className} hover:shadow-sm`}
        style={enabledStyle}
      >
        <Icon className="w-3 h-3" />
        {label}
      </a>
    );
  }
  return (
    <span
      className={`${className} cursor-not-allowed`}
      style={disabledStyle}
      title={`${label} coming soon`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}

function QuestionRow({ item, accent }: { item: SubTopicItem; accent: string }) {
  return (
    <li
      className="flex items-start gap-4 p-4 bg-white border border-border rounded hover:shadow-sm hover:border-primary/40 transition-all"
      data-testid={`item-${item.number}`}
    >
      <span
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-mono font-semibold text-sm"
        style={{ backgroundColor: `${accent}15`, color: accent }}
      >
        {item.number}
      </span>
      <div className="flex-grow min-w-0">
        <h3 className="text-base leading-snug mb-2.5" style={{ color: '#002f55' }}>
          {item.title}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <FormatButton label="PDF"   icon={FileText}   href={item.links?.pdf}   accent={accent} />
          <FormatButton label="Video" icon={Video}      href={item.links?.video} accent={accent} />
          <FormatButton label="App"   icon={Smartphone} href={item.links?.app}   accent={accent} />
        </div>
      </div>
    </li>
  );
}

export default function SubTopic() {
  const params = useParams();
  const channel = getChannel(params.channelId ?? "");
  const sub = getSubTopic(params.channelId ?? "", params.subId ?? "");
  const next = getNextSubTopic(params.channelId ?? "", params.subId ?? "");

  if (!channel || !sub) return <NotFound />;

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
          <h1 className="text-3xl md:text-5xl mb-2" style={{ color: '#ffffff', fontWeight: 500 }}>
            {sub.name}
          </h1>
          <p className="text-sm md:text-base" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Each question links to a PDF, video, or the JO App.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16 max-w-5xl">
        <Link href={`/channels/${channel.id}`} className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to {channel.name}
        </Link>

        {/* Numbered items with per-question PDF/Video/App buttons */}
        {hasItems ? (
          <>
            <div className="mb-6 pb-4 border-b border-border">
              <h2 className="text-2xl" style={{ color: '#002f55' }}>Questions Explored</h2>
              <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: '#de5b00' }}></div>
            </div>
            <ol className="space-y-2">
              {sub.items!.map(item => (
                <QuestionRow key={item.number} item={item} accent={channel.accentColor} />
              ))}
            </ol>
          </>
        ) : (
          <div className="py-16 text-center border border-dashed border-border rounded bg-white">
            <p className="text-muted-foreground mb-2">Resources for this topic are being prepared.</p>
            <p className="text-sm text-muted-foreground/70">Check back soon for books, playlists, and app content.</p>
          </div>
        )}

        {/* Next sub-topic CTA */}
        {next && (
          <Link
            href={`/channels/${channel.id}/${next.id}`}
            className="group block mt-12 p-6 md:p-7 rounded border-2 hover:shadow-md transition-all"
            style={{ borderColor: channel.accentColor, backgroundColor: `${channel.accentColor}06` }}
            data-testid="next-subtopic"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: channel.accentColor }}>
                  Up Next
                </div>
                <h3 className="text-xl md:text-2xl font-semibold group-hover:underline" style={{ color: '#002f55' }}>
                  {next.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Continue exploring {channel.shortName} Resources
                </p>
              </div>
              <div
                className="shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:translate-x-1"
                style={{ backgroundColor: channel.accentColor }}
              >
                <ArrowRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
