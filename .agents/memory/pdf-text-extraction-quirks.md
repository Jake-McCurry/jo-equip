---
name: PDF text extraction quirks
description: Gotchas when parsing pdftotext output of Word/Pages-exported PDFs (ebook rebuild pipeline)
---

- Word-exported PDFs render list bullets as private-use glyph U+F0B7. It is invisible in most editors/viewers, so regexes like `/^God Is/` silently fail on bullet lines. Normalize (`.replace(/\uf0b7/g, "•")`) before parsing.
- **Why:** this silently broke chapter-boundary detection when rebuilding an ebook from its source PDF — chapters collapsed without any error.
- **How to apply:** whenever parsing `pdftotext` output structurally, `cat -A` a sample first to reveal private-use chars; add structure-count assertions (sections/items/takeaways) so extraction drift throws instead of producing a quietly malformed book.
- Also: some source PDFs set consecutive paragraphs with no blank line between them — paragraph splitting may need known lead-in phrases, not blank lines.
