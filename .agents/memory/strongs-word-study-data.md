---
name: Strong's word-study data
description: Source quirks and alignment rules for the Bible reader's Strong's data (STEPBible, eBible KJV, OpenScriptures).
---

The reader's displayed KJV comes from bible-api.com at runtime, a different edition than eBible's Strong's-tagged KJV. Tags are matched to the displayed text word by word in the browser (and checked at build time against the committed thiagobodruk KJV); never store character offsets.
**Why:** offsets against one edition silently mis-tag another (spacing, "LORD\nis", curly apostrophes).
**How to apply:** keep the shared align module the single matching rule for both the browser and the build check.

STEPBible TAHOT/TAGNT use NRSV versification. TAGNT marks KJV coordinates in square brackets (2 Cor 13:12–14, 3 John 15, Rev 12:18 → 13:1); round = NA, curly = others. TAHOT verse 0 = Psalm titles. TAHOT has empty Qere placeholder rows and "X" LXX-reconstructed rows; skip both. The expanded-tag column is index 11 (rows have trailing tabs, so `col.at(-1)` is empty). H9001+ are STEP grammatical numbers, not Strong's.
**How to apply:** check these quirks first if a regeneration reports missing words or verses that fall outside the expected range.

Source files are ~110 MB and not committed; the generator pins SHA-256 digests. The eBible zip URL is unversioned and can change.
