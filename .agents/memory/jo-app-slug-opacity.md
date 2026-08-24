---
name: JO App slug opacity
description: JO App article slugs must be preserved exactly rather than treated as normalized kebab-case identifiers.
---

Treat source-provided JO App article slugs as opaque, case-sensitive path segments. They may legitimately contain uppercase letters, doubled hyphens, or ampersands; never normalize or reconstruct them.

**Why:** A strict kebab-case validator silently excluded verified catalog posts even though the exact source URLs returned successfully.

**How to apply:** Build article links only from an explicit source slug or direct verified post URL. Validate that the value is one safe path segment, but preserve its spelling and punctuation exactly.