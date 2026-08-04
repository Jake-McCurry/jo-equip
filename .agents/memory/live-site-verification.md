---
name: Live-site verification behind Cloudflare
description: How to verify equip.jesusonline.com in production when Cloudflare blocks curl
---
The production site (equip.jesusonline.com) sits behind a Cloudflare managed bot challenge: curl (any UA/headers) and the external-URL screenshot tool both get 403/challenge pages from the workspace.

**Why:** datacenter IPs trip the managed challenge; only trusted fetch infra passes.

**How to apply:** use the `webFetch` callback (web-search skill) in CodeExecution — it passes the challenge and returns page content. It follows redirects silently, so verify a 301 by checking that the returned content/links are those of the *target* URL. Exact status codes can't be observed from the workspace; ask the user or GSC for that if it truly matters.
