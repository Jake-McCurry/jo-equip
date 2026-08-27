---
name: Hydration and browser instrumentation
description: How to distinguish application hydration bugs from attributes injected by browser testing tools.
---

When a hydration warning remains after server/client state is made deterministic, inspect React’s exact attribute diff and compare raw HTML with the live DOM before changing application behavior.

**Why:** Browser automation can temporarily mutate input presentation attributes, such as caret styling, before React hydrates. That produces a real warning but can look like an unresolved application-state mismatch.

**How to apply:** First fix genuine browser-only initialization by loading persisted state after hydration. If only a known tool- or extension-mutated input attribute remains, isolate that element with a narrowly scoped hydration-warning suppression rather than disabling SSR or suppressing warnings for a whole subtree.