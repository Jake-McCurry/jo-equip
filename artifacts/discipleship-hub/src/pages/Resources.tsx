import React, { useState } from "react";
import { resources, ResourceType } from "@/data/resources";
import { ResourceCard } from "@/components/ResourceCard";
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

  const activeStyle = { backgroundColor: '#0083de', color: '#ffffff' };
  const inactiveClass = "bg-white border border-border text-foreground hover:border-primary/50 hover:text-primary";

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <h1 className="text-4xl md:text-5xl mb-4" style={{ color: '#002f55' }}>Resource Library</h1>
        <p className="text-muted-foreground leading-relaxed">
          Browse our comprehensive collection of theological articles, ministry tools, training videos, and study guides.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-6 border-b border-border">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(["all", "pdf", "article", "video", "tool"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${filterType === type ? "" : inactiveClass}`}
              style={filterType === type ? activeStyle : {}}
              data-testid={`filter-${type}`}
            >
              {type === "all" ? "All Resources" : type === "pdf" ? "PDF Guides" : type === "article" ? "Articles" : type === "video" ? "Videos" : "Tools"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="search"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 pl-10 pr-4 py-2 bg-white border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            data-testid="input-search"
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
            className="mt-4 font-medium hover:underline text-sm"
            style={{ color: '#0083de' }}
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
