---
name: NET Bible concordance source
description: Provider, licensing, and fallback rules for NET text in the Knowing God concordance.
---

Use Bible.org’s official NET Bible web service for the concordance’s NET option. NET is the default translation preference, while the source book’s local wording remains the KJV option.

**Why:** The official service supports browser CORS without an API key, and its terms permit free Internet applications when quotations are designated NET and the required copyright acknowledgement is shown. This preserves the no-account, no-database product constraint.

**How to apply:** Fetch selected-topic passages on demand with bounded concurrency and session-memory caching. Link NET designations to netbible.org, retain the required acknowledgement, persist only the user’s translation choice, and label KJV fallback explicitly if NET is unavailable.

## Disjoint verse ranges

Do not send abbreviated comma-separated verse ranges directly to the NET service. Repeat the book and chapter for each segment, separated by semicolons, and validate returned book/chapter/verse identities.

**Why:** The service interpreted `Psalm 103:1-5, 11-14` as Psalm 103:1–5 followed by whole Psalms 11–14, returning unrelated Scripture under the original citation without an HTTP error.

**How to apply:** Treat an HTTP-successful response as untrusted until its verse identities match the requested ranges. Preserve paragraph boundaries between disjoint ranges in both translations.