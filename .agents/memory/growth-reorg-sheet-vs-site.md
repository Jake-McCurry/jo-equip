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

**Intentional site>sheet exceptions (do NOT auto-remove on re-sync):** the Marriage subtopic (`marriage-godly-relationships`) keeps an extra intro article `34501` ("How To Cultivate Your Marriage") that is NOT on the sheet — user-confirmed to keep. When syncing, adding sheet items is safe, but deleting on-site items the sheet omits is a content-loss decision: ask the user, don't silently delete.
