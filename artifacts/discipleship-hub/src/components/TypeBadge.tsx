import React from "react";
import { ResourceType } from "@/data/resources";

interface TypeBadgeProps {
  type: ResourceType;
  className?: string;
}

const BADGE_STYLES: Record<ResourceType, { bg: string; color: string; border: string }> = {
  pdf: { bg: "rgba(222,91,0,0.08)", color: "#b84a00", border: "rgba(222,91,0,0.25)" },
  article: { bg: "rgba(0,131,222,0.08)", color: "#006bb5", border: "rgba(0,131,222,0.25)" },
  video: { bg: "rgba(0,47,85,0.08)", color: "#002f55", border: "rgba(0,47,85,0.2)" },
  tool: { bg: "rgba(0,133,92,0.08)", color: "#00693e", border: "rgba(0,133,92,0.25)" },
};

const LABELS: Record<ResourceType, string> = {
  pdf: "PDF Guide",
  article: "Article",
  video: "Video",
  tool: "Tool",
};

export function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  const style = BADGE_STYLES[type] ?? BADGE_STYLES.article;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${className}`}
      style={{ backgroundColor: style.bg, color: style.color, borderColor: style.border }}
    >
      {LABELS[type] ?? "Resource"}
    </span>
  );
}
