---
name: Astro development daemon
description: Astro upgrades can leave a daemon running outside the managed workflow.
---

A failed workflow restart reporting another Astro dev server is already running can indicate a detached daemon, rather than an application error.

**Why:** After the Astro upgrade, a previously started daemon survived the workflow lifecycle and blocked the managed foreground server.

**How to apply:** Inspect the actual startup error before changing ports or code. Stop the artifact's detached server with its installed Astro CLI, then restart the existing managed workflow; do not create a second workflow.