---
name: Ebook docx→PDF pipeline
description: How the JO EQUIP book PDFs are built from docx and pitfalls in the docx heading structure
---

The two ebook PDFs are generated from docx manuscripts (mammoth → HTML → two-pass puppeteer render → pdf-lib cover prepend → gs /ebook), not from source PDFs.

**TOC page numbers:** two-pass render. Pass 1 inserts invisible marker spans (`position:absolute; font-size:2px; color:#fff`) inside each chapter h1; `pdftotext` output split on form-feeds maps marker → interior page. Pass 2 strips markers (safe — absolute positioning never affects layout) and fills real numbers. Footer page number = interior page index; the cover added afterwards offsets PDF pages by +1, which matches the printed-number convention of the originals.

**Docx quirks:** heading styles are inconsistent — Identity chapter 1 is a plain `<p>1 <br/>Title</p>` needing promotion to h1, while its Conclusion is already an h1 AND a near-identical bold paragraph exists inside Appendix D. Match TOC entries to chapters by leading number/letter token, never by title text (titles drift between TOC and chapter headings).

**Why:** owner's rule — no bold/centering/italics beyond what the docx carries; mammoth preserves runs exactly, so the template must never add font-weight/text-align.

**How to apply:** when new docx versions arrive, rerun `book:walking-spirit` / `book:new-identity`; first check the mammoth h1 list for mis-styled chapter headings before trusting the chapter split.
