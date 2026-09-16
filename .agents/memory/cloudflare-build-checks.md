---
name: Cloudflare build checks
description: Distinguishing production deployments from non-production builds in GitHub checks.
---

A successful `Workers Builds: jo-equip` check does not by itself establish a production deployment. Inspect the commit checked and the check output for a staging preview alias.

**Why:** GitHub reported successful jo-equip builds with staging preview URLs while main merge commits had no checks. Even the Cloudflare build details URL contained `/production/`, so its path was not proof of a production deployment.

**How to apply:** Compare current GitHub main merge checks with staging commit checks. Non-production versions do not imply live promotion. Ask for Cloudflare branch-control and build configuration when production triggers are absent; do not infer those settings from Wrangler or a successful preview check.