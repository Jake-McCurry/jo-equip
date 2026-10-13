---
name: Book conversion fidelity
description: Semantic PDF checks needed in addition to automated word coverage.
---

Do not treat high extracted-word coverage as proof that a web book preserves its meaning. Workbook answer lines may be vector drawings rather than text; omitting them leaves truncated-looking prompts and orphan answer-key numbers. Teaching diagrams and table-column relationships also require visual checks.

**Why:** Browser review caught broken-looking Student Guide questions even after text coverage checks passed. The missing content was drawn blank lines, not authored answer words.

**How to apply:** Verify representative rendered source pages against web output for each distinct layout, especially workbooks, tables and diagrams. Preserve blanks without supplying answers. Keep source extraction checks and browser layout checks separate.
