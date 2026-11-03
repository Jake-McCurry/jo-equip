---
name: Deployment test fixture portability
description: Local uploads can mask missing inputs in Cloudflare's clean checkout.
---

Production build checks must use small repository-owned fixtures, not uploaded files in `attached_assets`.

**Why:** A complete local production build passed while Cloudflare failed before compilation: a validation test relied on a source upload available only in the workspace. Local success does not prove that every test input will exist in the deployment checkout.

**How to apply:** Preserve exact approved source snapshots alongside tests when needed, rather than skipping validation or deriving expected results from the implementation under test. Check fixture inclusion when introducing build-time validation.
