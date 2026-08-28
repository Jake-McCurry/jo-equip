---
name: Concordance PDF extraction
description: Reliable extraction rules for the Knowing God two-column topical concordance.
---

Use raw reading-order extraction for this two-column concordance, remove discretionary line-end hyphens, strip both mirrored running-header orientations, and include one overlap page on each side of any extraction batch before assembling and trimming complete topics.

**Why:** Layout-preserving extraction interleaves left and right columns on the same text row. Bounded ranges can also make a valid topic appear incomplete when its opening or closing metadata is just outside the range.

**How to apply:** Detect standalone all-caps topic headings in raw reading order, assemble through the next heading, preserve source page provenance, model “See …” entries as cross-reference-only records, then trim overlap records only after assembly. Fail generation if any running-header signature remains in structured output.