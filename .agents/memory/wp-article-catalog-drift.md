---
name: WP article catalog drift
description: The JOM WordPress source for auto-generated article PDFs has an inconsistent book catalog; how to resolve slugs and handle books with no matching survey article.
---

When resolving `app.jesusonline.com/post/<slug>` links to WordPress post ids (for `scripts/src/articlesBuild.ts` PDF generation), the JOM WordPress catalog at `apicontent.jesusonline.com` does NOT cleanly match the spreadsheet/app slugs:

- The Joshua Nations Survey series (`936xx-*`) **skips some books entirely** (Ezra & Nehemiah, Song of Songs, Jeremiah have no `936xx` REST post) and **duplicates others** (two `93652-*-esther` entries).
- Catalog **numbers drift** between the app slug and the WP slug (e.g. app `93652-8-proverbs` → WP `93652-7-proverbs`; the numeric prefix is unreliable).
- The app FRONTEND (`app.jesusonline.com/post/...`) returns 200 even for slugs the REST API can't render, so a working App link does NOT guarantee REST content exists for PDF generation.

**Rules:**
1. Resolve by matching the *book/content name*, not the catalog number. A WP post whose slug contains the correct book name is valid even if its number differs. Never map to a near-number neighbour (would attach a wrong-content PDF — worse than none, and a trust regression on a public ministry site).
2. When the JN Survey (`936xx`) has no REST post for a book, the JOM **Overview series (`38xxx-overview-<book>`)** usually has a real, already-generated PDF for that exact book. Attach it via an explicit `links.pdf` override on the channel item (keeps the item's original working App link, adds a same-book PDF). This is the accepted fallback so every survey item still offers a PDF. It was used for Ezra-Nehemiah (`38640`), Song of Songs (`38634`), Jeremiah (`38616`).

**Why:** the auto-PDF importer is REST-driven; a review gate expects a PDF on every app-linked survey item. A same-book Overview PDF satisfies that with genuinely relevant content, without forcing a wrong-book PDF or dropping the working App link.

**How to apply:** for a `936xx` book with no REST post, WP `?search=<bookword>` (no prefix filter) to find its `38xxx-overview-<book>` slug; confirm the PDF exists under `public/articles/`; set `links.pdf: "/articles/<overview-slug>.pdf"` on that item.

## articlesBuild worklist comes from slug-mapping.json, not channels.ts

`scripts/src/articlesBuild.ts` builds its work list from `scripts/data/slug-mapping.json` (`Object.entries(mapping)`, then filters by `--slug`). **There is NO committed resolver that regenerates that mapping** — it is a hand-maintained static data file. So when a channel item gets a NEW app slug (e.g. a spreadsheet renumbering: `32281-...` → `32211-...`), running `articles:build --slug=<newslug>` reports "Generating 0" because the new slug is not a key in the mapping — even though the WP post exists.

**Why:** the mapping predates any renumbering; `--slug` filters an already-fixed key set. Stale mapping keys silently drop new slugs from generation.

**How to apply:** confirm the new slug resolves in live WP REST (exactly 1 result), inject an `exact` entry into `slug-mapping.json` for keys not already present, then run `articles:build --slug=...` to regenerate PDFs + manifest. A renumber can leave the old-number PDF orphaned in `public/articles/` — harmless, not tree-shaken into the manifest.

## Spreadsheet omissions can be deliberate

When the Church/Growth content spreadsheet skips one item mid-sequence (e.g. From Coping to Cure omitting "I Hate Pain!" 65612), verify against WP REST before assuming a typo: `?slug=` exact + `?search=` on both posts AND pages. If WP has nothing, the omission is deliberate (the article was never published) — mirror the sheet and drop the item rather than adding a dead app link. The app frontend's 200-for-everything SPA behavior makes curl status checks useless for this.
