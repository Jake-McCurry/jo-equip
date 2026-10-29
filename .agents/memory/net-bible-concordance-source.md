---
name: NET Bible concordance source
description: NET hosting permission, local-first delivery, and translation-integrity constraints.
---

Serve the concordance's NET passages from the site's own static assets. Use Bible.org's official source only for controlled corpus updates, not reader-time requests. NET remains the default; the source book's local wording remains the KJV option.

**Why:** After encountering a live API failure, the user explicitly requested local NET availability like KJV. On 2026-09-16, the user confirmed written permission from NET to use its Bible anywhere. Do not reopen publication permission as a blocker.

**How to apply:** Keep NET independent of Bible.org at runtime and during normal builds. Preserve copyright acknowledgement, but render NET translation labels as plain text, not links. The user explicitly withdrew linked NET labels on October 27, 2026. Validate local text against retained official source data, and version asset filenames by content. Local file failures may offer retry and an explicitly labeled KJV fallback, not a claim that Bible.org is unreachable.

## Genuine translation differences

Knowing God Scripture references should open the matching book and chapter in the site's Bible reader in a new tab, preserving the selected translation. Additional Scripture follows the same rule; NET labels remain unlinked.

**Why:** The user explicitly requested in-site Bible navigation without losing their place in Knowing God.

**How to apply:** Link the Scripture reference itself, not the translation label. For multi-chapter ranges, open the first chapter; single-chapter book references must not mistake verse numbers for chapter numbers.

NET omissions and verse-numbering differences must be distinguished from incomplete downloads and erroneous source citations.

**Why:** Strict validation revealed both legitimate differences (including 2 Corinthians 13 numbering) and source ranges extending beyond chapter ends. Treating every absent verse as an API failure or a NET omission misleads readers.

**How to apply:** Allow only individually reviewed missing coordinates, reject extra discrepancies, and show concise editorial notes separately from Scripture. Preserve original source references unless a separate editorial correction is authorized. Compare every generated passage against the official source during build validation.

## Disjoint verse ranges

Do not send abbreviated comma-separated verse ranges directly to the NET service. Repeat the book and chapter for each segment, separated by semicolons, and validate returned book/chapter/verse identities.

**Why:** The service interpreted `Psalm 103:1-5, 11-14` as Psalm 103:1–5 followed by whole Psalms 11–14, returning unrelated Scripture under the original citation without an HTTP error.

**How to apply:** Treat an HTTP-successful response as untrusted until its verse identities match the requested ranges. Preserve paragraph boundaries between disjoint ranges in both translations.