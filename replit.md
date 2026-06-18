# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies. See the `pnpm-workspace` skill for structure and TS setup.

## Stack

- pnpm workspaces · Node 24 · TypeScript 5.9
- API: Express 5 · PostgreSQL + Drizzle ORM · Zod (`zod/v4`) · Orval (OpenAPI codegen) · esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## JO EQUIP (artifacts/discipleship-hub)

Static-first Astro site. Deploys Replit → GitHub (`Jake-McCurry/jo-equip`) → Cloudflare. Production is a Cloudflare **Worker-with-static-assets** (NOT classic Pages): `wrangler.jsonc` declares `main: ./worker/index.js` + `ASSETS` binding → `./dist`. The legacy `functions/` dir is not used.

**Brand**: navy `#002f55`, blue `#0083de`, orange `#de5b00` (orange reserved for links/accents). Channel accents: Evidence slate-blue `#3b5a99`, Growth sage `#4c8a4c`, Church plum `#7a3a8a`. No DB / auth / per-user server state.

**Brand contact**: `equip@jesusonline.com` (footer, `/more` Contact card, `/newsletter` fallback).

### Cloudflare Worker (`worker/index.js`)

Single privileged endpoint: `POST /api/subscribe` (book-download email capture → Virtuous CRM). Everything else delegates to `env.ASSETS.fetch(request)`.

- **Required Worker secrets** (set in CF dashboard, documented in `DEPLOY.md`):
  - `VIRTUOUS_API_KEY` — bearer for CRM writes
  - `TURNSTILE_SECRET_KEY` — **required**; `verifyTurnstile()` fails CLOSED if missing (returns false, logs error). `handleSubscribe()` maps false→200 without scheduling the Virtuous call, so download UX is preserved but no CRM write happens. This prevents an open-relay regression when the secret is forgotten.
- **Turnstile site key** (public, in `src/pages/books.astro` as `TURNSTILE_SITE_KEY`): `0x4AAAAAADTRH1wS2tchk8Tw`. Test key `1x00000000000000000000AA` for local dev. Script is lazy-loaded only when a Download button is clicked.
- **Performance**: Virtuous POST runs via `ctx.waitUntil()` — client gets 200 in ~1ms, never waits on CRM latency. Raw emails never logged; a 12-char SHA-256 prefix `[subscribe:<hash>]` is used as a correlation ID for tracing without storing PII.
- **Virtuous payload**: Household contact, primary individual "Friend Subscriber", Home Email opted-in, `referenceSource` = source (e.g. `jo-equip-books`), `referenceId` = book_id, custom field `Book Downloaded` = book_title. List/tag assignment lives in Virtuous automations keyed off `referenceSource`.

### Books page (`/books`)

- 9 PDFs in `public/books/`, covers in `src/assets/books/covers/` (NOT `public/`; loaded via `src/data/bookCovers.ts` import.meta.glob map, rendered with `<Image>` for ~90% size reduction).
- Order + metadata in `src/data/books.ts`.
- Email gate: modal on first download, remembered in `localStorage` under `jo_equip_subscribed_v1` as a non-sensitive boolean flag `"1"` (in-memory fallback for strict modes). Raw email addresses are never persisted in browser storage — only forwarded to the Worker then discarded client-side. On first load, any legacy `jo_equip_email_v1` entry (which stored raw email) is migrated to the new key and erased. Fire-and-forget POST to `/api/subscribe` with Turnstile token. Endpoint always returns 200 — downloads never blocked. Modal is fully accessible (focus trap, Esc, focus restore, ARIA).
- `/books/<id>` per-book detail pages set OG image to the book's cover; Download CTA is just `<a href="/books?download=<id>">` — the books index JS auto-triggers the gated download.
- Deep link: `/books?download=<bookId>` scrolls + triggers gate (gate NOT bypassed).

### Listen / Translate / More

- `/listen`: TTS instructions (Edge Read Aloud "Top Pick", then iOS Spoken Content, Android Select to Speak, Chrome extension fallback). Holds the main-nav slot that used to be Translate.
- `/translate`: moved to a card on `/more`.

### Newsletter (`/newsletter`)

Placeholder form. On submit JS shows a thank-you pointing to `equip@jesusonline.com` until Mailchimp embed is wired in. Linked from hero CTA, `/more`, footer.

### SEO / a11y / cache / tracking

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
- **Tracking**: GTM `GTM-PKJQNCS` in `Layout.astro`, gated on `import.meta.env.PROD`. Runs in a Web Worker via `@astrojs/partytown` (`partytown.forward: ["dataLayer.push", "gtag"]` proxies main-thread calls). Per-book download tracking done in GTM via unique PDF URLs.
- **Performance pass (May 2026)**: channel hero JPGs recompressed to 1280-wide @ q82 mozjpeg (~94% smaller). Astro `<Image>` requests AVIF+webp via `formats={["avif","webp"]}`, `widths={[480,800]}`, `quality={70}`. Turnstile script lazy-injected only on Download click.
- **Accessibility**: skip-to-main-content link; `aria-current="page"` on active nav (desktop + mobile); `MobileMenu.tsx` locks body scroll, focuses first link, restores focus on close, Esc-to-close; brand-colored `:focus-visible` ring (`outline: 2px solid #de5b00`); `prefers-reduced-motion` disables animations; footer text contrast 0.7–0.75 alpha.

