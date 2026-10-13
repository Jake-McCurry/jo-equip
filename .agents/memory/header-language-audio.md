---
name: Header language and audio controls
description: Why translation uses an instructions fallback and Listen uses browser speech.
---
The user explicitly permits Translation and Listen icons to link to their instructions pages when direct functionality is unavailable. Keep Tour rather than Welcome in the streamlined More menu.

**Why:** Native browser translation has no reliable cross-browser invocation API, and no site translation provider was configured for this change. The authorized fallback avoids an unofficial translation widget or silently sending visitors to a third-party translated copy. Browser speech can start from a user click without adding an external service.

**How to apply:** Do not describe the Translation icon as a language dropdown or automatic translation. Revisit direct translation if a supported provider is deliberately configured. Preserve instructions links for unsupported audio devices.
