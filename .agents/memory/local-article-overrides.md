---
name: Local article overrides
description: Replacing a JO app article + PDF with ministry-supplied content (docx) instead of the WP source
---
When JOM hands us updated article content directly (docx), the WP source is stale — do NOT let the article PDF builder refetch it.

**How to apply:** two artifacts must be updated together for a replaced article:
1. On-site page: blocks in `src/data/generated/articles/<sub-topic>.json` (p/quote use `html`, ol/ul use `items`).
2. PDF: put an HTML fragment in `scripts/data/local-articles/<appSlug>.html` and set `localHtml` + `title` on the slug's entry in `scripts/data/slug-mapping.json`, then run `articles:build --slug=<appSlug>`. `localHtml` supersedes `frozen` and skips the WP fetch; cache key is `local:<mtime>`.

**Why:** the article PDF pipeline otherwise fetches WordPress and would overwrite the ministry's replacement on the next full build.
