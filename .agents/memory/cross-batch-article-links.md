---
name: Cross-batch article link staleness
description: Generated EQUIP article JSONs keep external app links to articles generated in later batches; must re-normalize after each batch.
---
The site-articles generator rewrites app.jesusonline.com cross-links to internal URLs only for targets on-site **at generation time**. When articles are generated in batches (e.g. Church first, Growth later), earlier batches' JSONs keep external app links to articles that later come on-site.

**Why:** the rewrite map is built per-run from channels.ts + already-existing JSONs; earlier outputs are never revisited.

**How to apply:** after any new article batch, re-run a link-normalization pass over ALL generated JSONs (rewrite `app.jesusonline.com/post/<slug>` → `/channels/<ch>/<sub>/<id>` when the target exists, matched by appSlug or numeric-prefix-stripped id; drop target=_blank). Book-attribution links (slug strips to an on-site book id) go to `/books/<id>`. Endnote citation posts and app-only series legitimately stay external.
