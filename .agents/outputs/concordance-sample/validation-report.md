# Knowing God concordance sample validation

## Scope
- Source: `attached_assets/ZMission-IngramSpark_03-30-26_260826_1787868242072.pdf`
- Representative range: PDF pages 29–54 (26 concordance pages; 30 rendered pages 25–54 include front matter and blanks)
- Topics detected: 17 (15 complete, 1 cross-reference-only, 1 partial at the sample boundary)
- Primary passages: 295
- Supplemental references: 199
- Related-topic links: 177

## Covered structures
- Topic starts and long topic continuations across pages
- Left-to-right two-column page flow and page breaks
- Multi-line definitions and long scripture passages
- Additional Scripture lists, including wrapped and hyphenated lines
- See Also lists, including wrapped and hyphenated topic names
- Multi-word topic headings (`Adoring the Lord`)

## Validation findings
- The embedded text layer is sufficient; OCR is not required.
- Generation fails if either mirrored running-header pattern leaks into structured content.
- Standalone all-caps headings reliably identify topic starts in raw reading order.
- Printed line-end hyphens must be removed when a word continues on the next extracted line.
- Column-aware `-raw` extraction is materially safer than `-layout`, whose rows interleave the two columns.
- The first and last records in a bounded sample may be partial by design; the full run should include one page of overlap on both sides and trim after topic assembly.

## Ambiguities and losses
- Bible references that omit a repeated book name after a semicolon remain as printed (for example, `24`); resolving them requires a reference grammar with inherited book/chapter context.
- Curly apostrophes and small-cap `LORD` survive; discretionary print hyphens are normalized.
- The source contains an apparent stray character in `y{our` on PDF page 31; it is preserved rather than silently corrected.
- Related topics are normalized as labels only; links should resolve after the complete topic catalog is extracted.
- Cross-reference-only topics (such as `Abstinence`) intentionally contain no definition or primary passages.
- Boundary topic `Adorning` lacks closing metadata because the sample ends before the source topic does.

## Prototype data
- Structured JSON: `artifacts/knowing-god-concordance/src/data/topics.json`
- Raw page text: `.agents/outputs/concordance-sample/raw-pages`
- Rendered verification pages: `.agents/outputs/concordance-sample/rendered`
