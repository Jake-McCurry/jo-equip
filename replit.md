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
  - Form POSTs fire-and-forget to `/api/subscribe` with `{ email, source, book_id, book_title, turnstile_token }`. Endpoint is handled by the Cloudflare Worker at `worker/index.js` (deployment is a Worker-with-static-assets, NOT classic Pages — `wrangler.jsonc` declares `main: ./worker/index.js` + assets binding `ASSETS` pointing at `./dist`). Worker routes `/api/subscribe` to its own handler and delegates everything else to `env.ASSETS.fetch(request)`. Forwards to Virtuous (`POST https://api.virtuoussoftware.com/api/Contact`). Requires `VIRTUOUS_API_KEY` secret in CF Workers dashboard. Endpoint always returns 200 to client (download never blocked); upstream errors logged to Worker logs only. NOTE: classic `functions/` directory is NOT used and was removed — it's the Pages convention, not the Workers convention.
  - **Scaling hardening (May 2026)**:
    - **Cloudflare Turnstile** on the modal: invisible bot check. Site key is a constant `TURNSTILE_SITE_KEY` at the top of `src/pages/books.astro` (public, safe to commit). Currently set to the live `equip.jesusonline.com` Managed widget key `0x4AAAAAADTRH1wS2tchk8Tw` (issued May 2026). CF's universal test key `1x00000000000000000000AA` (always passes) can be temporarily swapped in for local dev. The Turnstile script is loaded `async defer` at the bottom of `/books` only. Widget renders inside the modal form (`div.cf-turnstile`); on submit, the JS reads the token from the injected `cf-turnstile-response` hidden input and includes it in the POST.
    - Worker verifies the token via `https://challenges.cloudflare.com/turnstile/v0/siteverify` if `TURNSTILE_SECRET_KEY` is set in the Worker env. If unset, verification is skipped (logs a warning) — set this secret in CF dashboard to enforce.
    - **`ctx.waitUntil()`**: the Virtuous POST runs in the background. Client gets `200` immediately after Turnstile verification, never waits on CRM latency. Worker CPU per request is ~1ms instead of ~200–500ms.
    - **Email hashing in logs**: raw emails are never logged. A 12-char SHA-256 prefix is used as a correlation ID (`[subscribe:<hash>]`) so duplicate submissions and specific complaints can still be traced without storing PII in CF logs.
  - Virtuous payload: Household contact with one primary individual (firstName "Friend", lastName "Subscriber"), Home Email opted-in, `referenceSource` = source string (e.g. `jo-equip-books`), `referenceId` = book_id, custom field `Book Downloaded` = book_title. List/tag assignment is meant to be done in Virtuous via automation rules keyed off `referenceSource`.
  - Modal is fully accessible: focus trap, Escape to close, focus restoration, role/aria attributes.

### Listen page (`/listen`)

- Free text-to-speech "read this site aloud" instructions, in the main nav slot previously held by Translate.
- Leads with Microsoft Edge's built-in Read Aloud (top pick, orange "Top Pick" badge + orange top-border), then iOS Spoken Content, Android Select to Speak, then Chrome Read Aloud extension as fallback.
- Translate page is unchanged and now lives as a card on `/more` (plum `#7a3a8a` accent).

### SEO / a11y / cache / tracking (site-wide)

- **Sitemap**: `@astrojs/sitemap` integration generates `sitemap-index.xml` + `sitemap-0.xml` at build. Configured with `lastmod: new Date()` so every URL gets a `<lastmod>` stamp on each deploy — signals freshness to Google. Robots.txt at `public/robots.txt` references the sitemap-index.
- **Caching** (`public/_headers`, served by Cloudflare Pages):
  - `/_astro/*` (hashed bundles) → `max-age=31536000, immutable`
  - `/books/*.pdf` and `/books/covers/*` → `max-age=2592000, must-revalidate` (30 days)
  - `/favicon.svg`, `/opengraph.jpg` → `max-age=86400`
  - everything else → `max-age=0, must-revalidate` (HTML revalidates immediately)
  - default headers: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS — 2-year, preload-eligible), `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()` (opts out of powerful APIs we never use + FLoC)
