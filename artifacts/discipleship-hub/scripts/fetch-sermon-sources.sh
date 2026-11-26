#!/usr/bin/env bash
# Downloads the sermon sources used by scripts/verify-sermons.py,
# scripts/verify-wesley-sermons.py and scripts/generate-sermons.mjs.
# Maintenance only; normal builds never run it.
#  - spurgeon.tar.gz: lyteword/chspurgeon-sermons (CC0 markdown) pinned to a commit.
#  - wesley/<n>-0.txt: Project Gutenberg transcriptions of Wesley's Works (1771),
#    volumes 1-4, pinned by sha256 in scripts/data/wesley-sources.json.
#  - ocr/<id>.txt: Internet Archive OCR text of scanned original printings,
#    listed in scripts/data/sermon-scan-sources.json (Spurgeon) and
#    scripts/data/wesley-sources.json (Wesley). Used only to verify wording.
#  - ocr/<id>.tesseract.txt: our own OCR of a scan's page images (scripts/ocr-wesley-scan.py),
#    copied from scripts/data/wesley-ocr/ and checked against its pinned md5.
#  - wesley/ccel-sermons.txt: CCEL plain text of Wesley's sermons (Jackson, 1872), for
#    the later sermons (54-108), pinned by sha256 in wesley-sources.json.
#  - whitefield/, maclaren/: Project Gutenberg transcriptions for scripts/verify-whitefield-sermons.py
#    and scripts/verify-maclaren-sermons.py, pinned in whitefield-sources.json / maclaren-sources.json.
# Usage: bash scripts/fetch-sermon-sources.sh /tmp/sermon-sources
set -euo pipefail
dir="${1:?usage: fetch-sermon-sources.sh <directory>}"
here="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$dir/ocr" "$dir/wesley"

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
# gutenberg.org itself is often unavailable to scripts; its official mirrors serve identical files.
python3 - "$here/data/wesley-sources.json" "$dir" <<'PY'
import gzip, hashlib, json, os, sys, urllib.request
cfg, out = json.load(open(sys.argv[1])), sys.argv[2]
MIRRORS = ["https://gutenberg.pglaf.org", "https://mirrors.xmission.com/gutenberg", "https://www.gutenberg.org/files"]
def fetch(urls):
    for url in urls:
        for attempt in range(2):
            try:
                return urllib.request.urlopen(url, timeout=120).read()
            except Exception:
                pass
    raise SystemExit(f"could not download {urls[0]}")
for v in cfg["volumes"]:
    t, s = v["transcription"], v["scan"]
    body = fetch([f"{m}/{t['path']}" for m in MIRRORS])
    if hashlib.sha256(body).hexdigest() != t["sha256"]:
        raise SystemExit(f"Gutenberg #{t['gutenberg']} changed (sha256). Review it before updating wesley-sources.json.")
    open(f"{out}/wesley/{t['file']}", "wb").write(body)
    body = fetch([f"https://archive.org/download/{s['id']}/{s['file']}"])
    if hashlib.md5(body).hexdigest() != s["md5"]:
        raise SystemExit(f"{s['id']}: OCR text changed on Internet Archive (md5). Review it before updating wesley-sources.json.")
    open(f"{out}/ocr/{s['id']}.txt", "wb").write(body)
# Separate printings that stand in for pages missing from a volume scan.
for sup in cfg.get("supplements", []):
    s = sup["scan"]
    body = fetch([f"https://archive.org/download/{s['id']}/{s['file']}"])
    if hashlib.md5(body).hexdigest() != s["md5"]:
        raise SystemExit(f"{s['id']}: OCR text changed on Internet Archive (md5). Review it before updating wesley-sources.json.")
    open(f"{out}/ocr/{s['id']}.txt", "wb").write(body)
print(f"{len(cfg['volumes'])} Wesley volumes, {len(cfg.get('supplements', []))} supplementary scan(s)")
# Later sermons: the CCEL plain text (Jackson's 1872 text) and scans of the 1788 volumes 5-8.
later = cfg["later"]
t = later["transcription"]
body = fetch([t["url"]])
if hashlib.sha256(body).hexdigest() != t["sha256"]:
    raise SystemExit(f"{t['url']} changed (sha256). Review it before updating wesley-sources.json.")
open(f"{out}/wesley/{t['file']}", "wb").write(body)
for v in later["volumes"]:
    for s in v["scans"]:
        if "ocr" in s:
            # Our own OCR of the item's page images (scripts/ocr-wesley-scan.py), committed in the repository.
            body = gzip.decompress(open(os.path.join(os.path.dirname(sys.argv[1]), s["file"]), "rb").read())
            if hashlib.md5(body).hexdigest() != s["md5"]:
                raise SystemExit(f"{s['file']}: differs from the pinned md5.")
            open(f"{out}/ocr/{s['id']}.tesseract.txt", "wb").write(body)
            continue
        body = fetch([f"https://archive.org/download/{s['id']}/{s['file']}"])
        if hashlib.md5(body).hexdigest() != s["md5"]:
            raise SystemExit(f"{s['id']}: OCR text changed on Internet Archive (md5). Review it before updating wesley-sources.json.")
        open(f"{out}/ocr/{s['id']}.txt", "wb").write(body)
print(f"{sum(len(v['scans']) for v in later['volumes'])} scans of the 1788 volumes 5-8")
PY
# Whitefield (Works, 1771-1772, vols 5-6) and Maclaren (Expositions, Psalms I-XLIX, 1908):
# Project Gutenberg transcriptions pinned by sha256, scan OCR pinned by md5.
python3 - "$here/data" "$dir" <<'PY'
import hashlib, json, os, sys, urllib.request
data, out = sys.argv[1], sys.argv[2]
def fetch(urls):
    for url in urls:
        for attempt in range(2):
            try:
                return urllib.request.urlopen(url, timeout=180).read()
            except Exception:
                pass
    raise SystemExit(f"could not download {urls[0]}")
for preacher in ("whitefield", "maclaren"):
    cfg = json.load(open(os.path.join(data, f"{preacher}-sources.json")))
    os.makedirs(f"{out}/{preacher}", exist_ok=True)
    for v in cfg["volumes"]:
        t, s = v["transcription"], v["scan"]
        body = fetch(t["urls"])
        if hashlib.sha256(body).hexdigest() != t["sha256"]:
            raise SystemExit(f"Gutenberg #{t['gutenberg']} changed (sha256). Review it before updating {preacher}-sources.json.")
        open(f"{out}/{preacher}/{t['file']}", "wb").write(body)
        body = fetch([f"https://archive.org/download/{s['id']}/{s['file']}"])
        if hashlib.md5(body).hexdigest() != s["md5"]:
            raise SystemExit(f"{s['id']}: OCR text changed on Internet Archive (md5). Review it before updating {preacher}-sources.json.")
        open(f"{out}/ocr/{s['id']}.txt", "wb").write(body)
    print(f"{preacher}: {len(cfg['volumes'])} volume(s)")
PY
echo "done: $dir"
