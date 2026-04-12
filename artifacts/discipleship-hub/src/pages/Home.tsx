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
        {/* Subtle decorative background element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-border/40 rotate-45 pointer-events-none -z-10 hidden md:block"></div>
        
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight mb-6 leading-tight">
          Equipping Disciplers <br className="hidden md:block" /> Worldwide
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
          A global theological resource library providing pastors and ministry leaders with trusted, biblical tools for deep spiritual formation and disciple-making.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/topics" className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded hover:bg-primary/90 transition-colors">
            Browse by Topic
          </Link>
          <Link href="/resources" className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 bg-transparent border border-input text-foreground font-medium rounded hover:bg-accent/5 transition-colors">
            Explore Ministry Resources
          </Link>
        </div>
      </section>

      {/* Three Pillars Section */}
      <section className="py-16 bg-white border-y border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 border border-border rounded-md hover:border-primary/30 transition-colors">
              <Book className="w-8 h-8 text-primary mb-4" strokeWidth={1.5} />
              <h2 className="font-serif text-2xl font-semibold mb-3">Foundations of Faith</h2>
              <p className="text-muted-foreground leading-relaxed">
                Core biblical doctrines and theological essentials to build a resilient, orthodox faith.
              </p>
            </div>
            <div className="p-8 border border-border rounded-md hover:border-primary/30 transition-colors">
              <Sprout className="w-8 h-8 text-primary mb-4" strokeWidth={1.5} />
              <h2 className="font-serif text-2xl font-semibold mb-3">Spiritual Growth</h2>
              <p className="text-muted-foreground leading-relaxed">
                Resources for cultivating personal spiritual disciplines, prayer, and deep communion with God.
              </p>
            </div>
            <div className="p-8 border border-border rounded-md hover:border-primary/30 transition-colors">
              <Users className="w-8 h-8 text-primary mb-4" strokeWidth={1.5} />
              <h2 className="font-serif text-2xl font-semibold mb-3">Disciple-Making & Ministry</h2>
              <p className="text-muted-foreground leading-relaxed">
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
            <h2 className="font-serif text-3xl font-bold text-foreground mb-2">Featured Resources</h2>
            <p className="text-muted-foreground">Hand-selected tools for current ministry needs.</p>
          </div>
          <Link href="/resources" className="text-primary font-medium hover:underline inline-flex items-center">
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
          <h2 className="font-serif text-3xl font-bold text-center mb-12">Training Pathways</h2>
          
          <div className="flex flex-col gap-4">
            <Link href="/topics/discipleship" className="group block p-6 border border-border rounded-md hover:border-primary transition-colors bg-background">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Start a Discipleship Group</h3>
                  <p className="text-muted-foreground">A step-by-step curriculum for launching and leading your first group.</p>
                </div>
                <div className="inline-flex items-center font-medium text-primary shrink-0">
                  Begin Pathway <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>

            <Link href="/topics/church-leadership" className="group block p-6 border border-border rounded-md hover:border-primary transition-colors bg-background">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Training Local Leaders</h3>
                  <p className="text-muted-foreground">Assessments, doctrinal foundations, and pastoral care training for elders.</p>
                </div>
                <div className="inline-flex items-center font-medium text-primary shrink-0">
                  Explore Pathway <ArrowRight className="w-4 h-4 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>

            <Link href="/topics/evangelism" className="group block p-6 border border-border rounded-md hover:border-primary transition-colors bg-background">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">Evangelism Foundations</h3>
                  <p className="text-muted-foreground">Mastering the core gospel message and learning to share it clearly.</p>
                </div>
                <div className="inline-flex items-center font-medium text-primary shrink-0">
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