- **SEO tags** (in Layout.astro): canonical URL hardcoded to `https://equip.jesusonline.com` + base-stripped path (so dev hosts don't pollute canonicals); full Open Graph (url/site_name/locale/image+alt+dims); Twitter `summary_large_image`. Per-page `<slot name="head"/>` for JSON-LD. Layout accepts optional `image` + `imageAlt` props to override the default `/opengraph.jpg` — used by `/books/<id>` to set each book's cover as its OG image. `og:image:width/height` (1200×630) are only emitted when using the default OG to avoid lying about dims for arbitrary book-cover aspect ratios.
- **JSON-LD** (extensive per-page coverage):
  - **Home** (`index.astro`): `Organization` (with `email`, `contactPoint`, `sameAs` for cross-domain identity) + `WebSite` graph.
  - **All inner pages**: `BreadcrumbList` via the reusable `src/components/BreadcrumbsLd.astro` component (call with `<BreadcrumbsLd items={[{name,url},...]} />` inside `<Fragment slot="head">`; URLs are root-relative paths — the component prefixes them with the canonical SITE).
  - **`/books`**: `CollectionPage` → `ItemList` of `Book` items (each item's `url` points to its `/books/<id>` detail page), each with `bookFormat: EBook`, `isAccessibleForFree: true`, and a nested `workExample` Book carrying the PDF URL + `ReadAction`.
  - **`/books/<id>`** (per-book detail pages, 9 total): standalone `Book` JSON-LD entity per page, mirroring the ItemList item but with its own `@id`. Each page sets its OG/Twitter image to the book's cover (via `Layout`'s `image` + `imageAlt` props), so social shares of a specific book render with that book's cover instead of the generic site OG. The page is intentionally minimal (cover + title + author + download CTA + back link); the Download CTA is a plain anchor to `/books?download=<id>`, which the existing email-gate JS on the books index picks up and auto-triggers — no JS duplication on the detail pages.
  - **`/playlist/[id]`**: `ItemList` of `VideoObject` items (name, thumbnailUrl ×2, contentUrl, embedUrl, publisher, inLanguage, isFamilyFriendly). `uploadDate` is deliberately omitted because we don't have it — this means Google can index videos but won't show rich video thumbnails in SERPs.
  - **`/channels/<channel>/<subId>`**: `CollectionPage` → `ItemList` of sub-topic items. **NOT FAQPage** — items have no inline answer text (answers live in linked PDFs/videos/app), so FAQPage would violate Google's policy. `ItemList` is the honest, valid choice.
  - **`/about`**: `AboutPage` schema linking to the JOM Organization entity.
  - **`/beliefs`**: `Article` schema with `datePublished` (set via `DATE_PUBLISHED` constant — update if page materially rewritten) and `dateModified` (auto-stamped at build time).
- **Per-page meta descriptions**: every page passes its own `description` prop to Layout. The default (used only as a fallback) is the home description. Search engines now see distinct descriptions per route for better SERP snippets.
- **Image optimization**: book covers live in `src/assets/books/covers/` (NOT `public/`) and are loaded via `src/data/bookCovers.ts` (a `import.meta.glob('../assets/books/covers/*', { eager })` map keyed by file basename). `books.astro` renders them with Astro's `<Image>` from `astro:assets` (`widths={[240,480]}` + `sizes`), producing per-cover `srcset` of optimized webp (90% size reduction at build, ~150KB → ~15KB). Sharp is installed as a direct dep of `@workspace/discipleship-hub` (Astro's image service requires it at the consuming package level).
- **Custom 404** (`src/pages/404.astro`): brand-styled Page Not Found with cards linking to Home, Channels, Playlists, Books, and a tail link to the search page. Astro emits `dist/404.html` automatically; Cloudflare Pages serves it for unknown routes.
- **Static search** (`/search`): Pagefind index built post-build by the `astro-pagefind` integration (added to `astro.config.mjs`). Indexes all 43 pages → `dist/pagefind/`. Search page uses `<Search />` from `astro-pagefind/components/Search` with `uiOptions={{showImages:false, resetStyles:false}}` and pulls `pagefind-ui.css` from `${BASE_URL}/pagefind/pagefind-ui.css`. CSS variables tone the UI to brand colors. Note: Pagefind only works after a build — dev preview shows the empty input. Header has a search icon (lucide `Search`) on both desktop nav and mobile (left of MobileMenu) linking to `/search`.
- **Tracking**: GTM container `GTM-PKJQNCS` hardcoded in Layout.astro and gated on `import.meta.env.PROD` so dev/preview builds don't pollute analytics. Per-book download tracking is done in GTM via the unique PDF URLs (no backend tracking endpoint). GTM runs **in a Web Worker via `@astrojs/partytown`** (`<script type="text/partytown">`) — keeps GTM + GA4 parse/exec off the main thread for mobile PSI. `partytown.forward: ["dataLayer.push", "gtag"]` in `astro.config.mjs` proxies window APIs so any main-thread `dataLayer.push(...)` calls still reach GTM transparently.
- **Performance (May 2026 PSI pass, targeting mobile)**:
  - **Channel hero images recompressed**: `growth.jpg` source was 3600×1228 / 591KB — recompressed to 1280-wide @ q82 mozjpeg (35KB). Same pass on evidence/church. Astro `<Image>` now requests AVIF + webp via `formats={["avif","webp"]}` with `widths={[480,800]}` (matches actual display size) and `quality={70}`. Net: channel art ~94% smaller on the wire.
  - **Turnstile lazy-load on /books**: `https://challenges.cloudflare.com/turnstile/v0/api.js` is no longer in the initial page — it's injected via `ensureTurnstileLoaded()` only when the user actually clicks a Download button. Keeps the third-party request off the critical path for return visitors (who skip the gate via `localStorage`) and bots.
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

