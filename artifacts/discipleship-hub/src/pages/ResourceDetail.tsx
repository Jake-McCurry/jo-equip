import React from "react";
import { Link, useParams } from "wouter";
import { resources } from "@/data/resources";
import { topics } from "@/data/topics";
import { TypeBadge } from "@/components/TypeBadge";
import { ResourceCard } from "@/components/ResourceCard";
import { ArrowLeft, Download, ExternalLink, Play, CheckCircle2 } from "lucide-react";
import NotFound from "./not-found";

export default function ResourceDetail() {
  const params = useParams();
  const resource = resources.find(r => r.id === params.id);

  if (!resource) {
    return <NotFound />;
  }

  const topic = topics.find(t => t.id === resource.topic);
  const relatedResources = resources
    .filter(r => r.topic === resource.topic && r.id !== resource.id)
    .slice(0, 3);

  const getPrimaryAction = () => {
    switch (resource.type) {
      case "pdf":
        return (
          <button
            className="flex items-center justify-center gap-2 px-6 py-3 font-medium rounded transition-colors w-full sm:w-auto"
            style={{ backgroundColor: '#0083de', color: '#ffffff' }}
            data-testid="button-download-pdf"
          >
            <Download className="w-4 h-4" /> Download PDF Guide
          </button>
        );
      case "video":
        return (
          <button
            className="flex items-center justify-center gap-2 px-6 py-3 font-medium rounded transition-colors w-full sm:w-auto"
            style={{ backgroundColor: '#0083de', color: '#ffffff' }}
            data-testid="button-watch-video"
          >
            <Play className="w-4 h-4 fill-current" /> Watch Video
          </button>
        );
      default:
        return (
          <button
            className="flex items-center justify-center gap-2 px-6 py-3 font-medium rounded transition-colors w-full sm:w-auto"
            style={{ backgroundColor: '#0083de', color: '#ffffff' }}
            data-testid="button-access-resource"
          >
            <ExternalLink className="w-4 h-4" /> Access Resource
          </button>
        );
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 md:py-16 max-w-4xl">
      <Link href="/resources" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Library
      </Link>

      <article className="bg-white border border-border rounded p-6 md:p-10 mb-16">
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
                    <CheckCircle2 className="w-5 h-5 mt-0.5 mr-3 shrink-0" style={{ color: '#0083de' }} />
                    <span className="text-base">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center gap-4">
          {getPrimaryAction()}
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-input text-foreground font-medium rounded hover:bg-muted/50 transition-colors w-full sm:w-auto" data-testid="button-save-later">
            Save for Later
          </button>
        </div>
      </article>

      {relatedResources.length > 0 && (
        <section>
          <h2 className="text-2xl mb-6 pb-4 border-b border-border" style={{ color: '#002f55' }}>Related in {topic?.name}</h2>
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
