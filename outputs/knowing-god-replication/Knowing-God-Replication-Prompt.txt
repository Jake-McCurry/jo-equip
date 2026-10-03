# Copy this entire prompt into the destination Replit project

Replicate the FULL JO EQUIP Knowing God concordance from the attached source archive in this project. This is an implementation request, not a request for a plan, a mockup, or a redesigned interpretation.

## Authoritative inputs and goal

I have supplied:

1. `Knowing-God-Full-Replication-Source.zip`: the current implementation, static content, local NET passage corpus, fonts/assets, content generators and tests, plus a checksum inventory.
2. The original Knowing God document, uploaded separately for source verification.
3. This prompt.

The target is the complete JO EQUIP application at `/knowing-god`, NOT the separate early `knowing-god-concordance` sample prototype. Although the main component is still named `ConcordancePrototype.tsx`, the component under `artifacts/discipleship-hub/src/components/knowing-god/` is the full implementation. Do not mistake its filename or legacy “preview” wording for permission to ship a subset.

I want visual, content and functional parity with the provided implementation. Port the actual code and data; do not recreate it from a description, re-extract everything unnecessarily, replace it with an iframe, or depend on the original site's runtime. The original document alone cannot reproduce all of the interface, curated content corrections, relationships or NET data. If the archive is missing, request it rather than pretending that a document-only reconstruction is an exact replica.

The archive is a curated SOURCE EXPORT, not a complete repository or a ready-to-run replacement for the destination project. Paths preserve the source project structure. Shared files and configuration are provided as integration references; do not overwrite the destination's whole application.

## Protect the destination project

First inspect its framework, package manager, routes, layout, styles, build configuration and existing features. Make additive changes. Do not delete existing pages, change authentication, migrate databases, replace its branding globally, or overwrite its package/workspace/configuration files with source copies.

Keep the concordance and introduction routes at `/knowing-god` and `/knowing-god/introduction` where possible. If these routes already contain unrelated work, ask before replacing it. Keep any necessary destination base-path prefix working throughout.

If the destination already uses compatible Astro + React, integrate the source pages, React island, assets and data there. If it uses a different framework, preserve that application and use the least disruptive isolated Astro + React service/artifact or faithful component integration. Explain any necessary boundary adaptation, but do not replace the destination framework merely for convenience.

Use Replit's current artifact/workflow setup procedures where relevant. Bind services to their assigned PORT, make preview and production routing work, and avoid duplicate workflows. Do not copy old artifact IDs, old service ports or original workspace-specific settings blindly.

Do not commit, push, merge branches or publish without my explicit instruction. Finish with a working preview and a clear verification report.

## Scope and code inventory

The primary source artifact is `artifacts/discipleship-hub`. Relevant files:

- `src/pages/knowing-god.astro`
- `src/pages/knowing-god/introduction/index.astro`
- `src/pages/knowing-god/introduction/[section].astro`
- `src/layouts/KnowingGodIntroductionLayout.astro`
- Everything under `src/components/knowing-god/`
- `src/data/knowingGodIntroductions.ts`
- Everything under `src/data/knowing-god/`
- `src/styles/knowing-god-theme.css`
- Shared `global.css`, `fonts.css`, `brand-tokens.css`
- `src/components/EquipHeader.astro` and its logo asset
- Font files and accompanying licenses
- Entire `public/knowing-god/` directory: topic index, per-letter payloads, quality report, local NET manifest and hashed book assets, introductory reference assets
- `scripts/generate-knowing-god.py` and `scripts/generate-knowing-god-net.py`
- All supplied `scripts/knowing-god-*` tests
- `scripts/data/net-cache/`: retained official-source responses for validation

Reference configuration includes the source package manifest, TypeScript configuration, Astro configuration and workspace catalog. Resolve `catalog:` entries to appropriate real versions in the destination rather than leaving unresolved workspace references. Original dependencies include Astro, its React integration, React/React DOM, Tailwind's Vite integration, TypeScript and lucide-react. Preserve the versions/compatibility represented by the source configuration unless the destination requires a documented adjustment.

The original hub's build pipeline also covers unrelated content and services. Do NOT copy that entire build script and then invent missing unrelated components. Configure only the dependencies and build steps needed for this feature. Astro static output + a hydrated React island + static JSON assets is sufficient for its reader. No database, account, paid API or Bible API credential is needed.

## Content fidelity: use the complete corpus

Treat the shipped corpus and tests as the application content baseline. The original PDF supplies textual authority and audit evidence, not an instruction to discard already validated data.

At export, `public/knowing-god/data/index.json` reports:

- 773 topics
- 124 cross-reference records
- 13,535 passages
- 625 additional-Scripture sections
- 9,431 see-also links
- 2 source markers

These are distinct metrics; do not add the cross-reference count to the topic total without inspecting the schema. Preserve every record, ID, title, definition, passage, citation, source-page value, related-topic link, marker and source attribution. Validate actual payload totals against the manifest. Do not replace the current count with the component's older loading fallback of 13,506.

