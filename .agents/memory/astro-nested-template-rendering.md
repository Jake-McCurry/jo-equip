---
name: Astro nested template rendering
description: A compiler-specific constraint for complex conditional rendering inside Astro templates.
---

Prefer preparing section metadata in frontmatter and rendering it with simple declarative branches when an Astro template needs nested maps and several layout variants.

**Why:** This workspace's Astro compiler produced misleading syntax errors for valid-looking nested map callbacks containing statement-bodied conditionals and returned markup. Multiple local syntax changes did not resolve it; lifting the logic out of the template did.

**How to apply:** For editorial pages or other data-driven templates with several section treatments, derive flags and presentation metadata before the template, then use implicit-return maps, fragments, and straightforward conditional branches.