import React from "react";
import { Link } from "wouter";
import { Resource } from "@/data/resources";
import { TypeBadge } from "./TypeBadge";
import { ArrowRight, FileText, Play, PenTool, BookOpen } from "lucide-react";

interface ResourceCardProps {
  resource: Resource;
}

const TYPE_ACCENT: Record<string, string> = {
  pdf: "#de5b00",
  article: "#0083de",
  video: "#002f55",
  tool: "#00855c",
};

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
