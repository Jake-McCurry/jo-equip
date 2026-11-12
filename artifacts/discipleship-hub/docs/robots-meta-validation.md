# Robots meta implementation and validation

## Existing architecture

JO EQUIP uses Astro static HTML, not client-side metadata injection. Most pages
share `src/layouts/Layout.astro`; Knowing God has a standalone reader head and
an introduction layout. The main head previously had no default robots tag.
Campaign, confirmation, and Ministry Holy Spirit pages supplied their own
noindex tags through the layout's head slot.

Production `public/robots.txt` allows crawling and links to the sitemap index.
Canonical URLs are defined by the existing layouts. The Cloudflare Worker
blocks non-production robots.txt, suppresses XML sitemaps there, and adds
`X-Robots-Tag: noindex, nofollow` to non-production responses it handles.

## Implementation

`src/components/RobotsMeta.astro` supplies `index, follow` in production and
`noindex, follow` during Astro development. It is used by all three HTML heads:

- `src/layouts/Layout.astro`
- `src/layouts/KnowingGodIntroductionLayout.astro`
- `src/pages/knowing-god.astro`

The main layout renders its existing head slot once and passes it to the shared
component. `src/data/robotsMeta.mjs` detects page-authored directives and does
not emit a competing default. Duplicate or empty authored robots tags fail
explicitly rather than silently overriding a page's indexing decision.

## Exclusions

Preserved existing directives:

- All `/lp/*` campaign, signup, and thank-you content pages.
- `/thank-you` and `/register-church-thank-you`.
- `/categories/growth/ministry-holy-spirit` and its articles, pending the
  previously requested editorial comparison.
- Existing `noindex, nofollow` remains on the two Leader Kit confirmation
  pages and the Leader Kit signup utility page.

Added `noindex, follow` to `/search` and `/404`. Both were already excluded
from XML sitemaps. Public ministry registration and newsletter landing pages
remain indexable; they are public content, not authenticated account pages.
API responses are not HTML content pages and do not receive this meta component.
Astro's two redirect stubs are unchanged.

## Verification

The production compilation and existing build checks passed. The new validator's
initial redirect-stub assumption was corrected; the corrected validator passed
against that same complete production output:

- 1,433 content pages: exactly one robots tag, inside the HTML head.
- 1,410 indexable pages: `index, follow`.
- 23 excluded pages: their expected `noindex` directive.
- 2 Astro redirect stubs excluded from content-page checks.
- No separate Googlebot tags.
- Existing noindex pages remained noindex.
- Titles, descriptions, canonicals, Open Graph, Twitter, and other non-robots
  meta/link/title tags compared identically across all 1,433 pre/post-build pages.
- No changes to structured-data source, robots.txt, or canonical generation.
- Production robots.txt does not block the noindex content pages from crawling.

The test lives in `scripts/robots-meta.test.mjs`. `package.json` runs it after
each production build with `VERIFY_ROBOTS_BUILD=1`, making this a deployment
regression check rather than a one-time inspection.

## Live-site limitation

Direct requests for production HTML received Cloudflare challenge responses.
The challenge's `noindex,nofollow` tag is not the site's robots metadata.
The trusted content fetch could read the homepage but does not expose the raw
HTML head. Therefore production head metadata was not independently verified,
and this report does not claim that these workspace changes are live.

The user must push the changes and complete a successful Cloudflare production
deployment. Then inspect the actual page source, not a challenge page, on
production and representative excluded routes.

## Additional finding — not changed

`wrangler.jsonc` only runs the Worker first for selected paths. Static homepage,
book, and other assets outside those patterns may bypass the Worker's
non-production `X-Robots-Tag` header. Non-production robots.txt and sitemap
blocking remain in place, but this is not equivalent to a noindex header on every
preview response. A production-built staging copy also contains production
robots meta defaults. Fixing universal staging headers requires a separately
reviewed routing/header change; deployment routing was not changed in this task.

## Changed files

- `src/components/RobotsMeta.astro` (new)
- `src/data/robotsMeta.mjs` (new)
- `src/layouts/Layout.astro`
- `src/layouts/KnowingGodIntroductionLayout.astro`
- `src/pages/knowing-god.astro`
- `src/pages/search.astro`
- `src/pages/404.astro`
- `scripts/robots-meta.test.mjs` (new)
- `package.json`
- `docs/robots-meta-validation.md` (this report)