### Channels system

Data lives in `src/data/channels.ts` (channels + sub-topics + per-item links). `ChannelArt.astro` renders the per-channel JPG (`src/assets/channels/`) grayscaled + brightened with `mix-blend-mode:multiply` over the parent's gradient (duotone effect). **DO NOT** add `position:relative` to its wrapper — conflicts with `absolute inset-0` from `index.astro` and collapses to 0×0.

**Welcome page** (`src/pages/welcome.astro`) uses the same compact 3-card layout as the home page — hero + tagline + description + Explore CTA. No sub-topic lists.

**Channel index** (`src/pages/channels/[channelId]/index.astro`) shows orange badges: **PDF**, **Playlist**, **App**. The PDF badge (formerly "Book") is active when the sub-topic or any item has either a `bookId` (email-gated book download) OR an `app` link whose slug resolves via `hasArticlePdf(extractAppSlug(...))` from `src/data/articles.ts` (auto-generated article PDF). Per-item PDF resolution happens on the `[subId].astro` page.

**Sub-topic detail** (`src/pages/channels/[channelId]/[subId].astro`) per-item linking — each `SubTopicItem` declares its own resources:

- `bookId` → matches `id` in `src/data/books.ts`, enables PDF button (links to `/books?download=...`).
- `videoId` → matches a videoId inside the sub-topic's `playlistId`, enables Video button (links to `/playlist/<playlistId>?play=<videoId>` — autoplay).
- `links.pdf` → explicit external PDF override.
- `links.app` → enables App button; if its slug has a generated article PDF, the PDF button activates and links directly to `/articles/<slug>.pdf` (no email gate — read-only reprints).
- Buttons without a corresponding ID stay greyed with a "coming soon" tooltip.
- `SubTopic.playlistId` is required for any `videoId` to resolve.
- Internal links omit `target="_blank"`; external links (App, external `links.*` overrides) keep `target="_blank" rel="noopener noreferrer"`.

### Article PDFs (auto-generated)

~606 channel items link to `app.jesusonline.com/post/<slug>` (JOM WordPress at `apicontent.jesusonline.com`). Every linked article is rendered to a branded PDF and committed to `public/articles/<appSlug>.pdf` (~70 MB total, ~115 KB each).

