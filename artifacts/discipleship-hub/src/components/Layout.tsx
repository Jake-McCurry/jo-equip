import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X } from "lucide-react";
import logoWhite from "@assets/jol_logo_white_1776368975569.png";

interface LayoutProps {
  children: React.ReactNode;
}

// Reusable open-book brand mark — matches the favicon
function OpenBookMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="64" height="64" rx="10" fill="#0083de" />
      <g stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M10 18 Q 22 14 32 20 L 32 50 Q 22 44 10 48 Z" />
        <path d="M54 18 Q 42 14 32 20 L 32 50 Q 42 44 54 48 Z" />
      </g>
      <circle cx="32" cy="20" r="3" fill="#de5b00" />
    </svg>
  );
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Topics", path: "/topics" },
    { name: "Ministry Skills", path: "/topics/discipleship" },
    { name: "Resources", path: "/resources" },
    { name: "Tools", path: "/resources?type=tool" },
  ];

  const isActive = (path: string) =>
    path === "/" ? location === "/" : location.startsWith(path);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">

      {/* ── Unified header ── */}
      <header className="sticky top-0 z-50 w-full" style={{ backgroundColor: '#002f55', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between py-3">

          {/* Left: JesusOnline logo + EQUIP sub-brand mark */}
          <Link href="/" className="flex items-center gap-3 md:gap-4 hover:opacity-90 transition-opacity">
            <img
              src={logoWhite}
              alt="JesusOnline"
              className="h-6 md:h-7 w-auto"
            />
            <span className="hidden sm:block w-px h-7 md:h-8" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <div className="hidden sm:flex items-center gap-2">
              <OpenBookMark size={32} />
              <div className="flex flex-col leading-none">
                <span className="text-white font-semibold text-base tracking-wide" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>
                  EQUIP
                </span>
                <span className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', letterSpacing: '0.04em' }}>
                  Discipleship Hub
                </span>
              </div>
            </div>
            {/* Mobile-only compact mark */}
            <div className="sm:hidden flex items-center gap-2">
              <OpenBookMark size={26} />
              <span className="text-white font-semibold text-sm" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif' }}>EQUIP</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className="relative px-3 py-2 text-sm font-medium transition-colors rounded"
                style={{
                  color: isActive(link.path) ? '#ffffff' : 'rgba(255,255,255,0.65)',
                }}
                onMouseEnter={e => { if (!isActive(link.path)) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)'; }}
                onMouseLeave={e => { if (!isActive(link.path)) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}
              >
                {link.name}
                {isActive(link.path) && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full" style={{ backgroundColor: '#de5b00' }} />
                )}
              </Link>
            ))}
            <button
              className="ml-2 p-2 rounded transition-colors"
              style={{ color: 'rgba(255,255,255,0.65)' }}
              aria-label="Search"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'; }}
            >
              <Search className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile Toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button className="p-2" style={{ color: 'rgba(255,255,255,0.7)' }} aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
            <button
              className="p-2"
              style={{ color: '#ffffff' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden w-full py-3 px-4 flex flex-col gap-1" style={{ backgroundColor: '#001f3d', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium py-3 px-3 rounded transition-colors"
                style={{
                  color: isActive(link.path) ? '#ffffff' : 'rgba(255,255,255,0.65)',
                  backgroundColor: isActive(link.path) ? 'rgba(0,131,222,0.2)' : 'transparent',
                  borderLeft: isActive(link.path) ? '3px solid #de5b00' : '3px solid transparent',
                }}
              >
                {link.name}
              </Link>
            ))}
          </div>
        )}
      </header>

      <main className="flex-grow">
        {children}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-16 pt-12 pb-8" style={{ backgroundColor: '#002f55' }}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-10 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>

            {/* Brand column */}
            <div className="max-w-xs">
              <div className="flex items-center gap-3 mb-3">
                <OpenBookMark size={32} />
                <img src={logoWhite} alt="JesusOnline" className="h-6 w-auto" />
              </div>
              <div className="mb-4">
                <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#0083de' }}>
                  Equip · Discipleship Hub
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Equipping pastors, disciplers, and ministry leaders worldwide with trusted theological resources — in every nation, every language.
              </p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                equip.jesusonline.com
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-12 text-sm">
              <div className="flex flex-col gap-3">
                <h4 className="font-semibold text-sm" style={{ color: '#ffffff' }}>Ministry</h4>
                <Link href="/topics" className="transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                >Browse Topics</Link>
                <Link href="/resources" className="transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                >Resource Library</Link>
                <Link href="/topics/discipleship" className="transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                >Training Pathways</Link>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="font-semibold text-sm" style={{ color: '#ffffff' }}>Organization</h4>
                <a href="https://jesusonline.com" target="_blank" rel="noopener noreferrer" className="transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                >JesusOnline.com</a>
                <a href="#" className="transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                >About</a>
                <a href="#" className="transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ffffff'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)'; }}
                >Contact</a>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <p>&copy; {new Date().getFullYear()} JesusOnline Ministries. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
