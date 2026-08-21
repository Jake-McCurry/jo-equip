---
name: PDF asset optimization tools
description: Workspace-specific constraint for inspecting and compressing PDF assets without disturbing project configuration.
---

For one-off PDF inspection and compression, prefer the workspace's installed MuPDF and Ghostscript tools instead of adding PyMuPDF.

**Why:** The legacy `.pythonlibs` directory is not a valid virtual environment, so the managed PyMuPDF installer fails and may leave unrelated scaffolding or `.replit` package changes that require cleanup.

**How to apply:** Render review images with MuPDF and optimize binary PDFs with Ghostscript, then verify page geometry, resolution, visual output, MIME type, and the deployment size limit.