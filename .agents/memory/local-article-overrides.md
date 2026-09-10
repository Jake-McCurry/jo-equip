---
name: Local article overrides
description: Replacing a JO app article + PDF with ministry-supplied content (docx) instead of the WP source
---
When JOM hands us updated article content directly (docx), the WP source is stale — do NOT let the article PDF builder refetch it.

**How to apply:** update the on-site article and its linked PDF together, using the current local-override mechanism rather than editing generated upstream content. Verify both the dedicated local build and an ordinary targeted article rebuild retain local content and EQUIP links. Locally authored articles must not receive invented upstream post identities.

**Why:** the article PDF pipeline otherwise fetches WordPress and would overwrite the ministry's replacement on the next full build.

Source corrections are literal: a corrected Bible citation changes the reference, not the surrounding quotation, unless the owner explicitly supplies revised wording.

**Why:** shortening a quotation to fit a corrected verse reference can silently remove approved source text.

**How to apply:** compare every source paragraph against the imported content after only the explicitly approved transformations.
