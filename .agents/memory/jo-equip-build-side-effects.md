---
name: JO EQUIP build side effects
description: A verification build can refresh tracked metadata beyond the requested source edit.
---

Treat sitemap last-modified hashes and video-validation timestamps refreshed by a JO EQUIP production build as generated build side effects, not automatically as part of a content-only request.

**Why:** Build hooks update metadata for changed pages and validation dates, which can produce broad tracked diffs even when the intended edit is narrowly scoped.

**How to apply:** Note the pre-build workspace state, run the required build, inspect generated deltas afterward, and keep them only when the task explicitly includes metadata regeneration.