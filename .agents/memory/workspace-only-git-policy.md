---
name: Workspace-only Git policy
description: The user’s required boundary between agent workspace edits and manual Git operations.
---

By default, make changes only in the Replit workspace. Do not commit, push, create or merge pull requests, or change branches unless the user explicitly authorizes those operations for the current request.

**Why:** The user normally reserves Git operations for manual handling, but can explicitly authorize narrowly scoped branch updates. Such an exception is not standing permission for later work.

**How to apply:** Without current authorization, use read-only Git inspection only. With authorization, verify each destination branch's exact file diff and exclude unrelated workspace changes. Do not assume a workspace checkpoint is a feature-scoped commit.