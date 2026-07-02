---
name: Growth-channel article PDF pipeline (articles:build)
description: How to generate branded article PDFs for newly-added app.jesusonline.com/post/<slug> channel items, and the resolver gotchas.
---

The `articles:build` generator (`scripts/src/articlesBuild.ts`) iterates over
`scripts/data/slug-mapping.json` (app-slug → {wp_id, wp_slug, method}), NOT over
channels.ts. So any newly-added `links.app` slug MUST first be resolved and added
to slug-mapping.json or it gets no PDF and its PDF button stays greyed.

**Resolution (3-tier), replicate when adding slugs:** exact slug == wp.slug →
leading-catalog-number prefix (normalize `.`→`-`; e.g. `20010-…` maps to the one
index post whose slug starts `20010`) → fuzzy title-word Jaccard (≥0.5).
Source of truth for wp_id is the WP REST exact-slug lookup, NOT the local index.

**Why:** `scripts/data/apicontent-index.json` is a STALE snapshot. The fuzzy tier
can map a slug to an old wp_id that now 404s at build time ("wp post N not found").
When a build fails that way, re-resolve via
`GET apicontent.jesusonline.com/wp-json/wp/v2/posts?slug=<app-slug>&_fields=id,slug`
— the live exact-slug id is authoritative (e.g. the 3228x "attributes" series:
index had old ids 475/477/479/481/7074, live posts are 23291–23295).

**How to run** (120s bash limit → chunk it):
`export PUPPETEER_EXECUTABLE_PATH="$(which chromium)"` then
`timeout 115 pnpm --filter @workspace/scripts run articles:build -- --slug=<comma-list> --concurrency=6`.
~80 slugs/chunk ≈ 42s. Full run rebuilds nothing already cached (keyed by WP
`modified`). Manifest `src/data/articles.ts` is rewritten from the whole cache on
each flush, so partial `--slug` runs accumulate correctly.

**Expected unresolvable:** a few app URLs return HTTP 200 on app.jesusonline.com
but have NO post in the WP backend (no slug, no leading-number, no search hit) —
e.g. `22510-006-moving-on`, `22595-fear-not`, `65612-12-i-hate-pain`. These get no
PDF by design; their PDF button stays "coming soon" while APP works. Don't chase them.