### Become a Growing Church (BCG) long-form articles
- Sub-topic id: `become-growing-church` in `src/data/channels.ts`, channelId `church`.
- 12 attributes (May 2026 rewrite): God's Unique Vision for Your Church → A JesusOnline EQUIPPED Church → A Total Life Discipleship Church → A Transformational Teaching Church → A Spirit-dependent Church → A Hope-filled Church → A Focused Worship Church → A Love-demonstrating Relational Church → A Great Commission Church → An Online Outreach Church → An Attractive and Inviting Church → A Model / Example Church.
- `SubTopic.hideNumbers: true` flag suppresses the "1. 2. 3." badge column on the public list (kept the `number` field on items for ItemList JSON-LD ordering only).
- `SubTopicItem.articleId` opt-in: when set, the item's title becomes a link to `/channels/church/become-growing-church/<articleId>` and a "Read Article" button appears in the action row. Items without an articleId are list-only.
- Article bodies live in `src/data/bcgArticles.ts` as a typed-block array (`p`, `h2`, `h3`, `ul`, `ol`, `quote`). Paragraph/list-item strings may contain inline HTML (`<strong>`/`<em>`/`<a>`) — rendered with `set:html` in the page component, so keep them author-controlled. To add a new article: append an entry to `bcgArticles`, then set the matching `articleId` on the SubTopicItem in `channels.ts`. The route picks it up automatically.
- Route: `src/pages/channels/[channelId]/[subId]/[articleId].astro`. `getStaticPaths()` walks all sub-topic items and emits a path only when both the `articleId` is set AND a matching `bcgArticles` entry exists (so referenced-but-not-yet-written articles don't 404 the build).
- Each article page emits its own `Article` JSON-LD with `datePublished` (BCG content refresh date, May 2026) + auto-stamped `dateModified`, BreadcrumbsLd, prev/next nav within the BCG set, and an inline scoped `.bcg-prose` style block (brand navy headings, orange links, blue-bar blockquote).
- Items 1–4 are written (God's Unique Vision, JesusOnline EQUIPPED, Total Life Discipleship, Transformational Teaching). Items 5–12 are list-only until their long-form content is provided.
- **Article figures (NotebookLM illustrations)**: BCG articles support an optional `{ type: "figure", src, alt, caption? }` block in `ArticleBlock`. PNGs live in `src/assets/bcg/` and are loaded via `src/data/bcgImages.ts` (`import.meta.glob` map keyed by file basename, mirroring `bookCovers.ts`). The article renderer uses Astro `<Image>` (widths 480/800/1200, sizes 720px desktop / 100vw mobile, `format="webp"`, q80, lazy). Article #1 currently uses 3 figures: `grow-deep-grow-wide`, `high-quality-nutrients`, `lord-of-the-harvest` — cropped to remove the NotebookLM watermark band from the source pptx (`attached_assets/BGC1_slides_1779306265782.pptx`). Slides 4, 5, 7, 8, 9, 10 from that deck illustrate the Ministry Flourishing Framework / Zone 1–3 and are reserved for the matching later BCG articles.

### Article PDFs (auto-generated from app.jesusonline.com)

EQUIP's channel pages link out to ~606 articles on `app.jesusonline.com/post/<slug>`. Those articles live as posts in the JOM WordPress instance at `apicontent.jesusonline.com` (the JO App is a SPA that consumes that WP REST API). To give users a downloadable, brand-consistent alternative, every linked article is rendered to a branded PDF and surfaced via the existing PDF button on `[subId].astro` (greyed when missing).

- **Generator**: `scripts/src/articlesBuild.ts` — `pnpm --filter @workspace/scripts run articles:build`. Uses **puppeteer** with the Nix-installed system Chromium (138; `installSystemDependencies(["chromium"])`). Puppeteer's bundled-Chrome installer fails in this sandbox (unzip segfault + glibc mismatches), so the script hard-codes the Nix store path with `PUPPETEER_EXECUTABLE_PATH` override for CI.
- **Slug resolution** (`scripts/data/slug-mapping.json`, generated offline): app slug → apicontent WP post via a 3-tier resolver — (1) exact slug match, (2) leading-number prefix match (`^[\d][\d.\-]*?(?=-[a-z])`), (3) fuzzy title-word search via `/wp-json/wp/v2/search` with an "all body words from the slug must appear in the candidate title" gate. Final coverage: **596/606 = 98.3%** (541 exact + 15 prefix + 40 fuzzy). The 10 unresolved are all from a partially-renumbered `22300-*`/`62001-*` devotional series — their PDF buttons stay greyed; patch by adding matching entries to channels.ts or by JOM aligning the slugs upstream.
- **Cache** (`scripts/data/articles-cache.json`): keyed by app slug, stores `{wp_id, modified, bytes, title}`. The generator skips a PDF when `cached.modified === post.modified` AND the file exists on disk — so incremental re-runs only touch upstream-changed articles. The cache is flushed every 20 successful PDFs so a killed run resumes cleanly.
- **Concurrency**: 4–6 puppeteer pages in a single Chromium. Wall clock for full 596 ≈ 8–10 min. The sandbox's 120s bash limit means full builds run as ~7 chunks of `timeout 105 npx tsx ...`; each chunk resumes from the cache.
- **Branded HTML template**: Letter format, Georgia serif body, navy `#002f55` headings, orange `#de5b00` accent rule, light-blue `#0083de` blockquote bar. Cover page leads with "**JesusOnline Equip** / Ministry Resources Hub" (matches main site header treatment), title with the leading catalog number stripped (`^[\d][\d.\-]*\s+`), then "A free resource from JesusOnline Ministries" plus the source URL. Per-page footer carries the same brand line + "Page X of Y" via puppeteer's `footerTemplate`. Body sanitization: drops `<script>`/`<iframe>`, kills WP's `<p class="link-more">`, rewrites root-relative `src`/`href` to absolute `apicontent.jesusonline.com` URLs so images load during the puppeteer render.
- **Output**: `artifacts/discipleship-hub/public/articles/<appSlug>.pdf` (≈70 MB total for 596 articles, mean ~115 KB each). Committed to the repo for v1 — CF Pages Workers-with-assets ships them as static assets. The articles dir is NOT in the `public/_headers` long-cache rule (default 0/must-revalidate applies) — fine since PDFs are large but lazy-fetched.
- **Manifest** (`artifacts/discipleship-hub/src/data/articles.ts`): **AUTO-GENERATED** by the script — do not hand-edit. Exports `articlePdfs` (slug→meta map), `extractAppSlug(url)`, `hasArticlePdf(slug)`, `getArticlePdfMeta(slug)`. Consumed by `[subId].astro` to decide whether to activate an item's PDF button.
- **UI wiring** (`[subId].astro`): per-item PDF href resolution order is now (1) `item.bookId` → existing email-gated `/books?download=...` flow, (2) `item.links.pdf` → explicit external override, (3) `item.links.app` → if its slug has a generated PDF, link directly to `/articles/<slug>.pdf` (no email gate — these are read-only article reprints). Items with no resolution stay greyed with the "PDF coming soon" tooltip.
- **Site speed**: zero impact on page loads — PDFs are static files fetched only on click, not on page render. No new third-party scripts, no extra hydration, no extra HTML on the channel page (manifest is tree-shaken to just the lookup function for the slugs referenced).
- **Regenerating after content changes**: re-run `pnpm --filter @workspace/scripts run articles:build`. The script re-fetches every post's `modified` timestamp and only rebuilds drifted ones, so subsequent runs are fast (seconds for an unchanged corpus). Use `--force` to rebuild everything, `--slug=<app-slug>` to rebuild one, `--limit=N` to spot-check.

### Channel index page (`src/pages/channels/[channelId]/index.astro`)
- Sub-topic cards show three orange badges: **PDF**, **Playlist**, **App**.
- The PDF badge (was "Book") activates when the sub-topic OR any of its items has either a `bookId` (email-gated book download) OR an `app` link whose slug resolves via `hasArticlePdf(extractAppSlug(...))` in `src/data/articles.ts` (auto-generated article PDF). Per-item PDFs are resolved on the `[subId].astro` page itself; the channel-index badge just links there.
- The welcome page (`src/pages/welcome.astro`) uses the SAME compact channel-card layout as the home page (hero image + tagline + description + Explore CTA) — the long bulleted sub-topic list was removed May 2026.

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
