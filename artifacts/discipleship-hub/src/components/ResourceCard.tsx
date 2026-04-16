import React from "react";
import { Link } from "wouter";
import { Resource } from "@/data/resources";
import { TypeBadge } from "./TypeBadge";
import { ArrowRight, FileText, Play, PenTool, BookOpen, ImageIcon } from "lucide-react";

interface ResourceCardProps {
  resource: Resource;
}

const TYPE_ACCENT: Record<string, string> = {
  pdf: "#de5b00",
  article: "#0083de",
  video: "#002f55",
  tool: "#00855c",
};

const TYPE_THUMB: Record<string, { gradient: string; overlayOpacity: number }> = {
  pdf: { gradient: "linear-gradient(135deg, #f59e4a 0%, #de5b00 60%, #9f4100 100%)", overlayOpacity: 0.12 },
  article: { gradient: "linear-gradient(135deg, #3ba4ea 0%, #0083de 55%, #005c9c 100%)", overlayOpacity: 0.1 },
  video: { gradient: "linear-gradient(135deg, #0a3f6b 0%, #002f55 55%, #00152a 100%)", overlayOpacity: 0.25 },
  tool: { gradient: "linear-gradient(135deg, #2dbf85 0%, #00855c 55%, #004d36 100%)", overlayOpacity: 0.12 },
};

function Thumbnail({ type }: { type: string }) {
  const theme = TYPE_THUMB[type] ?? TYPE_THUMB.article;

  const CenterIcon = () => {
    const iconProps = { className: "w-12 h-12", strokeWidth: 1.3, style: { color: "rgba(255,255,255,0.85)" } };
    if (type === "video") {
      return (
        <div className="relative flex items-center justify-center">
          <div className="absolute w-16 h-16 rounded-full bg-white/15 blur-md"></div>
          <div className="relative w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.95)' }}>
            <Play className="w-5 h-5 ml-0.5" style={{ color: '#002f55' }} fill="#002f55" />
          </div>
        </div>
      );
    }
    if (type === "pdf") return <FileText {...iconProps} />;
    if (type === "tool") return <PenTool {...iconProps} />;
    if (type === "article") return <BookOpen {...iconProps} />;
    return <ImageIcon {...iconProps} />;
  };

  return (
    <div
      className="relative w-full aspect-[16/9] overflow-hidden flex items-center justify-center"
      style={{ background: theme.gradient }}
      aria-hidden="true"
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 14px)",
          opacity: theme.overlayOpacity + 0.5,
        }}
      />
      {/* Soft corner glow */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)', filter: 'blur(8px)' }}
      />
      <div className="relative z-10">
        <CenterIcon />
      </div>
      {type === "video" && (
        <span className="absolute bottom-2 right-2 text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(0,0,0,0.55)', color: 'white' }}>
          Video
        </span>
      )}
    </div>
  );
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const accent = TYPE_ACCENT[resource.type] ?? "#0083de";

  const getIcon = (type: string) => {
    switch (type) {
      case "pdf": return <FileText className="w-4 h-4 mr-1.5" />;
      case "video": return <Play className="w-4 h-4 mr-1.5" />;
      case "tool": return <PenTool className="w-4 h-4 mr-1.5" />;
      case "article": return <BookOpen className="w-4 h-4 mr-1.5" />;
      default: return <FileText className="w-4 h-4 mr-1.5" />;
    }
  };

  const getActionText = (type: string) => {
    switch (type) {
      case "pdf": return "Download PDF";
      case "video": return "Watch Video";
      case "tool": return "Open Tool";
      case "article": return "Read Article";
      default: return "View Resource";
    }
  };

  return (
    <Link href={`/resources/${resource.id}`} className="group block h-full" data-testid={`card-resource-${resource.id}`}>
      <div
        className="flex flex-col h-full bg-white border border-border rounded overflow-hidden transition-all duration-200 hover:shadow-md hover:border-transparent"
        style={{ borderLeft: `4px solid ${accent}` }}
      >
        <Thumbnail type={resource.type} />

        <div className="flex flex-col flex-grow p-6">
          <div className="mb-4">
            <TypeBadge type={resource.type} />
          </div>

          <h3 className="text-lg mb-2 group-hover:text-primary transition-colors leading-snug" style={{ color: '#002f55' }}>
            {resource.title}
          </h3>

          <p className="text-sm text-muted-foreground mb-6 flex-grow leading-relaxed">
            {resource.description}
          </p>

          <div className="pt-4 border-t border-border/50 mt-auto flex items-center justify-between text-sm font-medium" style={{ color: accent }}>
            <span className="flex items-center">
              {getIcon(resource.type)}
              {getActionText(resource.type)}
            </span>
            <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
          </div>
        </div>
      </div>
    </Link>
  );
}
