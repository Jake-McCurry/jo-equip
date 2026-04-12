import React, { useState } from "react";
import { resources, ResourceType } from "@/data/resources";
import { ResourceCard } from "@/components/ResourceCard";
import { topics } from "@/data/topics";
import { Search } from "lucide-react";

export default function Resources() {
  const [filterType, setFilterType] = useState<ResourceType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResources = resources.filter(r => {
    const matchesType = filterType === "all" || r.type === filterType;
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Resource Library</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Browse our comprehensive collection of theological articles, ministry tools, training videos, and study guides.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-border">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filterType === "all" ? "bg-primary text-primary-foreground" : "bg-white border border-border hover:bg-accent/5 text-foreground"}`}
          >
            All Resources
          </button>
          <button 
            onClick={() => setFilterType("pdf")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filterType === "pdf" ? "bg-primary text-primary-foreground" : "bg-white border border-border hover:bg-accent/5 text-foreground"}`}
          >
            PDF Guides
          </button>
          <button 
            onClick={() => setFilterType("article")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filterType === "article" ? "bg-primary text-primary-foreground" : "bg-white border border-border hover:bg-accent/5 text-foreground"}`}
          >
            Articles
          </button>
          <button 
            onClick={() => setFilterType("video")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filterType === "video" ? "bg-primary text-primary-foreground" : "bg-white border border-border hover:bg-accent/5 text-foreground"}`}
          >
            Videos
          </button>
          <button 
            onClick={() => setFilterType("tool")}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filterType === "tool" ? "bg-primary text-primary-foreground" : "bg-white border border-border hover:bg-accent/5 text-foreground"}`}
          >
            Tools
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input 
            type="text" 
            placeholder="Search resources..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 bg-white border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
      </div>

      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map(resource => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-border rounded bg-white">
          <p className="text-muted-foreground">No resources found matching your criteria.</p>
          <button 
            onClick={() => { setFilterType("all"); setSearchQuery(""); }}
            className="mt-4 text-primary font-medium hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
