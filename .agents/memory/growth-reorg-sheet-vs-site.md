---
name: Growth Channel reorg spreadsheets vs. live site
description: How to read the JO EQUIP Growth-channel reorg spreadsheets and why a slug diff shows hundreds of "missing" articles
---

# Growth Channel reorg spreadsheets vs. the live site

**The site's Growth channel is a curated SUBSET of the reorg spreadsheets, by design.**
A slug set-diff of a `JO_EQUIP_Growth_Channel(*)` sheet against `artifacts/discipleship-hub/src/data/channels.ts` shows hundreds of sheet articles not on the site (e.g. entire sections: Building Blocks for Maturity, Inner Peace, most Devotionals, From Cope to Cure, Wisdom for the Trenches, Gospel of John studies).

**Why:** these sheets are the fuller ministry catalog; only selected sub-topics have been implemented. Do NOT treat the "missing" count as a bug or silently try to add everything — confirm scope with the user first.

**How to apply:**
- These exports arrive as **Windows-1252** CSV (Excel). Decode with `iconv -f WINDOWS-1252 -t UTF-8`, or `open(path, encoding="windows-1252")` in Python.
- CSV drops all cell fill colors (gray = no-change, yellow = move). Rely instead on the **trailing text column** the author adds (e.g. `Move from Godly Relationships`) to identify movers — it's more reliable than color anyway.
- Sheet column layout: A=L1 num, B=L1 title, C=L2 num (e.g. 04.1), D=L2 title, E=L3 num, F=L3 title, G=leaf title, H=slug (append to `app.jesusonline.com/post/`), I=move-tag.
- To scope-check "does the rest match", diff sheet slugs vs `post/<slug>` in channels.ts and group by the sheet's L1 topic; report gaps per section rather than a raw list.

**Newest tab is truth (070626):** when multiple `JO_EQUIP_Growth_Channel(*)` tabs exist, the highest-dated tab (e.g. `070626` = `sheet1.xml`) supersedes older ones. It confirmed Marriage intro `34501` and now titles it "How To Cultivate Marriage" / slug `34501-how-to-cultivate-marriage` (was "…Your Marriage"). Building Blocks 04.2 "Growing Closer to God" is a PARENT of 5 sub-pages (majesty/relationship/barriers/habits/names); 04.3 = "Embracing Who God Says You Are"; 04.4 = "Walking in the Spirit" (flat 9). **`attributes-of-god` is a SEPARATE standalone (top-level, no parentId) Growth subtopic** — 070626 lists slugs 32211-32216 TWICE by design: as sub-page 04.2.1 "The Majesty of God" AND as top-level section 05 "Attributes of God" (marked "Unique PDF"). Keep BOTH; do not fold/remove attributes-of-god (an earlier attempt to fold it + add a redirect was reverted per user).

**Renumbered slugs = ministry moved content:** 070626 renumbers many app slugs (e.g. "Our Triune God" 32211→32231). Trust the sheet slug; the WP post + generated PDF follow. New/renamed slugs need a `slug-mapping.json` entry + `articles:build` re-run before the PDF button lights up — see `wp-article-catalog-drift.md` (worklist comes from the static mapping, not channels.ts, so new slugs are silently skipped until injected).

**Deleting on-site items the sheet omits is a content-loss decision:** ask the user, don't silently delete — even apparent duplicates (the `attributes-of-god` "duplicate" turned out to be intentional in the sheet).
