import React from "react";
import { Link, useParams } from "wouter";
import { topics } from "@/data/topics";
import { resources } from "@/data/resources";
import { ResourceCard } from "@/components/ResourceCard";
import { BookOpen, Sprout, HandMetal, Users, Megaphone, Heart, Globe, Crown } from "lucide-react";
import NotFound from "./not-found";

const TOPIC_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number; style?: React.CSSProperties }>> = {
  foundations: BookOpen,
  "spiritual-growth": Sprout,
  prayer: HandMetal,
  evangelism: Megaphone,
  discipleship: Users,
  "church-leadership": Crown,
  "family-marriage": Heart,
  "mission-outreach": Globe,
};

const TOPIC_GRADIENTS: Record<string, string> = {
  foundations: "linear-gradient(135deg, #3ba4ea 0%, #0083de 100%)",
  "spiritual-growth": "linear-gradient(135deg, #2dbf85 0%, #00855c 100%)",
  prayer: "linear-gradient(135deg, #0a3f6b 0%, #002f55 100%)",
  evangelism: "linear-gradient(135deg, #f59e4a 0%, #de5b00 100%)",
  discipleship: "linear-gradient(135deg, #3ba4ea 0%, #0083de 100%)",
  "church-leadership": "linear-gradient(135deg, #0a3f6b 0%, #002f55 100%)",
  "family-marriage": "linear-gradient(135deg, #f59e4a 0%, #de5b00 100%)",
  "mission-outreach": "linear-gradient(135deg, #2dbf85 0%, #00855c 100%)",
};

function TopicCardHeader({ topicId }: { topicId: string }) {
  const Icon = TOPIC_ICONS[topicId] ?? BookOpen;
  const bg = TOPIC_GRADIENTS[topicId] ?? "linear-gradient(135deg, #3ba4ea 0%, #0083de 100%)";

  return (
    <div
      className="relative w-full aspect-[16/9] overflow-hidden flex items-center justify-center"
      style={{ background: bg }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 14px)",
        }}
      />
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.1)', filter: 'blur(10px)' }} />
      <Icon className="w-12 h-12 relative z-10" strokeWidth={1.3} style={{ color: 'rgba(255,255,255,0.9)' }} />
    </div>
  );
}

export default function TopicsList() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <h1 className="text-4xl md:text-5xl mb-4" style={{ color: '#002f55' }}>Ministry Topics</h1>
        <div className="h-0.5 w-12 mb-5" style={{ backgroundColor: '#de5b00' }}></div>
        <p className="text-muted-foreground leading-relaxed">
          Explore our structured curriculum of theological and practical ministry resources categorized by core focus areas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {topics.map(topic => {
          const count = resources.filter(r => r.topic === topic.id).length;
          return (
            <Link key={topic.id} href={`/topics/${topic.id}`} className="group block bg-white border border-border rounded overflow-hidden hover:border-primary hover:shadow-md transition-all" data-testid={`card-topic-${topic.id}`}>
              <TopicCardHeader topicId={topic.id} />
              <div className="p-6">
                <h2 className="text-xl mb-2 group-hover:text-primary transition-colors" style={{ color: '#002f55' }}>{topic.name}</h2>
                <p className="text-muted-foreground text-sm mb-4 leading-relaxed line-clamp-2">{topic.description}</p>
                <div className="text-xs font-semibold inline-flex px-2.5 py-1 rounded uppercase tracking-wider" style={{ color: '#0083de', backgroundColor: 'rgba(0,131,222,0.08)' }}>
                  {count} {count === 1 ? 'Resource' : 'Resources'}
                </div>
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
  const Icon = TOPIC_ICONS[topic.id] ?? BookOpen;
  const bg = TOPIC_GRADIENTS[topic.id] ?? "linear-gradient(135deg, #3ba4ea 0%, #0083de 100%)";

  return (
    <div>
      {/* Topic hero banner */}
      <div className="relative overflow-hidden" style={{ background: bg }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 18px)",
          }}
        />
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none" style={{ backgroundColor: 'rgba(255,255,255,0.08)', filter: 'blur(20px)' }} />
        <div className="container mx-auto px-4 py-14 md:py-20 relative">
          <Link href="/topics" className="inline-flex items-center text-sm font-medium mb-6 transition-colors" style={{ color: 'rgba(255,255,255,0.8)' }}>
            &larr; All Topics
          </Link>
          <div className="flex items-start gap-5 max-w-3xl">
            <div className="shrink-0 w-14 h-14 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Icon className="w-7 h-7" strokeWidth={1.5} style={{ color: '#ffffff' }} />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl mb-3" style={{ color: '#ffffff', fontWeight: 500 }}>{topic.name}</h1>
              <p className="leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)' }}>
                {topic.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
          <div>
            <h2 className="text-2xl" style={{ color: '#002f55' }}>Resources in this Topic</h2>
            <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: '#de5b00' }}></div>
          </div>
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
    </div>
  );
}
