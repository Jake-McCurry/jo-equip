import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Search, Menu, X, Book } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Topics", path: "/topics" },
    { name: "Ministry Skills", path: "/topics/discipleship" },
    { name: "Resources", path: "/resources" },
    { name: "Tools", path: "/resources?type=tool" },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 bg-white ${
          isScrolled ? "border-b border-border shadow-sm py-3" : "border-b border-border py-4"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Book className="w-5 h-5" style={{ color: '#0083de' }} />
            <span className="font-semibold text-base md:text-lg hidden sm:block" style={{ color: '#002f55', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 500 }}>JesusOnline Discipleship Hub</span>
            <span className="font-semibold text-base sm:hidden" style={{ color: '#002f55', fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 500 }}>JO Hub</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                className={`text-sm font-medium transition-colors ${
                  location === link.path || (link.path !== '/' && location.startsWith(link.path))
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
                style={
                  location === link.path || (link.path !== '/' && location.startsWith(link.path))
                    ? { color: '#0083de' }
                    : {}
                }
              >
                {link.name}
              </Link>
            ))}
            <button className="text-muted-foreground hover:text-primary transition-colors p-1.5" aria-label="Search" style={{ '--tw-text-opacity': '1' } as React.CSSProperties}>
              <Search className="w-4 h-4" />
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button className="p-2 text-muted-foreground" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
            <button
              className="p-2"
              style={{ color: '#002f55' }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-border py-4 px-4 shadow-md flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-base font-medium py-2.5 px-2 rounded transition-colors ${
                  location === link.path || (link.path !== '/' && location.startsWith(link.path))
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
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

      {/* Footer — navy brand background */}
      <footer className="mt-16 py-12" style={{ backgroundColor: '#002f55', color: '#ffffff' }}>
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
            <div className="max-w-xs text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                <Book className="w-5 h-5" style={{ color: '#0083de' }} />
                <span className="font-semibold text-lg text-white" style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 500 }}>JesusOnline</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Equipping pastors, disciplers, and ministry leaders worldwide with trusted theological resources.
              </p>
            </div>

            <div className="flex gap-10 text-sm">
              <div className="flex flex-col gap-3">
                <h4 className="font-semibold text-white" style={{ color: '#ffffff' }}>Ministry</h4>
                <Link href="/topics" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.65)' }}>Browse Topics</Link>
                <Link href="/resources" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.65)' }}>Resource Library</Link>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="font-semibold text-white" style={{ color: '#ffffff' }}>Organization</h4>
                <a href="https://jesusonline.com" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.65)' }}>JesusOnline.com</a>
                <a href="#" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.65)' }}>About</a>
                <a href="#" className="transition-colors hover:text-white" style={{ color: 'rgba(255,255,255,0.65)' }}>Contact</a>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-8 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-xs" style={{ borderTop: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)' }}>
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
