---
name: Leaf script importing artifact data
description: How a @workspace/scripts leaf script consumes an artifact's local TS data without breaking tsc.
---

When a script in `@workspace/scripts` needs data that lives in an artifact
package (e.g. `artifacts/discipleship-hub/src/data/bcgArticles.ts`), do NOT add
a static cross-package import.

**Rule:** load the data at runtime via a dynamic import of a file URL, and
mirror the data's types locally in the script.

```ts
import { pathToFileURL } from "node:url";
const mod = (await import(pathToFileURL(absPath).href)) as { bcgArticles: Local[] };
```

**Why:** `scripts/tsconfig.json` sets `rootDir: "src"` + `include: ["src"]`. A
static import pulls the artifact file into the script's TS program and fails
`tsc --noEmit` ("file is not under rootDir" / cross-package leakage). A dynamic
`import(stringVar)` is typed `Promise<any>` so tsc never follows it. tsx still
resolves and executes the `.ts` at runtime. This only works for PURE data
modules — the target must not import `astro:*`, `import.meta.glob`, etc.

**How to apply:** any new `bcg:pdf`-style generator that renders artifact-local
content. Pair it with a generated manifest in the artifact's `src/data/` so the
page can conditionally surface the output.
