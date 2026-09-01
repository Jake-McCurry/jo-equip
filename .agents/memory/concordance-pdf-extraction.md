---
name: Concordance PDF extraction
description: Reliable extraction rules for the Knowing God two-column topical concordance.
---

Use raw reading-order extraction for this two-column concordance, remove discretionary line-end hyphens, strip both mirrored running-header orientations, and include one overlap page on each side of any extraction batch before assembling and trimming complete topics. Treat standalone A–Z divider lines as hard record boundaries in every parser branch, including short “See …” records and editorial Note continuations.

**Why:** Layout-preserving extraction interleaves left and right columns on the same text row. Bounded ranges can also make a valid topic appear incomplete when its opening or closing metadata is just outside the range. Unpunctuated cross-references and notes can otherwise consume the next letter divider across a blank page, silently corrupting both text and page provenance.

**How to apply:** Detect standalone all-caps topic headings in raw reading order, assemble through the next heading or letter divider, preserve source page provenance, model “See …” entries as cross-reference-only records, then trim overlap records only after assembly. Within a topic, allow repeated passage → Additional Scripture → subsection cycles; do not treat the first supplemental block as the end of primary passages. Retain repeated passage occurrences in source order when their annotations differ, while deduplicating only downstream NET requests. Fail generation if any running-header signature, standalone-letter field suffix, unexplained nonblank page gap, or passage prose in metadata remains in structured output.

Resolve printed cross-reference typos and aliases during corpus generation, while storing both the original label and its canonical target/query. The browser must consume those generated resolutions rather than re-infer them.

**Why:** Browser-only inference can display a working-looking link while sending a malformed inherited-book query, and it lets the quality report claim resolution without validating the same destination users receive.

**How to apply:** Keep explicit editorial mappings beside the extractor, scope supplemental overrides by topic plus printed label (bare shorthand can mean different books elsewhere), fail generation on every unknown or out-of-bounds target, and generate the quality report from those validated resolution records.