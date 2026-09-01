---
name: Concordance PDF extraction
description: Reliable extraction rules for the Knowing God two-column topical concordance.
---

Use raw reading-order extraction for this two-column concordance, remove discretionary line-end hyphens, strip both mirrored running-header orientations, and include one overlap page on each side of any extraction batch before assembling and trimming complete topics. Treat standalone A–Z divider lines as hard record boundaries in every parser branch, including short “See …” records and editorial Note continuations.

**Why:** Layout-preserving extraction interleaves left and right columns on the same text row. Bounded ranges can also make a valid topic appear incomplete when its opening or closing metadata is just outside the range. Unpunctuated cross-references and notes can otherwise consume the next letter divider across a blank page, silently corrupting both text and page provenance.

**How to apply:** Detect standalone all-caps topic headings in raw reading order, assemble through the next heading or letter divider, preserve source page provenance, model “See …” entries as cross-reference-only records, then trim overlap records only after assembly. Fail generation if any running-header signature, standalone-letter field suffix, or unexplained nonblank page gap remains in structured output.