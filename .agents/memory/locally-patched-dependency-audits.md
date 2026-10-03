---
name: Locally patched dependency audits
description: Distinguish tested local remediation from a clean version-based dependency scan.
---

Do not suppress an advisory or relabel an upstream package version just because
a local patch blocks its exploit. Report the local mitigation separately from
the residual scanner finding.

**Why:** On October 3, 2026, both the pnpm audit and Replit dependency scan still
flagged a tested local cache-security patch because the upstream maintainer had
not published a patched version. A clean scanner result would require either a
real upstream fix or removal of the dependency, not hiding the advisory.

**How to apply:** Prefer compatible upstream upgrades or safe replacements.
When neither is viable, keep a reproducible local patch and exploit regression
tests, disclose the remaining version-based finding, and revisit upstream fixes
before removing the patch.