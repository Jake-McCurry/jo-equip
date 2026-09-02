---
name: Adventure book PDF extraction
description: Lessons from rebuilding the 2016 InDesign "Adventure of Living with Jesus" PDF via mutool stext
---

- The 2016 InDesign source PDF's fonts lack ToUnicode maps. `pdftotext`/poppler silently DROPS glyphs (whole word-initial letters, not just ligatures). `mutool draw -F stext` decodes everything correctly, emitting only fi/fl/ff ligatures as U+FFFD — repairable with a finite word whitelist (fail loudly on unknown words).
- **Why:** poppler-based extraction looked plausible but was corrupt in hundreds of places; OCR was unnecessary once mutool was tried.
- **How to apply:** for any legacy InDesign PDF with missing letters in extracted text, try `mutool draw -F stext` before reaching for OCR.
- Margin pull-quotes (x < 150pt) in this layout are ~95% verbatim duplicates of body sentences — dropping them wholesale is correct, verified by normalized-chunk matching.
- Decorative 72pt chapter digits share stext *lines* with 24pt banner text; filter oversized glyphs at the char level, never drop whole lines by max size.
- Chapter banners are detected by size (≥20pt after 1/1.5 mutool scaling vs pdftohtml) and validated against expected title prefixes; pages are not hardcoded (chapter 5 starts a page earlier than the original TOC implies).
- Carlito/Caladea fonts in ~/.fonts get wiped between sessions; the strict-typography build fails loudly — reinstall from google/fonts ofl + `fc-cache -f`.
- The 2026 Adventure PDF is a wholly new manuscript and its embedded mountain-path page-one cover is authoritative; never merge in 2016 text or the older hiking-silhouette cover.
- **Why:** The owner explicitly requires the new wording, link targets, and supplied cover to remain intact while permitting visual-only layout improvements.
- **How to apply:** Validate normalized text and exact URI parity against the 2026 PDF after every render; story cards, response areas, banners, and graphics must not introduce or replace wording.
- Owner-supplied visual supplements add four legacy teaching graphics (spiritual breathing, fruit, trust inventory, and mind viewpoints) plus a new Fruit of the Spirit passage before the Holy Spirit Go Deeper card.
- **Why:** These additions were supplied after the 2026 manuscript and are intentional exceptions to strict source-text parity.
- **How to apply:** Preserve the supplement wording and placement; validate the rest against the 2026 source and treat only these additions plus the approved question mark as expected differences.
- All generated replacement concepts for the six teaching graphics were rejected; retain the currently approved source graphics unless the user supplies or explicitly approves professional replacements.
- **Why:** The generated concepts did not meet the required visual quality, and the user explicitly rejected the complete set.
- **How to apply:** Never substitute any review concept into the book automatically. Require explicit approval of each future replacement before integration.
- A later set of user-supplied visuals is proof-only until explicitly approved; assemble review PDFs separately and do not replace the website download during proofreading.
- **Why:** The user wants to proofread every placement before publication.
- **How to apply:** Treat approval to integrate or publish as a separate explicit step after the user reviews the returned proof PDF.
- Chromium print-to-PDF link annotations exist but are stored via indirect refs; `mutool show pages/N/Annots` won't show them — grep the raw PDF for `/URI` to count links.
