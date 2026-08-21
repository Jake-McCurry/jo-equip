---
name: Workspace-only Git policy
description: The user’s required boundary between agent workspace edits and manual Git operations.
---

Make requested changes in the Replit workspace, but never commit, push, create or merge pull requests, or change branches.

**Why:** The user explicitly reserves all Git history and GitHub workflow actions for manual handling through Replit/GitHub.

**How to apply:** Use read-only Git inspection only when necessary to verify scope. Leave every commit, push, PR, merge, and branch operation to the user.