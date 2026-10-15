---
name: Staging push change log
description: Update JOLE Change Log only after confirmed staging pushes, not workspace edits.
---

Update the Google Drive spreadsheet named **JOLE Change Log** only after a confirmed push to Git staging. Do not add workspace-only edits or local commits as new change-log entries.

The user performs the pushes, not the agent. Wait for the user to confirm they pushed to staging, then inspect the relevant changes read-only and update the spreadsheet. If the pushed scope is unclear, clarify it rather than logging all workspace edits.

**Why:** The user reiterated that the agent makes changes here and the user pushes to Git. This reporting workflow must never imply authorization for the agent to push.

**Why:** On 2026-10-15 the user explicitly requested push-triggered reporting: “Only when its pushed to git.” The existing retrospective report includes workspace history; this rule applies to future entries and does not authorize removing that history.

**How to apply:** Verify a successful staging push or obtain user confirmation when they push manually. Review the actual pushed range, record affected pages, exact changes, and dates in America/Los_Angeles, and keep newest entries first with Change Log as the opening tab. Avoid duplicate entries for previously recorded changes. A staging push is not proof of production publication. This is a conversational workflow, not an installed automatic Git monitor. Preserve the separate manual-Git policy.

The existing Drive file ID is `1gMS281zbgUx6e5x2PQBmcfD-T3BwYzrJ`; update that file rather than creating a replacement. It is an Excel workbook stored in Drive, not a native Google Sheet. Resolve the active Google Drive connection before access; never store credentials.