- **Generator**: `scripts/src/articlesBuild.ts` — `pnpm --filter @workspace/scripts run articles:build`. Puppeteer + Nix system Chromium (138; `PUPPETEER_EXECUTABLE_PATH` override because puppeteer's bundled Chrome installer fails in this sandbox).
- **Slug resolution** (`scripts/data/slug-mapping.json`): 3-tier — exact slug → leading-number prefix → fuzzy title-word search. Coverage 596/606 = 98.3%. 10 unresolved are from a partially-renumbered `22300-*`/`62001-*` devotional series.
- **Cache** (`scripts/data/articles-cache.json`): keyed by app slug. Skips PDF when `cached.modified === post.modified` AND file exists. Flushed every 20 successful PDFs so killed runs resume cleanly.
- **Concurrency**: 4–6 pages in one Chromium. Full run 8–10 min. Sandbox 120s bash limit → runs as ~7 chunks of `timeout 105 npx tsx ...`.
- **Template**: Letter, Georgia serif, navy headings, orange rule, blue blockquote bar. Cover lead "JesusOnline Equip / Ministry Resources Hub". Optional **series eyebrow** above the article title — driven by `coverLeadFor(appSlug)`; currently maps slug prefixes `93610-` / `93621-` / `93660-` → "Joshua Nations" (keep in sync if new JN sub-topics land). Strips leading catalog number from title (`^[\d][\d.\-]*\s+`). Sanitizes `<script>`/`<iframe>`, drops WP `<p class="link-more">`, rewrites root-relative URLs to absolute.
- **Manifest** (`src/data/articles.ts`): **AUTO-GENERATED** — do not hand-edit. Exports `articlePdfs`, `extractAppSlug`, `hasArticlePdf`, `getArticlePdfMeta`. Tree-shaken to just the lookups used.
- **Regenerate**: re-run `articles:build`. Incremental by `modified` timestamp. Flags: `--force`, `--slug=<app-slug>` (also accepts comma-separated list for rebuilding a related set), `--limit=N`.

### Become a Growing Church (BCG) long-form articles

- Sub-topic `become-growing-church` in channel `church`. 13 items (June 2026 rewrite from new `.local/bgc_extract/BGC_*.txt` source docs): 12 church-growth models + the supporting article "Anatomy of Obedience" inserted after Total Life Discipleship.
- `SubTopic.hideNumbers: true` suppresses the "01/02/03" badges; `number` is kept on items for ItemList JSON-LD ordering.
- `SubTopicItem.articleId` opt-in: when set, item title becomes a link to `/channels/church/become-growing-church/<articleId>` + a "Read Article" button.
- Article bodies in `src/data/bcgArticles.ts` as typed-block array (`p`, `h2`, `h3`, `ul`, `ol`, `quote`, `figure`). Paragraph/list strings may contain inline HTML (rendered with `set:html`, so keep author-controlled).
- To add an article: append to `bcgArticles` + set matching `articleId` on the SubTopicItem.
- Route `src/pages/channels/[channelId]/[subId]/[articleId].astro` only emits paths where both `articleId` and a matching `bcgArticles` entry exist (so referenced-but-unwritten articles don't 404 the build).
- Each article page emits Article JSON-LD (`datePublished` = May 2026 refresh, `dateModified` = build time), BreadcrumbsLd, prev/next nav within BCG, and scoped `.bcg-prose` styles.
- **Order/IDs (June 2026):** ids/slugs are kept stable for URL durability — item 1 keeps id `gods-unique-vision-for-your-church` but its title is now "A Unique Vision for Kingdom-Focused Growth" (per the new source doc). Channel item order: Vision (1), Equipped (2), Total Life (3), **Anatomy of Obedience** (4, id `anatomy-of-obedience`), Transformational (5), Spirit (6), Hope (7), Love (8), Worship (9), Great Commission (10), Online (11), Attractive (12), Model/Example (13, list-only). Love now precedes Worship to match source order. `bcgArticles` array order == channel item order so prev/next nav flows.
- **Figures:** Vision uses bgc1-1..5, Equipped bgc2-1..7, Total Life bgc3-1/3-5/3-6/3-7, Anatomy bgc3-2/3-3/3-4, Transformational bgc4-1..4. Existing illustrations were KEPT and the new doc text woven around them. Spirit, Hope, Love, Worship, Great Commission, Online, Attractive are text-only (no source images supplied). Anatomy intentionally has no WLL/resource list (its source doc has none); it ends with the register CTA only. Item 12 (A Model / Example Church) stays list-only (no source doc). The repeated "Watch → Learn → Live Resources" block is a shared `WLL` ArticleBlock[] const spread into the articles that use it.
- **Figures**: PNGs in `src/assets/bcg/` → `src/data/bcgImages.ts` (import.meta.glob map). Rendered with `<Image>` (widths 480/800/1200, `format="webp"`, q80, lazy). Source deck: `attached_assets/BGC1_slides_1779306265782.pptx` — slides 4/5/7/8/9/10 illustrate the Ministry Flourishing Framework / Zone 1–3 and are reserved for later BCG articles.
- **Resource-list interlinking**: the "(PDF • Video • App)" resource lists near the end of several articles link each resource *name* to its matching Channels sub-topic page (`/channels/<channelId>/<subId>`) via inline `<a>` in the list-item HTML. Only resources with a clear sub-topic match are linked (e.g. Forever Loved series → growth/forever-loved, Hope in Times of Crisis → growth/hope-times-crisis, the "From Building Blocks for Maturity" items → growth/building-blocks); unmatched ones (Experience God's Love playlist, Timeless Love, Love Bible studies, One Another series, the Holy Spirit Resources list, Part 2: Kingdom Perspective) stay plain text. The PDF generator rewrites these root-relative hrefs to absolute `equip.jesusonline.com` URLs.
- **Per-article PDFs**: each BCG article is rendered to a branded PDF at `public/articles/bcg/<articleId>.pdf` (note the `bcg/` subfolder — keeps them clear of the WordPress-sourced `/articles/*.pdf` set). Generator: `scripts/src/bcgPdfBuild.ts` — `pnpm --filter @workspace/scripts run bcg:pdf` (`--id=<id[,id]>` to rebuild a subset, `--concurrency=N`). Unlike `articles:build` (WP REST), this dynamically imports `bcgArticles.ts` at runtime (Puppeteer + Nix Chromium), inlines figure PNGs as base64 data URIs (only `data:` requests allowed during render), rewrites root-relative `href="/…"` → `https://equip.jesusonline.com/…`, then runs a Ghostscript `/ebook` pass to downsample figures (figure-heavy PDFs ~6–9 MB raw → ~400–600 KB). Same branded template as the WP PDFs; cover series-lead is "Become a Growing Church", cover line reads "A free resource from JesusOnline." Emits manifest `src/data/bcgArticlePdfs.ts` (**AUTO-GENERATED** — `hasBcgArticlePdf(id)`); the article page (`[articleId].astro`) shows a channel-accent "Download PDF" button only when the id is in the manifest. **Regenerate the PDFs + manifest whenever `bcgArticles.ts` changes.**

### Internal pages

`/about` (mission, vision, 4-step strategy, history), `/beliefs` (Statement of Faith, with `DATE_PUBLISHED` constant — update if materially rewritten), `/newsletter` (placeholder). Content sourced from jesusonlineministries.org but consolidated.

### Footer

About → `/about` · Beliefs → `/beliefs` · Newsletter → `/newsletter` · Privacy → external `https://jesusonlineministries.org/privacy-policy/` · Contact → `mailto:equip@jesusonline.com`. Terms link removed.
