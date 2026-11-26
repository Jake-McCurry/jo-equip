---
name: Wesley sermon sources and verification
description: Why Wesley (not Moody/Edwards), where the 1771 text and scans come from, and the verification quirks of 18th-century OCR.
---
- Wesley's 53 "Sermons on Several Occasions" come from Project Gutenberg's transcriptions of the 1771 Bristol Works (vols 1–4), checked against Duke University Libraries scans of the same volumes on Internet Archive.
- Moody's Gutenberg books are mostly addresses without a single text; no clean public-domain Edwards transcription with an original-printing scan was found (Nov 2026).
- gutenberg.org (and gutendex) refuse/fail scripted downloads; pglaf.org and xmission mirrors serve byte-identical files.
- OCR of long-s type reads "s" as "f": fold lowercase s→f on both sides before aligning, or coverage collapses.
- Differences at the very start/end of the alignment window are neighbouring text; ignore them or short sermons fail.
- Duke vol 4 lacks pp. 35–39 (Sermon XLIX). The 1760 printing capitalizes nouns (case ~117/1000) so it can't confirm 1771 wording; XLIX stays unpublished.
- Gutenberg vol 4 prints transcriber correction notes inline (lines starting ♦ or ♠); drop them from bodies.
**Why:** the ministry publishes only sermons whose wording matches an original-printing scan.
**How to apply:** when adding another preacher, keep a separate verifier + pinned sources file so the Spurgeon pipeline stays untouched.
