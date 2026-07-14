---
name: Growth Channel reorg spreadsheets vs. live site
description: How to read the JO EQUIP Growth-channel reorg spreadsheets and why a slug diff shows hundreds of "missing" articles
---

# Growth Channel reorg spreadsheets vs. the live site

**The site's Growth channel is a curated SUBSET of the reorg spreadsheets, by design.** A slug set-diff of a `JO_EQUIP_Growth_Channel(*)` sheet against `channels.ts` shows hundreds of sheet articles not on the site. These sheets are the fuller ministry catalog; only selected sub-topics have been implemented. Do NOT treat the "missing" count as a bug or silently add everything — confirm scope with the user first.

**Reading the sheets:**
- Exports arrive as **Windows-1252** CSV (Excel) — decode accordingly. CSV drops cell fill colors; rely on the trailing text column (e.g. `Move from Godly Relationships`) to identify movers.
- Columns: A=L1 num, B=L1 title, C=L2 num, D=L2 title, E=L3 num, F=L3 title, G=leaf title, H=slug (append to `app.jesusonline.com/post/`), I=move-tag.
- When multiple dated tabs exist, the **highest-dated tab is truth** and supersedes older ones.
- Sections with NO item rows under an L1 header mean "unchanged/curated elsewhere", not "delete site items".
- The sheets contain typos (misspelled headers, curly-apostrophe slugs) — normalize, don't propagate.

**Structural rules (user-confirmed):**
- **Duplicate slug listings are by design**: the same slugs may appear both as a Building Blocks sub-page AND as a top-level Growth section (e.g. `attributes-of-god` is a SEPARATE standalone subtopic duplicating Majesty-of-God slugs). Keep BOTH; an earlier attempt to fold `attributes-of-god` + redirect was reverted per user.
- **Match the sheet's subsection structure, don't flatten**: subsection splits become parent → child sub-topics; user explicitly rejected flat. The renderer supports nesting deeper than one level (an old code comment claiming otherwise was wrong). New child routes need a dev-server restart.
- **Renumbered slugs = ministry moved content**: trust the sheet slug; the WP post + generated PDF follow. New/renamed slugs need a `slug-mapping.json` entry + `articles:build` re-run before the PDF button lights up — see `wp-article-catalog-drift.md`.
- **Deleting on-site items the sheet omits is a content-loss decision**: ask the user, don't silently delete — even apparent duplicates have turned out intentional.
