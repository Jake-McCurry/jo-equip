import React from "react";
import { Link } from "wouter";
import { ArrowRight, Book, Sprout, Users, Globe, Users2, BookOpen } from "lucide-react";
import { resources } from "@/data/resources";
import { ResourceCard } from "@/components/ResourceCard";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <h2 className="text-3xl" style={{ color: '#002f55' }}>{children}</h2>
      <div className="mt-2 h-0.5 w-12" style={{ backgroundColor: '#de5b00' }}></div>
    </div>
  );
}

export default function Home() {
  const featuredResources = resources.filter(r => r.featured).slice(0, 4);

  return (
    <div className="w-full">

      {/* ── Hero Section ── */}
      <section className="relative py-24 md:py-36 px-4 text-center overflow-hidden" style={{ backgroundColor: '#0083de' }}>
        {/* Subtle geometric background decorations */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: '#002f55' }}></div>
          <div className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#002f55' }}></div>
          <div className="absolute top-1/4 left-8 w-2 h-2 rounded-full opacity-20 bg-white"></div>
          <div className="absolute top-1/3 right-12 w-3 h-3 rounded-full opacity-15 bg-white"></div>
          <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full opacity-20 bg-white"></div>
        </div>

        <div className="relative container mx-auto max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-8" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#ffffff' }}>
            <Globe className="w-3.5 h-3.5" />
            Global Theological Resource Library
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl mb-6 leading-tight" style={{ color: '#ffffff', fontWeight: 500 }}>
            Equipping Disciplers <br className="hidden md:block" /> Worldwide
          </h1>
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(255,255,255,0.88)' }}>
            A global theological resource library providing pastors and ministry leaders with trusted, biblical tools for deep spiritual formation and disciple-making.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/topics"
              className="w-full sm:w-auto inline-flex justify-center items-center px-7 py-3 font-medium rounded transition-colors"
              style={{ backgroundColor: '#ffffff', color: '#0083de' }}
              data-testid="button-browse-topics"
            >
              Browse by Topic
            </Link>
            <Link
              href="/resources"
              className="w-full sm:w-auto inline-flex justify-center items-center px-7 py-3 font-medium rounded border-2 transition-colors hover:bg-white/10"
              style={{ borderColor: 'rgba(255,255,255,0.7)', color: '#ffffff' }}
              data-testid="button-explore-resources"
            >
              Explore Ministry Resources
            </Link>
          </div>
        </div>
      </section>

      {/* ── Global Impact Strip ── */}
      <section style={{ backgroundColor: '#002f55' }}>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ divideColor: 'rgba(255,255,255,0.15)' }}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-5 sm:py-4 px-6 text-center sm:text-left">
              <Globe className="w-6 h-6 shrink-0" style={{ color: '#0083de' }} />
              <div>
                <div className="text-2xl font-medium text-white">180+</div>
                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>Countries Reached</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-5 sm:py-4 px-6 text-center sm:text-left" style={{ borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
              <Users2 className="w-6 h-6 shrink-0" style={{ color: '#0083de' }} />
              <div>
                <div className="text-2xl font-medium text-white">12,000+</div>
                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>Ministry Leaders Equipped</div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-5 sm:py-4 px-6 text-center sm:text-left" style={{ borderLeft: '1px solid rgba(255,255,255,0.12)' }}>
              <BookOpen className="w-6 h-6 shrink-0" style={{ color: '#0083de' }} />
              <div>
                <div className="text-2xl font-medium text-white">40+</div>
                <div className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>Languages Available</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Three Pillars Section ── */}
      <section className="py-16 bg-white border-y border-border">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl" style={{ color: '#002f55' }}>Core Ministry Areas</h2>
            <div className="mt-2 h-0.5 w-12 mx-auto" style={{ backgroundColor: '#de5b00' }}></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 border border-border rounded hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(0,131,222,0.1)' }}>
                <Book className="w-5 h-5" style={{ color: '#0083de' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl mb-3" style={{ color: '#002f55' }}>Foundations of Faith</h3>
              <p className="text-muted-foreground leading-relaxed text-base">
                Core biblical doctrines and theological essentials to build a resilient, orthodox faith.
              </p>
            </div>
            <div className="p-8 border border-border rounded hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(0,131,222,0.1)' }}>
                <Sprout className="w-5 h-5" style={{ color: '#0083de' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl mb-3" style={{ color: '#002f55' }}>Spiritual Growth</h3>
              <p className="text-muted-foreground leading-relaxed text-base">
                Resources for cultivating personal spiritual disciplines, prayer, and deep communion with God.
              </p>
            </div>
            <div className="p-8 border border-border rounded hover:border-primary/40 transition-colors">
              <div className="w-10 h-10 rounded flex items-center justify-center mb-5" style={{ backgroundColor: 'rgba(0,131,222,0.1)' }}>
                <Users className="w-5 h-5" style={{ color: '#0083de' }} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl mb-3" style={{ color: '#002f55' }}>Disciple-Making &amp; Ministry</h3>
              <p className="text-muted-foreground leading-relaxed text-base">
                Practical guides and frameworks for mentoring others and leading healthy churches.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Resources ── */}
      <section className="py-20 container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
          <div>
            <SectionHeading>Featured Resources</SectionHeading>
            <p className="text-muted-foreground text-base mt-3">Hand-selected tools for current ministry needs.</p>
          </div>
          <Link href="/resources" className="font-medium hover:underline inline-flex items-center text-sm shrink-0" style={{ color: '#0083de' }}>
            View all resources <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredResources.map(resource => (
            <ResourceCard key={resource.id} resource={resource} />
          ))}
        </div>
      </section>

      {/* ── Training Pathways ── */}
      <section className="py-20 border-t border-border" style={{ backgroundColor: '#f4f7fb' }}>
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="mb-10">
            <SectionHeading>Training Pathways</SectionHeading>
            <p className="text-muted-foreground text-base mt-3">Structured learning tracks for every stage of ministry.</p>
          </div>

          <div className="flex flex-col gap-4">
            <Link href="/topics/discipleship" className="group block p-6 bg-white border border-border rounded hover:border-primary transition-colors" data-testid="pathway-discipleship">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0,131,222,0.1)' }}>
                    <Users className="w-5 h-5" style={{ color: '#0083de' }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg mb-1 transition-colors group-hover:text-primary" style={{ color: '#002f55' }}>Start a Discipleship Group</h3>
                    <p className="text-muted-foreground text-base">A step-by-step curriculum for launching and leading your first group.</p>
                  </div>
                </div>
                <div className="inline-flex items-center font-medium shrink-0 text-sm ml-14 md:ml-0" style={{ color: '#0083de' }}>
                  Begin <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>

            <Link href="/topics/church-leadership" className="group block p-6 bg-white border border-border rounded hover:border-primary transition-colors" data-testid="pathway-leadership">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(0,47,85,0.07)' }}>
                    <Book className="w-5 h-5" style={{ color: '#002f55' }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg mb-1 transition-colors group-hover:text-primary" style={{ color: '#002f55' }}>Training Local Leaders</h3>
                    <p className="text-muted-foreground text-base">Assessments, doctrinal foundations, and pastoral care training for elders.</p>
                  </div>
                </div>
                <div className="inline-flex items-center font-medium shrink-0 text-sm ml-14 md:ml-0" style={{ color: '#0083de' }}>
                  Explore <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>

            <Link href="/topics/evangelism" className="group block p-6 bg-white border border-border rounded hover:border-primary transition-colors" data-testid="pathway-evangelism">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(222,91,0,0.1)' }}>
                    <Globe className="w-5 h-5" style={{ color: '#de5b00' }} strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg mb-1 transition-colors group-hover:text-primary" style={{ color: '#002f55' }}>Evangelism Foundations</h3>
                    <p className="text-muted-foreground text-base">Mastering the core gospel message and learning to share it clearly across cultures.</p>
                  </div>
                </div>
                <div className="inline-flex items-center font-medium shrink-0 text-sm ml-14 md:ml-0" style={{ color: '#0083de' }}>
                  Explore <ArrowRight className="w-4 h-4 ml-1.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
