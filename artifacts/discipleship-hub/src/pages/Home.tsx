import React from "react";
import { Link } from "wouter";
import { ArrowRight, Book, Sprout, Users } from "lucide-react";
import { resources } from "@/data/resources";
import { ResourceCard } from "@/components/ResourceCard";

export default function Home() {
  const featuredResources = resources.filter(r => r.featured).slice(0, 4);

  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="py-20 md:py-32 px-4 container mx-auto text-center max-w-4xl relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-border/30 rotate-45 pointer-events-none -z-10 hidden md:block"></div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl mb-6" style={{ color: '#002f55' }}>
          Equipping Disciplers <br className="hidden md:block" /> Worldwide
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          A global theological resource library providing pastors and ministry leaders with trusted, biblical tools for deep spiritual formation and disciple-making.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/topics"
            className="w-full sm:w-auto inline-flex justify-center items-center px-7 py-3 font-medium rounded transition-colors"
            style={{ backgroundColor: '#0083de', color: '#ffffff' }}
            data-testid="button-browse-topics"
          >
            Browse by Topic
          </Link>
          <Link
            href="/resources"
            className="w-full sm:w-auto inline-flex justify-center items-center px-7 py-3 font-medium rounded border transition-colors bg-transparent hover:bg-blue-50"
            style={{ borderColor: '#0083de', color: '#0083de' }}
            data-testid="button-explore-resources"
          >
            Explore Ministry Resources
          </Link>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="py-16 bg-white border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 border border-border rounded hover:border-primary/40 transition-colors">
              <Book className="w-7 h-7 mb-4" style={{ color: '#0083de' }} strokeWidth={1.5} />
              <h2 className="text-xl mb-3" style={{ color: '#002f55' }}>Foundations of Faith</h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                Core biblical doctrines and theological essentials to build a resilient, orthodox faith.
              </p>
            </div>
            <div className="p-8 border border-border rounded hover:border-primary/40 transition-colors">
              <Sprout className="w-7 h-7 mb-4" style={{ color: '#0083de' }} strokeWidth={1.5} />
              <h2 className="text-xl mb-3" style={{ color: '#002f55' }}>Spiritual Growth</h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                Resources for cultivating personal spiritual disciplines, prayer, and deep communion with God.
              </p>
            </div>
            <div className="p-8 border border-border rounded hover:border-primary/40 transition-colors">
              <Users className="w-7 h-7 mb-4" style={{ color: '#0083de' }} strokeWidth={1.5} />
              <h2 className="text-xl mb-3" style={{ color: '#002f55' }}>Disciple-Making &amp; Ministry</h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                Practical guides and frameworks for mentoring others and leading healthy churches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Resources */}
      <section className="py-20 container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
          <div>
            <h2 className="text-3xl mb-2" style={{ color: '#002f55' }}>Featured Resources</h2>
            <p className="text-muted-foreground text-base">Hand-selected tools for current ministry needs.</p>
          </div>
          <Link href="/resources" className="font-medium hover:underline inline-flex items-center text-sm" style={{ color: '#0083de' }}>
            View all resources <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredResources.map(resource => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </section>

      {/* Training Pathways */}
      <section className="py-20 bg-white border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl text-center mb-12" style={{ color: '#002f55' }}>Training Pathways</h2>

          <div className="flex flex-col gap-4">
            <Link href="/topics/discipleship" className="group block p-6 border border-border rounded hover:border-primary transition-colors bg-background" data-testid="pathway-discipleship">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg mb-1 transition-colors group-hover:text-primary" style={{ color: '#002f55' }}>Start a Discipleship Group</h3>
                  <p className="text-muted-foreground text-base">A step-by-step curriculum for launching and leading your first group.</p>
                </div>
                <div className="inline-flex items-center font-medium shrink-0 text-sm" style={{ color: '#0083de' }}>
                  Begin Pathway <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>

            <Link href="/topics/church-leadership" className="group block p-6 border border-border rounded hover:border-primary transition-colors bg-background" data-testid="pathway-leadership">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg mb-1 transition-colors group-hover:text-primary" style={{ color: '#002f55' }}>Training Local Leaders</h3>
                  <p className="text-muted-foreground text-base">Assessments, doctrinal foundations, and pastoral care training for elders.</p>
                </div>
                <div className="inline-flex items-center font-medium shrink-0 text-sm" style={{ color: '#0083de' }}>
                  Explore Pathway <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>

            <Link href="/topics/evangelism" className="group block p-6 border border-border rounded hover:border-primary transition-colors bg-background" data-testid="pathway-evangelism">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg mb-1 transition-colors group-hover:text-primary" style={{ color: '#002f55' }}>Evangelism Foundations</h3>
                  <p className="text-muted-foreground text-base">Mastering the core gospel message and learning to share it clearly.</p>
                </div>
                <div className="inline-flex items-center font-medium shrink-0 text-sm" style={{ color: '#0083de' }}>
                  Explore Pathway <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
