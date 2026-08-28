---
name: NET Bible concordance source
description: Provider, licensing, and fallback rules for NET text in the Knowing God concordance.
---

Use Bible.org’s official NET Bible web service for the concordance’s NET option. NET is the default translation preference, while the source book’s local wording remains the KJV option.

**Why:** The official service supports browser CORS without an API key, and its terms permit free Internet applications when quotations are designated NET and the required copyright acknowledgement is shown. This preserves the no-account, no-database product constraint.

**How to apply:** Fetch selected-topic passages on demand with bounded concurrency and session-memory caching. Link NET designations to netbible.org, retain the required acknowledgement, persist only the user’s translation choice, and label KJV fallback explicitly if NET is unavailable.