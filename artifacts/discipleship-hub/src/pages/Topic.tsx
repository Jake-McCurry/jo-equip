import React from "react";
import { Link, useParams } from "wouter";
import { topics } from "@/data/topics";
import { resources } from "@/data/resources";
import { ResourceCard } from "@/components/ResourceCard";
import NotFound from "./not-found";

export default function TopicsList() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">Ministry Topics</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Explore our structured curriculum of theological and practical ministry resources categorized by core focus areas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map(topic => {
          const count = resources.filter(r => r.topic === topic.id).length;
          return (
            <Link key={topic.id} href={`/topics/${topic.id}`} className="group block p-6 bg-white border border-border rounded-md hover:border-primary transition-colors">
              <h2 className="font-serif text-2xl font-semibold mb-2 group-hover:text-primary transition-colors">{topic.name}</h2>
              <p className="text-muted-foreground text-sm mb-4 leading-relaxed line-clamp-2">{topic.description}</p>
              <div className="text-xs font-medium text-primary bg-primary/5 inline-flex px-2 py-1 rounded">
                {count} {count === 1 ? 'Resource' : 'Resources'}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function TopicDetail() {
  const params = useParams();
  const topic = topics.find(t => t.id === params.topic);
  
  if (!topic) {
    return <NotFound />;
  }

  const topicResources = resources.filter(r => r.topic === topic.id);

  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="mb-8">
        <Link href="/topics" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
          &larr; All Topics
        </Link>
      </div>
      
      <div className="max-w-3xl mb-12 bg-white p-8 md:p-10 border border-border rounded-lg">
        <h1 className="font-serif text-4xl font-bold text-foreground mb-4">{topic.name}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          {topic.description}
        </p>
      </div>

      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
        <h2 className="font-serif text-2xl font-bold">Resources in this Topic</h2>
        <span className="text-sm text-muted-foreground">{topicResources.length} items</span>
      </div>

      {topicResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topicResources.map(resource => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center border border-dashed border-border rounded bg-white">
          <p className="text-muted-foreground">More resources for this topic are coming soon.</p>
        </div>
      )}
    </div>
  );
}
