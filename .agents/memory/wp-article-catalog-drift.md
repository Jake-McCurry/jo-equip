---
name: WP article catalog drift
description: The JOM WordPress source for auto-generated article PDFs has an inconsistent book catalog; how to resolve slugs safely.
---

When resolving `app.jesusonline.com/post/<slug>` links to WordPress post ids (for `scripts/src/articlesBuild.ts` PDF generation), the JOM WordPress catalog at `apicontent.jesusonline.com` does NOT cleanly match the spreadsheet/app slugs:

- The catalog **skips some books entirely** (e.g. Ezra & Nehemiah, Song of Songs, Jeremiah have no content post) and **duplicates others** (two `93652-*-esther` entries).
- Catalog **numbers drift** between the app slug and the WP slug (e.g. app `93652-8-proverbs` → WP `93652-7-proverbs`; the numeric prefix is unreliable).

**Rule:** resolve by matching the *book/content name*, not the catalog number. A WP post whose slug contains the correct book name is a valid match even if its number differs. If no content-matching post exists, leave the app slug UNRESOLVED (App button only, no PDF) — never map it to a near-number neighbour, because that would attach a wrong-content PDF (worse than no PDF).

**Why:** a wrong-content PDF (e.g. an "Ezra" item downloading an Esther PDF) is a correctness/trust regression on a public ministry site; a missing PDF just greys out one button.

**How to apply:** for unresolved book slugs, do a WP `?search=<bookword>` query filtered to the catalog prefix; only accept a candidate whose slug names the same book. Keep the intentional unresolved allowlist documented (was: ezra-and-nehemiah, song-of-songs, jeremiah for the Survey-of-the-Bible import).
