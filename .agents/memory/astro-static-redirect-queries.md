---
name: Astro static redirect query preservation
description: Development redirects for prerendered routes must run before Astro strips query parameters.
---

Handle development HTTP redirects from the original Node request URL, before Astro's static-route middleware.

**Why:** Astro's middleware context for a prerendered route lost query parameters in an actual preview request, even though the production Worker redirect preserved them. A redirect built from that context silently dropped the query.

**How to apply:** Use the development server setup hook for redirects, retain build-time middleware for HTML transformations, and test real HTTP requests with encoded query parameters. Unit tests of the resolver alone cannot catch this behavior.