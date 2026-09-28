---
name: Astro development and build caches
description: Avoid sharing Vite dependency optimizer state between concurrent preview and production builds.
---

Keep Astro development and production-build dependency caches separate when running validation builds alongside a live preview.

**Why:** A successful build replaced the live server's optimized dependencies; React islands then failed to hydrate with HTTP 504 even though their source modules returned HTTP 200. The import graph exposed a missing optimized lucide-react file and mismatched optimizer hash.

**How to apply:** Preserve command-specific cache isolation. When an island fails to hydrate after a build, inspect its transitive optimized imports before changing React code, retry URLs, or ports. Typecheck and production-build success do not confirm preview hydration.