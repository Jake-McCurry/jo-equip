---
name: Category SEO import overrides
description: Preserve the historical spreadsheet snapshot when applying later approved metadata.
---

Keep later approved page-specific SEO revisions separate from the imported spreadsheet snapshot, while resolving both through the existing category metadata lookup.

**Why:** The category validator checks the imported data byte-for-byte against its source workbook. Editing that snapshot directly breaks validation, and rerunning the importer would erase newer approved revisions.

**How to apply:** Use the lookup's override layer for later approved metadata. Preserve the workbook importer and its source-row count; validate both the original import and the effective route metadata.