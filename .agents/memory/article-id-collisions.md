---
name: Article id collisions in site-article generation
description: Multiple channel items can sanitize to the same article id within one sub-topic; output must dedupe.
---

Two channel items with different app slugs (e.g. `22400-6-follow-me` and `22412-1-follow-me`) can both sanitize to the same article id (`follow-me`) inside one sub-topic, and via content-based slug mapping may even resolve to the same WordPress post.

**Why:** article ids are derived by stripping the numeric prefix from the app slug; results are keyed by id, but the output was assembled per work item, so a shared id produced duplicate JSON rows and ambiguous `(subId, articleId)` lookups.

**How to apply:** the generator now dedupes output rows by id per sub-topic. When both items point to the same content, giving them the same `articleId` in channels.ts is correct — both link to the one generated page. After any batch, scan generated JSONs for duplicate ids within a file.
