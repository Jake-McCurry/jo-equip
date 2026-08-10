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
- Chromium print-to-PDF link annotations exist but are stored via indirect refs; `mutool show pages/N/Annots` won't show them — grep the raw PDF for `/URI` to count links.
