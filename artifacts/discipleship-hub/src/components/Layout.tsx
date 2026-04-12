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
        className={`sticky top-0 z-50 w-full transition-all duration-200 bg-background/95 backdrop-blur-sm ${
          isScrolled ? "border-b border-border shadow-sm py-3" : "py-5"
        }`}
      >
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <Book className="w-6 h-6 text-primary" />
            <span className="font-serif font-semibold text-lg md:text-xl tracking-tight hidden sm:block">JesusOnline Discipleship Hub</span>
            <span className="font-serif font-semibold text-lg tracking-tight sm:hidden">JO Hub</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                href={link.path}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location === link.path || (link.path !== '/' && location.startsWith(link.path))
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.name}
              </Link>
            ))}
            <button className="text-muted-foreground hover:text-primary transition-colors p-2" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
          </nav>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <button className="p-2 text-muted-foreground" aria-label="Search">
              <Search className="w-5 h-5" />
            </button>
            <button 
              className="p-2 text-foreground"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-background border-b border-border py-4 px-4 shadow-md flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                href={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-base font-medium py-2 ${
                  location === link.path || (link.path !== '/' && location.startsWith(link.path))
                    ? "text-primary"
                    : "text-muted-foreground"
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

      <footer className="border-t border-border bg-white mt-16 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
            <div className="max-w-xs text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                <Book className="w-5 h-5 text-primary" />
                <span className="font-serif font-semibold text-lg text-foreground">JesusOnline</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Equipping pastors, disciplers, and ministry leaders worldwide with trusted theological resources.
              </p>
            </div>
            
            <div className="flex gap-8 text-sm">
              <div className="flex flex-col gap-3">
                <h4 className="font-semibold text-foreground">Ministry</h4>
                <Link href="/topics" className="text-muted-foreground hover:text-primary transition-colors">Browse Topics</Link>
                <Link href="/resources" className="text-muted-foreground hover:text-primary transition-colors">Resource Library</Link>
              </div>
              <div className="flex flex-col gap-3">
                <h4 className="font-semibold text-foreground">Organization</h4>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">About Us</a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} JesusOnline Ministries. All rights reserved.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