Preserve supplied per-letter loading and stable topic IDs. Do not renumber, regenerate slugs, alphabetically reassign identifiers, silently truncate passages, substitute translations, paraphrase Scripture, flatten cross-references, or show only representative topics.

Source extraction handled multi-column PDF ordering, discretionary hyphens, page overlaps, source artifacts, and reviewed citation/translation discrepancies. Keep those corrections and regression tests. If a new upload differs from the original document, report the difference instead of silently regenerating over the baseline. The index records the original source filename and SHA-256.

## Exact interface and visual behavior

Copy the source markup, component organization and CSS, retaining:

- JO EQUIP header appearance within this feature.
- Warm ivory reading surfaces, warm neutral sidebars, muted text, navy structure and orange interactive accents.
- `.kg-warm-theme` scoping: do not let these overrides restyle unrelated destination pages.
- The original source typography, including self-hosted Source Sans 3 and the supplied display fonts; Georgia-based reading headings and the supplied Libre Baskerville cover-style treatment.
- Exact current headings, labels, help text, counts, copyright, spacing, borders, selected states, focus rings and empty/loading/error states.
- Desktop maximum width and grid: source uses a 1500px shell, two-column intermediate layout, and three-column large layout, including the reading pane and study/sidebar areas.
- Sticky header/sidebar offsets and independent scroll behavior.
- Mobile “Topics & filters” toggle, selected-topic behavior, usable touch controls and no horizontal overflow.
- A–Z letter buttons, selected and collapsed states, meaningful counts, scrolling alignment and empty-letter behavior as implemented.
- Accessible semantic buttons, labels, aria-expanded/aria-pressed states, visible keyboard focus and status messages.
- Original print stylesheet: hide navigation/filter chrome and display readable topic content without clipping.

Do not replace this with cards, a dashboard, a generic chat interface, an AI search tool, a new design system, or raster screenshots of text.

## Functionality to preserve

1. **Start screen and topic reading:** normal entry shows the source start/introduction view; valid topic deep links open the correct topic. Preserve “Browse the topics,” topic selection and return-to-start behavior.
2. **Navigation/history:** preserve the supplied hash encoding/decoding, browser Back/Forward and direct-link reload behavior. Read `topic-history.mjs`; do not invent a different hash convention.
3. **Topic browsing:** A–Z topic lists load by letter with caching, in-flight request deduplication, visible errors and available retry behavior.
4. **Search:** title search covers the full index, ranking exact, prefix and substring matches as implemented. Definition/passage matches cover already loaded letter payloads. This is NOT a global unloaded full-text search; preserve and accurately describe the existing scope rather than silently claiming broader functionality. Typing a query must not replace the open topic until a result is selected.
5. **Topic scope:** preserve All Topics versus devotional-topic filtering derived from the supplied devotional guide. Preserve selection transitions when the current topic is outside that scope.
6. **Passage filters:** retain Old/New Testament and Bible-book controls and current source behavior; filters apply to the open topic's passages.
7. **Cross-references:** keep source wording and target IDs, including multiple targets and the special browse-all target. Following a cross-reference clears stale search/book/testament filters as in the source.
8. **Additional Scripture:** preserve additional-reference sections, their labels, grouped queries and external Scripture links.
9. **Translations:** NET is the default; KJV uses locally stored source-book wording. Retain the translation selector and persisted preference.
10. **Saved study list:** save/remove topics, revisit them, persist locally across reloads using the existing storage keys and render the original empty state. This is browser-local, not an account-synchronized service.
11. **Copy:** preserve both copy-topic-references and copy-visible-passages actions, translation labels, translation notes and feedback. Verify clipboard behavior in the actual secure preview context. Do not claim success after a failed clipboard operation.
12. **Print:** preserve the existing print actions and print layout; do not invent a PDF export flow as a replacement.

Browser data does not automatically migrate between domains. Existing users' saved study lists on the source site remain on that origin. Preserve the keys and behavior, but do not claim to have transferred their personal saved state.

## NET: locally hosted, not a live API dependency

Copy the entire NET directory and manifest together. Preserve content-hashed filenames and the manifest's passage-to-file mappings. Serve these from the destination project's own static assets.

Reader-time requests must not call Bible.org to acquire text, use an API proxy for text, or fall back to the original JO EQUIP server. Normal builds must not depend on re-downloading the Bible. The supplied NET loader caches local data, deduplicates book loads, bounds concurrency and validates asset shapes; retain that behavior.

Keep loading/error messages honest: a missing local file is a local-asset error, not “Bible.org is unavailable.” Preserve retry controls and explicitly labeled KJV fallback. Never silently label KJV text as NET.

Retain editorial notes for reviewed NET omissions and verse-numbering differences, separate from Scripture. Preserve paragraph breaks for disjoint verse ranges. Do not interpret `Psalm 103:1-5, 11-14` as whole Psalms 11–14. Verify book/chapter/verse coordinates with the provided validators, not merely HTTP success.

