---
name: Long-running generation jobs
description: Background bash processes get reaped mid-run; use a temporary console workflow for multi-minute batch jobs.
---

Background processes launched from the bash tool (even with `setsid nohup ... & disown`) get silently killed shortly after the bash call returns — long batch generations died repeatedly with truncated logs and no exit code.

**Why:** the sandbox reaps the process group when the shell session ends; also `pgrep -f <pattern>` inside a poll command matches the polling bash itself, giving false "RUNNING" results.

**How to apply:** for any job longer than the ~2-minute bash timeout, register a temporary console workflow (`configureWorkflow` with `outputType: "console"`), poll it with `getWorkflowStatus`, and `removeWorkflow` when done. Design generators to be resumable (skip already-written outputs).
