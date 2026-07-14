# Cloudflare Worker & Deployment

Deploys Replit → GitHub (`Jake-McCurry/jo-equip`) → Cloudflare. Production is a Cloudflare **Worker-with-static-assets** (NOT classic Pages): `wrangler.jsonc` declares `main: ./worker/index.js` + `ASSETS` binding → `./dist`. The legacy `functions/` dir is not used.

## Worker (`worker/index.js`)

Single privileged endpoint: `POST /api/subscribe` (book-download email capture → Virtuous CRM). Everything else delegates to `env.ASSETS.fetch(request)`.

**Environment-aware crawl protection (July 2026, SEO-003/004):** staging + production Workers build from the same repo (staging branch → staging Worker; merged to main → prod Worker), so crawl policy is decided per-request from hostname. `PRODUCTION_HOSTNAME = equip.jesusonline.com`: prod serves the static `public/robots.txt` (Allow all + sitemap ref) and sitemaps untouched. ANY other hostname (staging-equip, `*.workers.dev`, previews) gets: blocking `robots.txt` (`Disallow: /`, no-store), 404 for `/sitemap*.xml`, and `X-Robots-Tag: noindex, nofollow` on every response. Automatic for future non-prod deploys. Staging is additionally behind a Cloudflare managed challenge (bots get 403), configured in the CF dashboard, not the repo.

## Secrets & Turnstile

- **Required Worker secrets** (set in CF dashboard, documented in `DEPLOY.md`):
  - `VIRTUOUS_API_KEY` — bearer for CRM writes
  - `TURNSTILE_SECRET_KEY` — **required**; `verifyTurnstile()` fails CLOSED if missing (returns false, logs error). `handleSubscribe()` maps false→200 without scheduling the Virtuous call, so download UX is preserved but no CRM write happens. This prevents an open-relay regression when the secret is forgotten.
- **Turnstile site key** (public, in `src/pages/books.astro` as `TURNSTILE_SITE_KEY`): `0x4AAAAAADTRH1wS2tchk8Tw`. Test key `1x00000000000000000000AA` for local dev. Script is lazy-loaded only when a Download button is clicked.

## Behavior

- **Input validation**: email format-checked; `source` must be in the `VALID_SOURCES` allowlist; `book_id` (optional) must be in `VALID_BOOK_IDS`. `book_title` is accepted by the client contract but NOT forwarded — title resolves from book_id downstream. Turnstile failure returns `200 { ok: true, warning: "verification_failed" }` (download UX preserved, no CRM write, rejection logged).
- **Performance**: Virtuous POST runs via `ctx.waitUntil()` — client gets 200 in ~1ms, never waits on CRM latency. Raw emails never logged; a 12-char SHA-256 prefix `[subscribe:<hash>]` is used as a correlation ID for tracing without storing PII.
- **Virtuous payload**: Household contact, primary individual "Friend Subscriber", Home Email with `isOptedIn` intentionally OMITTED (defaults false in Virtuous — mailbox ownership is unverified; consent must come from a CRM-side double-opt-in automation). `referenceSource` = `source:bookId` when a book_id is present (e.g. `jo-equip-books:who-is-the-real-jesus`), else just `source`; `referenceId` = book_id (omitted when empty). No custom fields — "Book Downloaded" is encoded into `referenceSource` so automation rules can key off it. List/tag assignment lives in Virtuous automations keyed off `referenceSource`.
