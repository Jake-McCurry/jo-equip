#!/usr/bin/env bash
# Downloads the sermon sources used by scripts/verify-sermons.py and
# scripts/generate-sermons.mjs. Maintenance only; normal builds never run it.
#  - spurgeon.tar.gz: lyteword/chspurgeon-sermons (CC0 markdown) pinned to a commit.
#  - ocr/<id>.txt: Internet Archive OCR text of scanned 19th-century printings,
#    listed in scripts/data/sermon-scan-sources.json. Used only to verify wording.
# Usage: bash scripts/fetch-sermon-sources.sh /tmp/sermon-sources
set -euo pipefail
dir="${1:?usage: fetch-sermon-sources.sh <directory>}"
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$dir/ocr"

SPURGEON_COMMIT=eeec6efe01edb6b80ef43a2e90aee2b816e018a9
curl -fsSL "https://codeload.github.com/lyteword/chspurgeon-sermons/tar.gz/$SPURGEON_COMMIT" -o "$dir/spurgeon.tar.gz"

python3 - "$here/data/sermon-scan-sources.json" "$dir/ocr" <<'PY'
import hashlib, json, sys, urllib.parse, urllib.request, concurrent.futures as cf
sources, out = json.load(open(sys.argv[1])), sys.argv[2]
def get(s):
    url = f"https://archive.org/download/{s['id']}/{urllib.parse.quote(s['file'])}"
    for attempt in range(3):
        try:
            body = urllib.request.urlopen(url, timeout=120).read()
            break
        except Exception:
            if attempt == 2: raise
    if hashlib.md5(body).hexdigest() != s["md5"]:
        raise SystemExit(f"{s['id']}: OCR text changed on Internet Archive (md5). Review it before updating sermon-scan-sources.json.")
    open(f"{out}/{s['id']}.txt", "wb").write(body)
with cf.ThreadPoolExecutor(8) as ex: list(ex.map(get, sources))
print(f"{len(sources)} OCR texts")
PY
echo "done: $dir"
