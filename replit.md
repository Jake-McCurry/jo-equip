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
