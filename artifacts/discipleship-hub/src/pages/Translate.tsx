import React from "react";
import { Languages, Globe } from "lucide-react";

export default function Translate() {
  return (
    <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(0,131,222,0.1)' }}>
            <Languages className="w-5 h-5" style={{ color: '#0083de' }} />
          </div>
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#0083de' }}>
            Multilingual Access
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl mb-4" style={{ color: '#002f55' }}>Translate</h1>
        <div className="h-0.5 w-12 mb-5" style={{ backgroundColor: '#de5b00' }}></div>
        <p className="text-muted-foreground leading-relaxed text-lg">
          JO EQUIP resources are being made available in many languages so disciple-makers
          everywhere can serve in the heart language of their people.
        </p>
      </div>

      <div className="bg-white border border-border rounded p-8 md:p-10">
        <div className="flex items-start gap-5">
          <div className="shrink-0 w-12 h-12 rounded flex items-center justify-center" style={{ backgroundColor: 'rgba(0,47,85,0.07)' }}>
            <Globe className="w-6 h-6" style={{ color: '#002f55' }} />
          </div>
          <div>
            <h2 className="text-xl mb-2" style={{ color: '#002f55' }}>Translation feature coming soon</h2>
            <p className="text-muted-foreground leading-relaxed">
              We're working to bring on-page language switching and translated resources directly here.
              In the meantime, the JesusOnline ministry already produces content in 40+ languages —
              visit <a href="https://jesusonline.com" target="_blank" rel="noopener noreferrer" className="font-medium hover:underline" style={{ color: '#0083de' }}>jesusonline.com</a> for current language options.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
