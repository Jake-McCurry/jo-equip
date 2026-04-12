import React from "react";
import { Link } from "wouter";
import { Resource } from "@/data/resources";
import { TypeBadge } from "./TypeBadge";
import { ArrowRight, FileText, Play, PenTool, BookOpen } from "lucide-react";

interface ResourceCardProps {
  resource: Resource;
}

export function ResourceCard({ resource }: ResourceCardProps) {
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
    <Link href={`/resources/${resource.id}`} className="group block h-full">
      <div className="flex flex-col h-full bg-white border border-border rounded-md p-6 transition-colors duration-200 hover:border-primary">
        <div className="mb-4">
          <TypeBadge type={resource.type} />
        </div>
        
        <h3 className="text-xl font-serif font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
          {resource.title}
        </h3>
        
        <p className="text-sm text-muted-foreground mb-6 flex-grow leading-relaxed">
          {resource.description}
        </p>
        
        <div className="pt-4 border-t border-border/50 mt-auto flex items-center justify-between text-sm font-medium text-primary">
          <span className="flex items-center">
            {getIcon(resource.type)}
            {getActionText(resource.type)}
          </span>
          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
        </div>
      </div>
    </Link>
  );
}
