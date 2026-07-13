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

Static-first Astro site. Deploys Replit → GitHub (`Jake-McCurry/jo-equip`) → Cloudflare Worker-with-static-assets (NOT classic Pages). No DB / auth / per-user server state.

**Brand**: navy `#002f55`, blue `#0083de`, orange `#de5b00` (orange reserved for links/accents). Channel accents: Evidence slate-blue `#3b5a99`, Growth sage `#4c8a4c`, Church plum `#7a3a8a`. Contact: `equip@jesusonline.com`.

**Site commands** (run in `artifacts/discipleship-hub` or via `--filter @workspace/discipleship-hub`):

- `pnpm run build` — full static build (165 pages, ~15s)
- `pnpm --filter @workspace/scripts run articles:build` — regenerate WordPress article PDFs (incremental; `--force`, `--slug=`, `--limit=`)
- `pnpm --filter @workspace/scripts run bcg:pdf` — regenerate BCG article PDFs + manifest (run whenever `bcgArticles.ts` changes)
- `pnpm --filter @workspace/scripts run bsm:pdf` — regenerate Bible-study-methods / Sermon Toolbox article PDFs
- `pnpm --filter @workspace/scripts run covers:build` — regenerate all book cover thumbnails from PDF page 1 (uniform 900px height; run after adding/replacing any book PDF; `hearing-the-voice-of-god` excluded — hand-picked cover)

**Detailed docs** (in `artifacts/discipleship-hub/docs/`):

- `worker-and-deploy.md` — Cloudflare Worker (`POST /api/subscribe` → Virtuous CRM), required secrets (`VIRTUOUS_API_KEY`, `TURNSTILE_SECRET_KEY` — Turnstile fails CLOSED if missing), staging crawl protection, deploy pipeline.
- `site-structure.md` — Books page + email gate, Newsletter (shared Mailchimp form), Home/Welcome/Reviews/Listen/More pages, footer, SEO / JSON-LD / cache headers / tracking (GTM, Crazy Egg) / accessibility.
- `channels-and-content.md` — Channels data model (`src/data/channels.ts`), channel index + sub-topic page conventions, per-item resource linking (bookId/videoId/links), WordPress article-PDF pipeline, BCG long-form articles + figures + PDFs.

**Critical gotchas** (full context in the docs above):

- `src/data/articles.ts` and `src/data/bcgArticlePdfs.ts` are **AUTO-GENERATED** — never hand-edit; regenerate via the scripts.
- Do NOT add `position:relative` to the `ChannelArt.astro` wrapper — collapses the channel art to 0×0.
- Do NOT re-add Partytown for GTM (removed July 2026 — it hid the container from Tag Assistant/scanners).
- `TURNSTILE_SECRET_KEY` is required in production — the subscribe flow fails closed without it (downloads work, no CRM write).
- The Mailchimp signup form is shared between `/newsletter` and the Church newsletter page — edit only `MakeMultiplySignupForm.astro`.
- Raw subscriber emails are never persisted in browser storage or logs (localStorage keeps only a boolean flag).
- URLs are no-trailing-slash except root; canonical + sitemap + internal links must agree, and `wrangler.jsonc` `assets.html_handling: "drop-trailing-slash"` enforces it at the edge.
