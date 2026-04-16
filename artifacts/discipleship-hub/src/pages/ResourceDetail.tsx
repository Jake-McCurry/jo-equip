import React, { useState } from "react";
import { Link, useParams } from "wouter";
import { resources } from "@/data/resources";
import { topics } from "@/data/topics";
import { TypeBadge } from "@/components/TypeBadge";
import { ResourceCard } from "@/components/ResourceCard";
import { ArrowLeft, Download, ExternalLink, Play, CheckCircle2, Share2, FileText, BookOpen, PenTool, Check } from "lucide-react";
import NotFound from "./not-found";

const TYPE_ACCENT: Record<string, string> = {
  pdf: "#de5b00",
  article: "#0083de",
  video: "#002f55",
  tool: "#00855c",
};

const TYPE_THUMB_BG: Record<string, string> = {
  pdf: "linear-gradient(135deg, #f59e4a 0%, #de5b00 60%, #9f4100 100%)",
  article: "linear-gradient(135deg, #3ba4ea 0%, #0083de 55%, #005c9c 100%)",
  video: "linear-gradient(135deg, #0a3f6b 0%, #002f55 55%, #00152a 100%)",
  tool: "linear-gradient(135deg, #2dbf85 0%, #00855c 55%, #004d36 100%)",
};

function HeroMedia({ type }: { type: string }) {
  const bg = TYPE_THUMB_BG[type] ?? TYPE_THUMB_BG.article;

  const renderIcon = () => {
    if (type === "video") {
      return (
        <div className="relative flex items-center justify-center">
          <div className="absolute w-28 h-28 rounded-full bg-white/15 blur-xl"></div>
          <button
            className="relative w-20 h-20 rounded-full flex items-center justify-center transition-transform hover:scale-105"
            style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}
            aria-label="Play video"
            data-testid="button-play-video"
          >
            <Play className="w-7 h-7 ml-1" style={{ color: '#002f55' }} fill="#002f55" />
          </button>
        </div>
      );
    }
    const iconProps = { className: "w-20 h-20", strokeWidth: 1.2, style: { color: "rgba(255,255,255,0.85)" } };
    if (type === "pdf") return <FileText {...iconProps} />;
    if (type === "tool") return <PenTool {...iconProps} />;
    return <BookOpen {...iconProps} />;
  };

  return (
    <div
      className="relative w-full aspect-[21/9] md:aspect-[21/8] overflow-hidden flex items-center justify-center rounded-t"
      style={{ background: bg }}
      aria-hidden={type !== "video"}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 16px)",
        }}
      />
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.08)', filter: 'blur(20px)' }} />
      <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.12)', filter: 'blur(30px)' }} />
      <div className="relative z-10">
        {renderIcon()}
      </div>
      {type === "video" && (
        <span className="absolute bottom-4 right-4 text-xs font-semibold tracking-wider uppercase px-2 py-1 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: 'white' }}>
          Video
        </span>
      )}
    </div>
  );
}

export default function ResourceDetail() {
  const params = useParams();
  const resource = resources.find(r => r.id === params.id);
  const [copied, setCopied] = useState(false);

  if (!resource) {
    return <NotFound />;
  }

  const topic = topics.find(t => t.id === resource.topic);
  const accent = TYPE_ACCENT[resource.type] ?? "#0083de";
  const relatedResources = resources
    .filter(r => r.topic === resource.topic && r.id !== resource.id)
    .slice(0, 3);

  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: resource.title,
      text: resource.description,
      url,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // User dismissed or share failed — no-op
    }
  };

  const getPrimaryAction = () => {
    const shared = {
      className: "flex items-center justify-center gap-2 px-6 py-3 font-medium rounded transition-colors w-full sm:w-auto",
      style: { backgroundColor: accent, color: '#ffffff' },
    };
    switch (resource.type) {
      case "pdf":
        return (
          <button {...shared} data-testid="button-download-pdf">
            <Download className="w-4 h-4" /> Download PDF Guide
          </button>
        );
      case "video":
        return (
          <button {...shared} data-testid="button-watch-video">
            <Play className="w-4 h-4 fill-current" /> Watch Video
          </button>
        );
      case "tool":
        return (
          <button {...shared} data-testid="button-open-tool">
            <ExternalLink className="w-4 h-4" /> Open Tool
          </button>
        );
      default:
        return (
          <button {...shared} data-testid="button-read-article">
            <BookOpen className="w-4 h-4" /> Read Article
          </button>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 md:py-16 max-w-4xl">
      <Link href="/resources" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
      </Link>

      <article className="bg-white border border-border rounded overflow-hidden mb-16" style={{ borderLeft: `4px solid ${accent}` }}>
        <HeroMedia type={resource.type} />

        <div className="p-6 md:p-10">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <TypeBadge type={resource.type} />
            {topic && (
              <Link href={`/topics/${topic.id}`} className="text-xs font-medium text-muted-foreground hover:text-primary uppercase tracking-wider transition-colors">
                {topic.name}
              </Link>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl mb-4 leading-tight" style={{ color: '#002f55' }}>
            {resource.title}
          </h1>

          <div className="text-sm text-muted-foreground mb-10 pb-6 border-b border-border">
            By <span className="font-medium" style={{ color: '#002f55' }}>{resource.author}</span>
          </div>

          <div className="mb-10">
            <p className="text-xl text-muted-foreground leading-relaxed">
              {resource.description}
            </p>

            {resource.summary && resource.summary.length > 0 && (
              <div className="mt-8 bg-background p-6 rounded border border-border">
                <h3 className="text-lg mb-4" style={{ color: '#002f55' }}>Key Themes Covered</h3>
                <ul className="space-y-3">
                  {resource.summary.map((point, idx) => (
                    <li key={idx} className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 mt-0.5 mr-3 shrink-0" style={{ color: accent }} />
                      <span className="text-base">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {getPrimaryAction()}
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-input text-foreground font-medium rounded hover:bg-muted/50 transition-colors w-full sm:w-auto"
              data-testid="button-share"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" style={{ color: '#00855c' }} />
                  <span style={{ color: '#00855c' }}>Link copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share
                </>
              )}
            </button>
          </div>
        </div>
      </article>

      {relatedResources.length > 0 && (
        <section>
          <div className="mb-6 pb-4 border-b border-border">
            <h2 className="text-2xl" style={{ color: '#002f55' }}>Related in {topic?.name}</h2>
            <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: '#de5b00' }}></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedResources.map(r => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
