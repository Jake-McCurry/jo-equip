---
name: Deployment test fixture portability
description: Local uploads can mask missing inputs in Cloudflare's clean checkout.
---

Production build checks must use small repository-owned fixtures, not uploaded files in `attached_assets`.

**Why:** A complete local production build passed while Cloudflare failed before compilation: a validation test relied on a source upload available only in the workspace. Local success does not prove that every test input will exist in the deployment checkout.

**How to apply:** Preserve exact approved source snapshots alongside tests when needed, rather than skipping validation or deriving expected results from the implementation under test. Check fixture inclusion when introducing build-time validation.

For the Knowing God corpus, deployment validates the committed data against an independently pinned approved source fingerprint and structural checks. Full PDF extraction/regeneration still requires the original uploaded source, and any source PDF present must match the approved fingerprint.

**Why:** The extraction PDF is workspace-only, and the published download PDF is not byte-identical. Substituting the download would invalidate source provenance; deployment should not require rerunning extraction.

**How to apply:** Test validation with the source absent and with an incorrect source present. Do not silently accept a different extraction source or change its approved fingerprint to make a build pass.
