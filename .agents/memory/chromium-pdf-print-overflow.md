---
name: Chromium PDF print overflow
description: Unconstrained manuscript images can silently shrink an entire PDF, including its typography.
---

Constrain all manuscript images to the printable content width before generating PDFs; check actual rendered font sizes when text looks unexpectedly small.

**Why:** Mammoth emits images at intrinsic dimensions unless constrained. Chromium silently shrank an entire review document to fit an overflowing image, turning declared 11.2pt body text into approximately 7.46pt. Correct page dimensions and CSS font declarations alone did not expose the problem.

**How to apply:** Check horizontal overflow at the print content width, use responsive image bounds, and verify suspicious text with MuPDF structured-text font sizes. A cover should be fitted separately so its dimensions do not affect interior pagination.