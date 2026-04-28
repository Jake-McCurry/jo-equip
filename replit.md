# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## JO EQUIP (artifacts/discipleship-hub)

Static-first Astro site, deployed Replit → GitHub (Jake-McCurry/jo-equip) → Cloudflare Pages.
Brand: #002f55 navy, #0083de blue, #de5b00 orange. No DB / auth / per-user server state.

### Books page (`/books`)

- 9 free downloadable PDFs in `public/books/`, covers in `public/books/covers/`.
- Display order and metadata defined in `src/data/books.ts`.
- Email gate before first download:
  - Modal collects email; remembered in `localStorage` under `jo_equip_email_v1` (with in-memory fallback for private/strict modes).
  - Subsequent downloads on the same browser bypass the modal.
  - Form POSTs fire-and-forget to `/api/subscribe` with `{ email, source, book_id, book_title }` — endpoint NOT YET IMPLEMENTED. Downloads work regardless (404 doesn't block).
  - Modal is fully accessible: focus trap, Escape to close, focus restoration, role/aria attributes.
- TODO: Add Cloudflare Pages Function at `functions/api/subscribe.js` to forward emails to Virtuous CRM (user is mid-transition from Mailchimp → Virtuous; needs API key + list/segment ID).

### SEO / a11y / cache / tracking (site-wide)

- **Sitemap**: `@astrojs/sitemap` integration generates `sitemap-index.xml` + `sitemap-0.xml` at build. Robots.txt at `public/robots.txt` references the sitemap-index.
- **Caching** (`public/_headers`, served by Cloudflare Pages):
  - `/_astro/*` (hashed bundles) → `max-age=31536000, immutable`
  - `/books/*.pdf` and `/books/covers/*` → `max-age=2592000, must-revalidate` (30 days)
  - `/favicon.svg`, `/opengraph.jpg` → `max-age=86400`
  - everything else → `max-age=0, must-revalidate` (HTML revalidates immediately)
  - default headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`
- **SEO tags** (in Layout.astro): canonical URL hardcoded to `https://equip.jesusonline.com` + base-stripped path (so dev hosts don't pollute canonicals); full Open Graph (url/site_name/locale/image+alt+dims); Twitter `summary_large_image`. Per-page `<slot name="head"/>` for JSON-LD.
- **JSON-LD**: home page (index.astro) injects an Organization + WebSite graph via the head slot.
- **Tracking**: GTM container `GTM-PKJQNCS` hardcoded in Layout.astro and gated on `import.meta.env.PROD` so dev/preview builds don't pollute analytics. Per-book download tracking is done in GTM via the unique PDF URLs (no backend tracking endpoint).
- **Accessibility**:
  - Skip-to-main-content link (visually hidden until focused) at top of every page; `<main id="main-content">`.
  - `aria-current="page"` on the active nav link in both desktop nav and mobile menu.
  - Mobile menu (MobileMenu.tsx) locks body scroll while open, focuses the first link on open, restores focus to the trigger on close, supports Escape-to-close.
  - Brand-colored `:focus-visible` ring (`outline: 2px solid #de5b00`) for keyboard users only.
  - `prefers-reduced-motion` media query disables animations/transitions for users who request it.
  - Footer text contrast bumped to 0.7–0.75 alpha.
- **Internal pages**: `/about` (mission, vision, 4-step strategy, history) and `/beliefs` (Statement of Faith, Core Beliefs grouped by theme: God, Jesus Christ, Mankind & Salvation, The Holy Spirit, Church & Eternity, Great Commission). Sourced from jesusonlineministries.org but consolidated, not copy-pasted.
- **Footer**: Privacy → external `https://jesusonlineministries.org/privacy-policy/`. Contact → external `https://jesusonline.com/send-comment/`. Terms link removed entirely. About → `/about`, Beliefs → `/beliefs`.

### Channel sub-topic cross-links (`src/pages/channels/[channelId]/[subId].astro`)
- Per-item linking. Each `SubTopicItem` in `src/data/channels.ts` independently declares which resources exist for that specific question:
  - `bookId?: string` → matches an `id` in `src/data/books.ts`. Enables the PDF button on this item only.
  - `videoId?: string` → matches a `videoId` inside the sub-topic's `playlistId`. Enables the Video button on this item only.
  - `links?.app` → enables the App button.
  - Buttons without a corresponding ID stay grayed out (with a "coming soon" tooltip).
- `SubTopic.playlistId` is required for any `item.videoId` to resolve (it tells us which playlist to deep-link into) but does not by itself enable any buttons.
- Internal links omit `target="_blank"`; external links (App, external `links` overrides) keep `target="_blank" rel="noopener noreferrer"`.
- Deep-link contracts:
  - `/books?download=<bookId>` — auto-scrolls to the book card with `id={bookId}` and triggers its existing email-gate-then-download flow (gate is NOT bypassed).
  - `/playlist/<playlistId>?play=<videoId>` — auto-scrolls to `<li id="video-<videoId>">` and replaces the YouTube facade with an autoplay iframe.
- Current per-item mappings (Evidence channel):
  - `jesus-true-identity` (playlistId: who-is-the-real-jesus): item #1 has bookId `who-is-the-real-jesus` + videoId; items #2, #3, #7, #8 have videoId only; items #4, #5, #6, #9, #10, #11 have App only.
  - `existence-of-god` (playlistId: science-and-the-origin-of-life): item #1 has videoId only; items #2–#7 have nothing yet (no app links set either).
  - `reliability-of-the-bible`: no playlist or book mappings yet.
