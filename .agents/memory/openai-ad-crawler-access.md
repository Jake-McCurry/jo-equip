---
name: OpenAI ad crawler access
description: Confirmed Cloudflare exception tradeoff for ad landing-page crawls with rotating IPs.
---

OpenAI ad setup crawls may use rotating IPs and both OAI-SearchBot and OAI-AdsBot user agents. Do not recommend accumulating individual observed IPs as a durable solution.

**Why:** On 2026-09-24 the user confirmed the crawl succeeded after replacing an IP-specific Cloudflare exception with one scoped to the production hostname, the submitted public landing page (including its trailing-slash variant), GET/HEAD requests, and those two user agents. Only Super Bot Fight Mode was skipped; other protections remained enabled.

**How to apply:** This is an intentionally limited public-page exception, not verified OpenAI identity: user agents can be spoofed. Keep it confined to intended ad landing pages and read requests, retain logging, and do not broaden it to the entire site or all security controls. Cloudflare settings are external to the repository; inspect current events before assuming the same rule is responsible for a later failure.