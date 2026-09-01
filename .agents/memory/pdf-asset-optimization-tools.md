---
name: PDF asset optimization tools
description: Workspace-specific constraint for inspecting and compressing PDF assets without disturbing project configuration.
---

For one-off PDF inspection, extraction, and compression, prefer the workspace's installed MuPDF and Ghostscript tools instead of adding PyMuPDF. Never make normal build/deployment validation depend on those binaries: staging may not provide `mutool`.

**Why:** The legacy `.pythonlibs` directory is not a valid virtual environment, so the managed PyMuPDF installer fails and may leave unrelated scaffolding or `.replit` package changes that require cleanup. Replit staging builds can restore Node/Python dependencies without installing MuPDF, causing an otherwise valid site build to fail before Astro runs.

**How to apply:** Keep source-backed extraction/regeneration as an explicit workspace command, and make the default build validate only committed generated outputs with portable language runtimes. Render review images with MuPDF and optimize binary PDFs with Ghostscript, then verify page geometry, resolution, visual output, MIME type, and the deployment size limit. For contact sheets, ImageMagick `montage` may fail because no default font is available; assemble unlabeled rows with `+append` and stack them with `-append`.