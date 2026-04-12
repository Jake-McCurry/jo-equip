import React from "react";
import { ResourceType } from "@/data/resources";

interface TypeBadgeProps {
  type: ResourceType;
  className?: string;
}

export function TypeBadge({ type, className = "" }: TypeBadgeProps) {
  const getBadgeStyle = (t: ResourceType) => {
    switch (t) {
      case "pdf":
        return "bg-amber-100 text-amber-900 border-amber-200";
      case "article":
        return "bg-blue-50 text-blue-900 border-blue-200";
      case "video":
        return "bg-rose-50 text-rose-900 border-rose-200";
      case "tool":
        return "bg-emerald-50 text-emerald-900 border-emerald-200";
      default:
        return "bg-gray-100 text-gray-900 border-gray-200";
    }
  };

  const getLabel = (t: ResourceType) => {
    switch (t) {
      case "pdf":
        return "PDF Guide";
      case "article":
        return "Article";
      case "video":
        return "Video";
      case "tool":
        return "Tool";
      default:
        return "Resource";
    }
  };

  return (
    <span 
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider border ${getBadgeStyle(type)} ${className}`}
    >
      {getLabel(type)}
    </span>
  );
}
