import React from "react";
import { Link } from "wouter";
import { Settings, Info, Mail, FileText, ShieldCheck, ExternalLink, ArrowRight } from "lucide-react";

const SECTIONS = [
  {
    title: "About",
    icon: Info,
    description: "Learn about JesusOnline Ministries and the EQUIP initiative.",
    href: "#",
    accent: "#0083de",
  },
  {
    title: "Statement of Faith",
    icon: ShieldCheck,
    description: "Our doctrinal convictions and biblical foundations.",
    href: "#",
    accent: "#002f55",
  },
  {
    title: "Contact",
    icon: Mail,
    description: "Reach the EQUIP team for questions or partnership.",
    href: "#",
    accent: "#de5b00",
  },
  {
    title: "JO Mobile App",
    icon: ExternalLink,
    description: "Get the JesusOnline app: Growing in Christ, anywhere, anytime.",
    href: "https://jesusonline.com",
    accent: "#00855c",
    external: true,
  },
  {
    title: "Privacy Policy",
    icon: FileText,
    description: "How we handle your information.",
    href: "#",
    accent: "#0083de",
  },
  {
    title: "Settings",
    icon: Settings,
    description: "Display and language preferences (coming soon).",
    href: "#",
    accent: "#002f55",
  },
];

export default function More() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16">
      <div className="max-w-3xl mb-12">
        <div className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ color: '#0083de' }}>
          More
        </div>
        <h1 className="text-4xl md:text-5xl mb-4" style={{ color: '#002f55' }}>About & Settings</h1>
        <div className="h-0.5 w-12 mb-5" style={{ backgroundColor: '#de5b00' }}></div>
        <p className="text-muted-foreground leading-relaxed text-lg">
          Information about JesusOnline Ministries, our beliefs, contact details, and account preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          const Wrapper = s.external ? 'a' : Link;
          const wrapperProps = s.external
            ? { href: s.href, target: '_blank', rel: 'noopener noreferrer' as const }
            : { href: s.href };
          return (
            <Wrapper
              key={s.title}
              {...(wrapperProps as any)}
              className="group block bg-white border border-border rounded p-6 hover:shadow-md transition-all"
              style={{ borderLeft: `4px solid ${s.accent}` }}
              data-testid={`more-${s.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-start gap-4 mb-3">
                <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: `${s.accent}15` }}>
                  <Icon className="w-5 h-5" style={{ color: s.accent }} />
                </div>
                <h2 className="text-lg pt-1.5 group-hover:text-primary transition-colors" style={{ color: '#002f55' }}>{s.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{s.description}</p>
              <span className="inline-flex items-center text-sm font-medium" style={{ color: s.accent }}>
                Open
                <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </span>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
