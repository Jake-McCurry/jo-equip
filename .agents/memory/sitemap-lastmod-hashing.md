---
name: Sitemap lastmod content-hash pipeline
description: How per-page lastmod is kept accurate on the static EQUIP site, and the build-volatile-HTML trap
---

The sitemap is generated post-build by the hub's `scripts/build-sitemaps.mjs`
(grouped sitemaps + video sitemap + index; hash manifest `sitemap-lastmod.json`
committed at the artifact root). A URL's `lastmod` advances only when its
normalized rendered HTML changes.

**Rule:** rendered pages must not contain build-volatile content, or every
rebuild bumps every lastmod. JSON-LD `dateModified: new Date()` was the
culprit once — replaced with `gitDateOf()` (last git commit date of the
owning content file, `src/data/contentDates.ts`).

**Why:** build-date stamping defeats content-hash lastmod tracking and lies
to Google about freshness.

**How to apply:** when adding anything rendered into page HTML that changes
per build (timestamps, random ids), either derive it from content/git or add
it to the `normalize()` strip list in build-sitemaps.mjs. Verify by building
twice and diffing `sitemap-lastmod.json`.
