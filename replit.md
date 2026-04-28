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
- **JSON-LD**: home page (index.astro) injects an Organization + WebSite graph via the head slot. Inner pages emit a `BreadcrumbList` graph via the reusable `src/components/BreadcrumbsLd.astro` component (call with `<BreadcrumbsLd items={[{name,url},...]} />` inside `<Fragment slot="head">`; URLs are root-relative paths — the component prefixes them with the canonical SITE).
- **Per-page meta descriptions**: every page passes its own `description` prop to Layout. The default (used only as a fallback) is the home description. Search engines now see distinct descriptions per route for better SERP snippets.
- **Image optimization**: book covers live in `src/assets/books/covers/` (NOT `public/`) and are loaded via `src/data/bookCovers.ts` (a `import.meta.glob('../assets/books/covers/*', { eager })` map keyed by file basename). `books.astro` renders them with Astro's `<Image>` from `astro:assets` (`widths={[240,480]}` + `sizes`), producing per-cover `srcset` of optimized webp (90% size reduction at build, ~150KB → ~15KB). Sharp is installed as a direct dep of `@workspace/discipleship-hub` (Astro's image service requires it at the consuming package level).
- **Custom 404** (`src/pages/404.astro`): brand-styled Page Not Found with cards linking to Home, Channels, Playlists, Books, and a tail link to the search page. Astro emits `dist/404.html` automatically; Cloudflare Pages serves it for unknown routes.
- **Static search** (`/search`): Pagefind index built post-build by the `astro-pagefind` integration (added to `astro.config.mjs`). Indexes all 43 pages → `dist/pagefind/`. Search page uses `<Search />` from `astro-pagefind/components/Search` with `uiOptions={{showImages:false, resetStyles:false}}` and pulls `pagefind-ui.css` from `${BASE_URL}/pagefind/pagefind-ui.css`. CSS variables tone the UI to brand colors. Note: Pagefind only works after a build — dev preview shows the empty input. Header has a search icon (lucide `Search`) on both desktop nav and mobile (left of MobileMenu) linking to `/search`.
- **Tracking**: GTM container `GTM-PKJQNCS` hardcoded in Layout.astro and gated on `import.meta.env.PROD` so dev/preview builds don't pollute analytics. Per-book download tracking is done in GTM via the unique PDF URLs (no backend tracking endpoint).
- **Accessibility**:
  - Skip-to-main-content link (visually hidden until focused) at top of every page; `<main id="main-content">`.
  - `aria-current="page"` on the active nav link in both desktop nav and mobile menu.
  - Mobile menu (MobileMenu.tsx) locks body scroll while open, focuses the first link on open, restores focus to the trigger on close, supports Escape-to-close.
  - Brand-colored `:focus-visible` ring (`outline: 2px solid #de5b00`) for keyboard users only.
  - `prefers-reduced-motion` media query disables animations/transitions for users who request it.
  - Footer text contrast bumped to 0.7–0.75 alpha.
- **Internal pages**: `/about` (mission, vision, 4-step strategy, history), `/beliefs` (Statement of Faith), and `/newsletter` (placeholder Mailchimp signup). Content sourced from jesusonlineministries.org but consolidated, not copy-pasted.
- **Newsletter** (`/newsletter`): Placeholder form (name + email + Subscribe). On submit JS prevents default and shows a thank-you message pointing users to `equip@jesusonline.com` until the Mailchimp embed is wired in (planned). Linked from hero "Make and Multiply Disciples" pill (now a CTA below the Welcome button), `/more`, and footer.
- **Channel palette (palette B)**: Orange (#de5b00) is now reserved for links/accents only. Channel colors: Evidence = slate-blue #3b5a99, Growth = sage #4c8a4c, Church = plum #7a3a8a. `src/data/channels.ts` holds accentColor + gradient per channel; `ChannelArt.astro` renders a per-channel JPG (in `src/assets/channels/`) grayscaled + brightened with `mix-blend-mode:multiply` over the parent's gradient, producing a duotone tinted-photo look (DO NOT add `position:relative` to ChannelArt's wrapper — it conflicts with the `absolute inset-0` className from index.astro and collapses the wrapper to 0×0).
- **Brand contact**: `equip@jesusonline.com` is the EQUIP-specific contact email. Used on `/more` (Contact card → mailto), in the footer's Organization column, and on `/newsletter` as the manual subscribe fallback. The legacy `https://jesusonline.com/send-comment/` link has been removed.
- **Footer**: Privacy → external `https://jesusonlineministries.org/privacy-policy/`. Contact → `mailto:equip@jesusonline.com`. Newsletter → `/newsletter`. Terms link removed entirely. About → `/about`, Beliefs → `/beliefs`.

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
