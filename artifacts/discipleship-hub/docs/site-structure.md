# Site Structure & Pages

## Books page (`/books`)

- 13 PDFs in `public/books/`, covers in `src/assets/books/covers/`. July 2026 additions: Extraordinary Evangelism Student Guide (color front cover prepended as PDF page 1; source began at a plain title page), Eight Great Ways to Honor Your Husband / Wife (David Chadwick), and Soul Prescription: 5 Steps (condensed edition, separate from full Soul Prescription; cover rendered from the PDF's own title page). Covers are NOT in `public/`; loaded via `src/data/bookCovers.ts` import.meta.glob map, rendered with `<Image>` for ~90% size reduction.
- Order + metadata in `src/data/books.ts`.
- Email gate: modal on first download, remembered in `localStorage` under `jo_equip_subscribed_v1` as a non-sensitive boolean flag `"1"` (in-memory fallback for strict modes). Raw email addresses are never persisted in browser storage — only forwarded to the Worker then discarded client-side. On first load, any legacy `jo_equip_email_v1` entry (which stored raw email) is migrated to the new key and erased. Fire-and-forget POST to `/api/subscribe` with Turnstile token. Endpoint always returns 200 — downloads never blocked. Modal is fully accessible (focus trap, Esc, focus restore, ARIA).
- `/books/<id>` per-book detail pages set OG image to the book's cover; Download CTA is just `<a href="/books?download=<id>">` — the books index JS auto-triggers the gated download.
- Deep link: `/books?download=<bookId>` scrolls + triggers gate (gate NOT bypassed).

## Listen / Translate / More

- `/listen`: TTS instructions (Edge Read Aloud "Top Pick", then iOS Spoken Content, Android Select to Speak, Chrome extension fallback). Holds the main-nav slot that used to be Translate.
- `/translate`: moved to a card on `/more`.

## Newsletter (`/newsletter`)

Live Mailchimp signup via shared component `src/components/MakeMultiplySignupForm.astro` (direct POST to `jesusonline.us1.list-manage.com`, honeypot bot field, audience tag 5798198; fields EMAIL/FNAME/CHURCH/COUNTRY/MMERGE8-Gender). The SAME form is used on `/channels/church/make-multiply-disciples-newsletter` (via `MakeMultiplyNewsletter.astro`) — keep them in sync by editing only the shared component. `/newsletter` accent blue `#0083de`; channel page accent plum. Former Virtuous embed removed July 2026. Linked from hero CTA, `/more`, footer.

## Home page

(July 2026 refinement, from user's mobile docx mockup): header logo text is "JO EQUIP" (no "Ministry Resources Hub" subtitle in nav); hero h1 = "Ministry Resources Hub" + tagline (no "JO EQUIP" in hero; Welcome CTA button and welcome teaser section removed per user); 3 channel cards with full-color photos (`<Picture>` avif/webp of `src/assets/channels/*.jpg`, accent bars above/below) showing title + tagline + "Explore X" only (no description paragraph); navy quick-links strip below cards with 4 items: Reviews (`/reviews`), About, Beliefs, JO APP. Church tagline changed "plant"→"build vibrant churches" (channels.ts). `/more` gained Welcome + Reviews cards (Welcome page otherwise orphaned).

## Reviews page (`/reviews`)

Content July 2026 from 4 user docx files: 53 quotes in `src/data/reviews.ts` across 4 categories with anchor ids — `#general` (23, from "Home Page Testimonial" doc), `#evidence` (15), `#growth` (7), `#church` (8). Jump-link pills at top, 2-col quote cards (orange left border), "Share your story" mailto CTA at bottom. Minor curation applied: "Dr." moved into Bernard/Zambia attribution, "(permission granted)" note dropped, "No name"→"Anonymous", "heros"→"heroes".

## Welcome page (`src/pages/welcome.astro`)

July 2026 redesign from user's Welcome docx: eyebrow "JO EQUIP" + h1 "Welcome" + 3 intro paragraphs; "3 Channels for Your Ministry Needs" photo cards (same `<Picture>` pattern as home) with FULL channel description + "Explore N \<Channel> Topics" links — counts computed at build from `subTopics` (top-level only, excludes `parentId` children; currently 3/21/9); "Read the Reviews" section with 4 category link cards → `/reviews#general|#evidence|#growth|#church`. Doc typos ("prayer field, spirit lead") corrected using channels.ts copy; church description "plant churches"→"build churches" per doc. Reachable via `/more` (home hero CTA removed July 2026).

## Internal pages

`/about` (mission, vision, 4-step strategy, history), `/beliefs` (Statement of Faith, with `DATE_PUBLISHED` constant — update if materially rewritten). Content sourced from jesusonlineministries.org but consolidated.

## Footer

About → `/about` · Beliefs → `/beliefs` · Newsletter → `/newsletter` · Privacy → external `https://jesusonlineministries.org/privacy-policy/` · Contact → `mailto:equip@jesusonline.com`. Terms link removed.

## SEO / a11y / cache / tracking

- **Sitemap**: `@astrojs/sitemap` → `sitemap-index.xml` with `lastmod: new Date()` on every deploy. `public/robots.txt` references it.
- **Cache headers** (`public/_headers`, served by CF):
  - `/_astro/*` → `max-age=31536000, immutable`
  - `/books/*.pdf` and `/books/covers/*` → 30 days
  - `/favicon.svg`, `/opengraph.jpg` → 1 day
  - everything else → `max-age=0, must-revalidate`
  - Default security headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, HSTS (2yr + preload), `Permissions-Policy` opting out of camera/mic/geo/payment/usb/interest-cohort.
  - `/articles/*` PDFs are NOT in the long-cache rule (default 0/must-revalidate) — fine since they're large and lazy-fetched.
- **SEO tags** (in `Layout.astro`): canonical hardcoded to `https://equip.jesusonline.com` + base-stripped path. Full OG + Twitter `summary_large_image`. `Layout` accepts `image` + `imageAlt` props for per-page OG override (used by `/books/<id>`). `og:image:width/height` only emitted with the default OG to avoid lying about arbitrary cover aspect ratios.
- **Per-page meta descriptions** on every page.
- **JSON-LD**: home = Organization + WebSite graph (with `sameAs` for cross-domain identity); all inner pages = `BreadcrumbList` via `src/components/BreadcrumbsLd.astro` (URLs are root-relative; component prefixes SITE); `/books` = CollectionPage→ItemList of Books; `/books/<id>` = standalone Book entity; `/playlist/[id]` = ItemList of VideoObject (uploadDate omitted — disables rich video thumbnails but stays honest); `/channels/<c>/<sub>` = CollectionPage→ItemList (NOT FAQPage — answers live in linked PDFs/videos, would violate Google's policy); `/about` = AboutPage; `/beliefs` = Article; BCG article pages emit their own Article schema.
- **Static search** (`/search`): Pagefind via `astro-pagefind`. Only works after build — dev preview shows empty input. Header search icon (lucide `Search`) on desktop + mobile.
- **Custom 404** (`src/pages/404.astro`): brand-styled cards → Home, Channels, Playlists, Books, Search.
- **Tracking**: GTM `GTM-PKJQNCS` in `Layout.astro`, gated on `import.meta.env.PROD`. Standard main-thread snippet (head script + body noscript). Partytown was REMOVED July 2026 — it hid the container from Tag Assistant / GTM Preview / scanners; do not re-add it for GTM. Per-book download tracking done in GTM via unique PDF URLs. Crazy Egg (`script.crazyegg.com/pages/scripts/0010/0959.js`) also in `Layout.astro` head, same PROD gate.
- **Performance pass (May 2026)**: channel hero JPGs recompressed to 1280-wide @ q82 mozjpeg (~94% smaller). Astro `<Image>` requests AVIF+webp via `formats={["avif","webp"]}`, `widths={[480,800]}`, `quality={70}`. Turnstile script lazy-injected only on Download click.
- **Accessibility**: skip-to-main-content link; `aria-current="page"` on active nav (desktop + mobile); `MobileMenu.tsx` locks body scroll, focuses first link, restores focus on close, Esc-to-close; brand-colored `:focus-visible` ring (`outline: 2px solid #de5b00`); `prefers-reduced-motion` disables animations; footer text contrast 0.7–0.75 alpha.
