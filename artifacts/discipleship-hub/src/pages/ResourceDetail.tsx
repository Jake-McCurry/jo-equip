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
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-colors w-full sm:w-auto">
            <Download className="w-4 h-4" /> Download PDF Guide
          </button>
        );
      case "video":
        return (
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-colors w-full sm:w-auto">
            <Play className="w-4 h-4 fill-current" /> Watch Video
          </button>
        );
      default:
        return (
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-colors w-full sm:w-auto">
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

      <article className="bg-white border border-border rounded-lg p-6 md:p-10 mb-16">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <TypeBadge type={resource.type} />
          {topic && (
            <Link href={`/topics/${topic.id}`} className="text-xs font-medium text-muted-foreground hover:text-primary uppercase tracking-wider">
              {topic.name}
            </Link>
          )}
        </div>

        <h1 className="font-serif text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
          {resource.title}
        </h1>
        
        <div className="text-sm text-muted-foreground mb-10 pb-6 border-b border-border">
          By <span className="font-medium text-foreground">{resource.author}</span>
        </div>

        <div className="prose prose-slate prose-lg max-w-none mb-10 text-foreground">
          <p className="lead text-xl text-muted-foreground">
            {resource.description}
          </p>
          
          {resource.summary && resource.summary.length > 0 && (
            <div className="mt-8 bg-background p-6 rounded border border-border">
              <h3 className="font-serif text-xl font-semibold mb-4">Key Themes Covered</h3>
              <ul className="space-y-3 m-0 p-0 list-none">
                {resource.summary.map((point, idx) => (
                  <li key={idx} className="flex items-start">
                    <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 mr-3 shrink-0" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center gap-4">
          {getPrimaryAction()}
          <button className="flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-input text-foreground font-medium rounded hover:bg-accent/5 transition-colors w-full sm:w-auto">
            Save for Later
          </button>
        </div>
      </article>

      {relatedResources.length > 0 && (
        <section>
          <h2 className="font-serif text-2xl font-bold mb-6 pb-4 border-b border-border">Related in {topic?.name}</h2>
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
