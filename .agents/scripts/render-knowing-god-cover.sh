#!/usr/bin/env bash
set -euo pipefail
src="attached_assets/9789995265405_cov_1788218778391.pdf"
out=".agents/outputs/knowing-god-cover-spread.png"
mutool draw -q -r 72 -o "$out" "$src" 1
identify "$out"
