import React from "react";
import { Languages, Globe, Chrome, Smartphone, ExternalLink } from "lucide-react";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono font-semibold mt-0.5"
        style={{ backgroundColor: 'rgba(0,131,222,0.1)', color: '#0083de' }}
      >
        {n}
      </span>
      <div>
        <h4 className="text-base font-semibold mb-1" style={{ color: '#002f55' }}>{title}</h4>
        <div className="text-muted-foreground leading-relaxed text-sm">{children}</div>
      </div>
    </li>
  );
}

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
        <h1 className="text-4xl md:text-5xl mb-4" style={{ color: '#002f55' }}>Translate this Page</h1>
        <div className="h-0.5 w-12 mb-5" style={{ backgroundColor: '#de5b00' }}></div>
        <p className="text-muted-foreground leading-relaxed text-lg">
          Use Google Translate to read JO EQUIP in your heart language. Pick the option that matches the device or
          browser you're using right now.
        </p>
      </div>

      {/* Method 1: Chrome desktop */}
      <div className="bg-white border border-border rounded p-6 md:p-8 mb-5">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
          <Chrome className="w-6 h-6" style={{ color: '#0083de' }} />
          <h2 className="text-xl font-semibold" style={{ color: '#002f55' }}>Google Chrome (desktop)</h2>
        </div>
        <ol className="space-y-5">
          <Step n={1} title="Right-click anywhere on the page">
            A menu will appear.
          </Step>
          <Step n={2} title='Choose "Translate to [your language]"'>
            Chrome translates the entire page instantly using Google Translate.
          </Step>
          <Step n={3} title="Switch language if needed">
            Click the small Google Translate icon in the address bar, then choose another target language.
          </Step>
        </ol>
      </div>

      {/* Method 2: Mobile (Chrome Android / Safari iOS) */}
      <div className="bg-white border border-border rounded p-6 md:p-8 mb-5">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
          <Smartphone className="w-6 h-6" style={{ color: '#0083de' }} />
          <h2 className="text-xl font-semibold" style={{ color: '#002f55' }}>Mobile (Chrome / Safari)</h2>
        </div>
        <ol className="space-y-5">
          <Step n={1} title="Chrome on Android">
            Tap the three-dot menu (⋮) at the top right, then tap <strong>Translate…</strong> and pick your language.
          </Step>
          <Step n={2} title="Safari on iPhone or iPad">
            Tap the <strong>aA</strong> icon on the left of the address bar, then tap <strong>Translate to [language]</strong>.
            (You may need to enable translation in Settings → Safari → Translate the first time.)
          </Step>
        </ol>
      </div>

      {/* Method 3: Other browsers — Google Translate manually */}
      <div className="bg-white border border-border rounded p-6 md:p-8 mb-8">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border">
          <Globe className="w-6 h-6" style={{ color: '#0083de' }} />
          <h2 className="text-xl font-semibold" style={{ color: '#002f55' }}>Any browser — use Google Translate directly</h2>
        </div>
        <ol className="space-y-5 mb-5">
          <Step n={1} title="Open translate.google.com">
            <a
              href="https://translate.google.com/?sl=en&tl=es&op=websites"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center font-medium hover:underline"
              style={{ color: '#0083de' }}
            >
              Open Google Translate (Websites)
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </Step>
          <Step n={2} title='Choose "Websites"'>
            On the Google Translate site, click the <strong>Websites</strong> tab.
          </Step>
          <Step n={3} title="Paste this address">
            <code className="inline-block mt-1 px-2 py-1 text-xs rounded" style={{ backgroundColor: 'rgba(0,47,85,0.06)', color: '#002f55' }}>
              https://equip.jesusonline.com
            </code>
            <br />Pick your target language and click the arrow.
          </Step>
        </ol>
      </div>

      <div className="p-5 rounded text-sm" style={{ backgroundColor: 'rgba(0,131,222,0.06)', borderLeft: '4px solid #0083de', color: '#002f55' }}>
        <strong>Heads up:</strong> Google Translate is a third-party machine translation. Theological terms may not always
        translate perfectly. For high-fidelity translations in 40+ languages, also visit{' '}
        <a href="https://jesusonline.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
          jesusonline.com
        </a>.
      </div>
    </div>
  );
}
