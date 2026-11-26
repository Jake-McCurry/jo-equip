---
name: Bible reader tappable-text modes
description: Why alternate passage render modes (Strong's, dictionary names) can reflow the text, and how to avoid it.
---
- Plain verses render as <button>s, which lay out as atomic inline boxes (no wrapping across verses). A mode that renders verses as plain inline <span>s reflows the whole chapter (~25% height change in John 3). Match the box with `display:inline-block` on the verse span to keep layout identical.
- Strong's words and dictionary names are mutually exclusive toggles (nested buttons are invalid).
- Dictionary name matching re-applies the generator's headword rules to the displayed text, only within verses the index lists; NET wording differences (Holy Spirit vs Holy Ghost) simply go unmarked.
**Why:** "no layout shift" requirement; discovered by measuring chapter height in headless Chromium.
**How to apply:** any new tappable-text mode in the reader.
