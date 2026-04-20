import React from "react";
import { resources } from "@/data/resources";
import { ResourceCard } from "@/components/ResourceCard";
import { ListVideo } from "lucide-react";

export default function Playlists() {
  const items = resources.filter(r => r.type === "video");

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(0,131,222,0.1)' }}>
            <ListVideo className="w-5 h-5" style={{ color: '#0083de' }} />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#0083de' }}>
            Video Library
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl mb-4" style={{ color: '#002f55' }}>Playlists</h1>
        <div className="h-0.5 w-12 mb-5" style={{ backgroundColor: '#de5b00' }}></div>
        <p className="text-muted-foreground leading-relaxed text-lg">
          Watch curated video teaching series on the questions and topics that matter most for ministry.
        </p>
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(r => <ResourceCard key={r.id} resource={r} />)}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-border rounded bg-white">
          <p className="text-muted-foreground">Playlists are being curated. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
