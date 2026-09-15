---
name: Shell output is not a byte-exact file transport
description: Avoid corrupting files when reconstructing them from command output.
---
Do not use the programmatic shell callback's `output` string as the contents of
a file that must be preserved exactly.

**Why:** Reconstructing generated metadata from command output introduced CRLF
changes and returned incomplete content despite requesting a larger output
budget. Exporting to a temporary file and reading it directly preserved the
complete original content.

**How to apply:** Have the command write its result under `/tmp`, read that file
with the file callback and an appropriate byte budget, and then write the
destination. For binary files, use binary-safe filesystem operations.