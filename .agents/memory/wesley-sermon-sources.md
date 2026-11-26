---
name: Wesley sermon sources and verification
description: Why Wesley (not Moody/Edwards), where the 1771 text and scans come from, and the verification quirks of 18th-century OCR.
---
- Wesley's 53 "Sermons on Several Occasions" come from Project Gutenberg's transcriptions of the 1771 Bristol Works (vols 1–4), checked against Duke University Libraries scans of the same volumes on Internet Archive.
- Moody's Gutenberg books are mostly addresses without a single text; no clean public-domain Edwards transcription with an original-printing scan was found (Nov 2026).
- gutenberg.org (and gutendex) refuse/fail scripted downloads; pglaf.org and xmission mirrors serve byte-identical files.
- OCR of long-s type reads "s" as "f": fold lowercase s→f on both sides before aligning, or coverage collapses.
- Differences at the very start/end of the alignment window are neighbouring text; ignore them or short sermons fail.
- Duke vol 4 lacks pp. 35–39 (Sermon XLIX). No other 1771 vol-4 scan exists on IA/HathiTrust/Google Books (searched Nov 2026). User approved (Nov 2026) checking those pages against the 1777 Pine (Bristol) separate printing via the "supplements" mechanism; 1760 printing unusable (capitalizes nouns).
- IA "bim_eighteenth-century_*" items are ECCO microfilm scans of 18th-c. separate printings; confirm imprint via ESTC (datb.cerl.org/estc/<no>), since the OCR'd title page is unreliable.
- Gutenberg vol 4 prints transcriber correction notes inline (lines starting ♦ or ♠); drop them from bodies.
**Why:** the ministry publishes only sermons whose wording matches an original-printing scan.
**How to apply:** when adding another preacher, keep a separate verifier + pinned sources file so the Spurgeon pipeline stays untouched.

## Later sermons (54–108, 1788 vols 5–8)
- No transcription of the 1788 printing or Arminian Magazine exists; CCEL `sermons.txt` (Jackson 1872 text, "Rights: Public Domain") is the transcription, checked against 1788 scans (UCLA vols 5, 7; ESTC T17802 microfilm for all four — UCLA 6/8 are dark). Gutenberg Works vols 5–16 have no sermons.
- 1788 print capitalizes nouns and Jackson normalizes, so the 1771 case criterion is unusable; the later check gates on raised divine-pronoun capitals and one-for-one archaic→modern swaps instead. The 1771 "archaic" rule flags microfilm OCR noise.
- No other viewable scan of 1788 vols 6/8 exists (IA, HathiTrust — same UCLA copy lacks v.6/v.8 — Google Books metadata-only, ECCO-TCP; searched Nov 2026). The 1804 Dublin "sixth edition" on IA is a reprint, not usable.
- The microfilm images are legible; IA's OCR fails on show-through. Re-OCR with tesseract after thresholding at grey 40 (show-through is grey, type black) makes them verifiable; the re-read OCR is committed and md5-pinned since tesseract output is version-dependent.
- More aligned text surfaces more real modernizations ("shew"→"show"), so a re-read can reject what noisy OCR merely failed to align.
- The CCEL Jackson text has meaning-reversing typos ("with" for "without", "form" for "from") that pass the coverage threshold; review where independent OCRs agree against the transcription and pin corrections with the print reading.
**Why:** only wording matching an original printing is published; pages disclose that spelling and numbering follow Jackson.
