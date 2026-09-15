---
name: Workspace-only Git policy
description: The user’s required boundary between agent workspace edits and manual Git operations.
---

By default, make changes only in the Replit workspace. Do not commit, push, create or merge pull requests, or change branches unless the user explicitly authorizes those operations for the current request.

**Why:** The user normally reserves Git operations for manual handling, but can explicitly authorize narrowly scoped branch updates. Such an exception is not standing permission for later work.

**How to apply:** Without current authorization, use read-only Git inspection only. With authorization, verify each destination branch's exact file diff and exclude unrelated workspace changes. Do not assume a workspace checkpoint is a feature-scoped commit.

## Pending merges across chat turns

Recheck the live merge state before acting on a Git-panel screenshot. When explicitly authorized to finish a local merge, resolve, stage, and commit in the same turn.

**Why:** Pending merges and staged resolutions have repeatedly been cleared between turns in this workspace, and subsequent pulls recreated the same conflicts. The cause was not established; do not assume a stale panel or attribute the resets to the user or platform.

**How to apply:** Inspect `MERGE_HEAD`, unmerged index entries, and the incoming revision. If the merge must be restarted under current authorization, verify the destination and reviewed file versions first. A completed local merge does not authorize a push.