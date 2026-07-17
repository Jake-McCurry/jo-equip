---
name: Ebook docx→PDF pipeline
description: How the JO EQUIP book PDFs are built from docx and pitfalls in the docx heading structure
---

The two ebook PDFs are generated from docx manuscripts (mammoth → HTML → two-pass puppeteer render → pdf-lib cover prepend → gs /ebook), not from source PDFs.

**TOC page numbers:** two-pass render. Pass 1 inserts invisible marker spans (`position:absolute; font-size:2px; color:#fff`) inside each chapter h1; `pdftotext` output split on form-feeds maps marker → interior page. Pass 2 strips markers (safe — absolute positioning never affects layout) and fills real numbers. Footer page number = interior page index; the cover added afterwards offsets PDF pages by +1, which matches the printed-number convention of the originals.

**Docx quirks:** heading styles are inconsistent — Identity chapter 1 is a plain `<p>1 <br/>Title</p>` needing promotion to h1, while its Conclusion is already an h1 AND a near-identical bold paragraph exists inside Appendix D. Match TOC entries to chapters by leading number/letter token, never by title text (titles drift between TOC and chapter headings).

**Why:** owner's rule — no bold/centering/italics beyond what the docx carries; mammoth preserves runs exactly, so the template must never add font-weight/text-align.

**How to apply:** when new docx versions arrive, rerun `book:walking-spirit` / `book:new-identity`; first check the mammoth h1 list for mis-styled chapter headings before trusting the chapter split.

## Docx fidelity (strict typography mode)
- Owner rule: the PDF must mirror the docx exactly — read alignment/indent/page breaks from `word/document.xml` (unzip the docx), never assume. In Walking, ALL h1s (incl. TOC) are CENTERED, quotes indented 720 twips (0.5"), nested/lists 1440 (1"), front matter is ONE page with a single break before the TOC.
- mammoth drops paragraph indents and the "Emphasis" run style by default. Strict mode fixes both: `transforms.paragraph` mapping `indent.start` ≥400/≥1200 twips to synthetic styles → `p.ind1`/`p.ind2` classes (skip `p.numbering` paragraphs), plus styleMap `r[style-name='Emphasis'] => em` (recovered 27 italic runs).
- These fixes are gated to `typography: "strict"` books so approved classic books (identity) keep byte-stable output. `mammoth.transforms` exists at runtime but is missing from its type defs — cast to any.
- Calibri/Cambria aren't installable; use metric-compatible Carlito/Caladea (copy TTFs from nix-store to ~/.fonts + fc-cache). Carlito has no Light face — weight 300 renders regular.

## Fonts are ephemeral
- ~/.fonts can be wiped by environment resets; rebuilds then silently fall back to DejaVu. The build script now preflights via assertStrictFonts(). Reinstall: download Carlito + Caladea TTFs from github.com/google/fonts (ofl/carlito, ofl/caladea) into ~/.fonts, run fc-cache -f. Verify output with pdffonts.
- All three books (walking, identity, majesty) now use strict typography; majesty (PDF-source) shares STRICT_CSS and a single .front-matter page.
