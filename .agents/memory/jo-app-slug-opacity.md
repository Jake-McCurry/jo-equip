---
name: JO App slug opacity
description: JO App article slugs must be preserved exactly rather than treated as normalized kebab-case identifiers.
---

Treat source-provided JO App article slugs as opaque, case-sensitive path segments. They may legitimately contain uppercase letters, doubled hyphens, or ampersands; never normalize or reconstruct them.

**Why:** A strict kebab-case validator silently excluded verified catalog posts even though the exact source URLs returned successfully.

**How to apply:** Build article links only from an explicit source slug or direct verified post URL. Validate that the value is one safe path segment, but preserve its spelling and punctuation exactly.

For JO App series imports, verify article inventory and bodies against the public
`https://app.jesusonline.com/assets/data/posts.json` catalog, not HTTP success on
the series route. Save the selected source records for reproducible imports.

**Why:** Series routes serve an Angular shell; a successful request does not prove
that an article body or series membership was retrieved. Similar titles can belong
to unrelated series.

**How to apply:** Match the series ID and ordered post IDs/slugs, and compare imported
text with catalog HTML before treating an import as complete.