---
name: Cloudflare run_worker_first gotcha
description: Worker-with-static-assets serves matching assets BEFORE the Worker unless the path is in run_worker_first.
---

Rule: on Cloudflare Worker-with-static-assets deployments, any request whose path matches a file in the assets directory is served directly from the asset store — the Worker's fetch handler never runs — unless the path is listed in `assets.run_worker_first` in `wrangler.jsonc`.

**Why:** staging crawl protection (blocking robots.txt, 404 sitemaps) lived in the Worker but staging still served the production `Allow: /` robots.txt, because only `/api/*` was in `run_worker_first`. SEO team caught it in production validation.

**How to apply:** whenever Worker logic must override or intercept a path that also exists as a static build output (robots.txt, sitemaps, any per-environment response), add that path pattern to `run_worker_first`. Verify with `npx wrangler deploy --dry-run`.