The owner has already confirmed written permission to publish Knowing God and permission to use NET in their projects. Preserve all copyright acknowledgements, permissions language and NET links. Do not reopen already confirmed permission as a general implementation blocker or remove the attributions.

## Introductory articles: fully included

Replicate the introduction index and all five article routes:

- `/knowing-god/introduction/about-this-edition`
- `/knowing-god/introduction/dedication`
- `/knowing-god/introduction/foundational-scriptures`
- `/knowing-god/introduction/devotional-guide`
- `/knowing-god/introduction/notable-quotations`

Use the supplied structured introduction data and Astro templates. Preserve wording, emphasis, hymn underlining, Scripture layout, devotion-category groupings, responsive columns where present, breadcrumbs, previous/next links and links back to the concordance. Render selectable semantic HTML, not full-page images or a PDF embed. Introductory source-page images, if supplied, are reference material, not the production article implementation.

## Destination-specific adaptations — explicitly document them

Strict parity permits technical host/path integration changes, not unrequested editorial or design changes.

- All topic, NET, font, image, script and intro-page requests must use the destination's actual base path. No hardcoded localhost, old development host, or fetches to the source site.
- Canonical/OG URLs must use an explicitly confirmed destination production URL if this will be an independently indexed publication. Never mistake a Replit development URL for production. If the publication/canonical policy is unknown, ask and leave production publishing pending; continue implementing and testing locally. Do not inadvertently canonicalize the new independent site to the old one.
- Keep legitimate outward attribution links (NET, Zinzendorf Mission) and the source's external Scripture destinations.
- Preserve the JO EQUIP header visually, but do not create broken local links to hub pages absent in this project. Existing matching destination pages may be used; otherwise retain links as explicit absolute links back to the original JO EQUIP pages. Do not clone the entire hub to satisfy unrelated navigation.
- Source pages import an OpenAI advertising pixel. Do not silently activate the source project's analytics/ad tracking in a different project. Keep it disabled or replace it with destination-approved instrumentation. The reference pixel source is not included; remove/replace its imports as part of that explicit adaptation.
- Do not bring over unrelated mailing-list integration, book signup gates, secrets, authentication, Cloudflare worker routes, global redirects, sitemap pipelines or promotional campaigns.
- If the destination already has global Tailwind/styles, avoid double-loading/reset conflicts; isolate the reader styling and preserve computed appearance.

## Validation and acceptance criteria

Do not report “100% replicated” just because the homepage renders. Verify:

**Source/package integrity**
- Verify archive files against `SOURCE-MANIFEST.json` before copying.
- Verify data files remain byte-for-byte unchanged unless a documented adaptation is necessary; do not edit Scripture data for integration.
- Validate all indexed payloads, topic IDs, counts and cross-reference target IDs.
- Validate every NET manifest target exists and contains all expected references.

**Automated checks**
- Run destination typechecking and production build.
- Port/run the supplied Python content/source validation tests and JavaScript passage, NET corpus, NET loader and navigation regression tests.
- The original package exposes `test:knowing-god` and `validate:knowing-god`; inspect their definitions and dependencies instead of blindly copying the whole hub build.
- Generator scripts contain original root paths/PDF filenames. Adapt only those paths if necessary. Keep source content and comparison logic unchanged. Use the uploaded original document for source-validation checks, not an arbitrary newer manuscript.
- Use cached official NET source responses for validation; avoid network regeneration. Report explicitly any unavailable check instead of fabricating a pass.

**Browser/interaction checks**
- Desktop and mobile: start screen, A–Z navigation, topic view, search, devotional scope, book/testament filters, saved list, NET/KJV switching, copy, print and intro navigation.
- Reload a topic deep link and test browser Back/Forward.
- Follow a cross-reference after applying filters and verify the destination is not incorrectly empty.
- Confirm saved topics and translation preference survive reload.
- Test representative disjoint ranges and reviewed translation exceptions from the supplied tests.
- Simulate a failed local NET asset and confirm honest error, retry and labeled fallback.
- Check focus/keyboard controls, mobile widths, long references and print overflow.
- Check browser console and network requests for failed assets, unintended runtime Bible API calls or source-site content dependencies.

Use the original source-rendered implementation as the visual authority. Any historic screenshots supplied or found elsewhere are secondary and may predate current code. Compare equivalent viewport sizes and interaction states; inspect screenshot differences rather than claiming pixel parity without comparison.

## Final delivery

Provide:

1. A working destination preview of the full concordance and all introductory routes.
2. A concise inventory of copied code/data and host-integration changes.
3. Verified corpus totals and NET coverage results.
4. A feature-parity checklist with passed/failed/not-run outcomes.
5. Build, test and browser results, including any limitations.
6. Any outstanding canonical-domain or publishing decision.

Do not conceal missing features, missing content, failed tests or visual differences. Fix integration problems rather than shipping a “representative” substitute. Do not publish automatically.