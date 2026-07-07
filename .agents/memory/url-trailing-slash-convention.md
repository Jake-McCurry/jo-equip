---
name: JO EQUIP URL trailing-slash convention
description: discipleship-hub uses no-trailing-slash URLs everywhere except the site root; canonical, sitemap, and internal links must all agree.
---

# JO EQUIP (discipleship-hub) URL form

All URLs are **no trailing slash**, with **one exception: the site root keeps its slash** (`https://equip.jesusonline.com/`).

This form must be identical across four surfaces, or Google reports "Alternate page with proper canonical tag" and refuses to index the submitted URLs:

1. **Canonical tags** — `Layout.astro` strips the trailing slash on every path except `/`.
2. **Sitemap** — `@astrojs/sitemap` defaults to *adding* trailing slashes under `trailingSlash: "ignore"`. A `serialize` in `astro.config.mjs` strips the slash on all non-root URLs to re-align with canonical.
3. **Internal links** — the `join`/base helpers build paths without trailing slashes.
4. **Edge serving** — `wrangler.jsonc` sets `assets.html_handling: "drop-trailing-slash"`. Cloudflare's default (`auto-trailing-slash`) *redirects* `/page` → `/page/` for directory-index assets — the opposite of the canonical tags, so every canonical would point at a redirecting URL. `drop-trailing-slash` serves `/page` at 200 and 301s `/page/` → `/page`; root `/` unaffected; only asset serving is touched (`/api/*` runs worker-first).

**Why:** A canonical of `/about` plus a sitemap entry of `/about/` are different URL strings to Google; it consolidates to the canonical and flags the sitemap variant as a non-indexed alternate. This affected ~all pages once (only `/` was unaffected because both forms agree there).

**How to apply:** If you ever change Astro's `trailingSlash`, the sitemap `serialize`, or the canonical logic, change all three together and keep the root's slash. Utility pages are also excluded from the sitemap via a `filter` (currently `/thank-you` — noindex — and `/search` — internal results).
