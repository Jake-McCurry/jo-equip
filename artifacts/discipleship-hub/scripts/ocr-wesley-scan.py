#!/usr/bin/env python3
"""Re-reads the page images of an Internet Archive scan with Tesseract and
writes a gzipped plain-text OCR file. Maintenance only; normal builds never run
it, and verify-wesley-sermons.py reads the committed output, not this script.

Why: the only viewable scans of the 1788 Sermons on Several Occasions volumes
6 and 8 are a microfilm (ESTC T17802). Its page images are legible, but many
pages show heavy show-through from the facing side, and Internet Archive's
OCR of those pages is too noisy for the word-for-word check. The show-through
is grey and the type is black, so each page is cut to black and white at a
dark threshold before OCR. No other scan of these volumes was found
(Internet Archive, HathiTrust, Google Books, ECCO-TCP searched Nov 2026).

Each page image is Internet Archive's JPEG rendering (scale 2) of the item's
"Single Page Processed JP2 ZIP"; the zip's md5 is pinned in
scripts/data/wesley-sources.json ("images"). The pages are OCR'd in leaf
order, joined with newlines and NFKC-normalized (Tesseract emits "fi"/"fl"
ligatures). The output's md5 is pinned beside it; a different Tesseract
version can give slightly different text, so pin the new md5 only after
re-running the verifier.

Usage:
  python3 scripts/ocr-wesley-scan.py <ia-item-id> <out.txt.gz> [image-cache-dir]
Requires: tesseract (5.5.0 used), Pillow, curl.
"""
import concurrent.futures, gzip, json, os, subprocess, sys, tempfile, unicodedata, urllib.request

THRESHOLD = 40  # 0-255 grey level; darker pixels are kept as type
SCALE = 2

def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    ident, out = sys.argv[1], sys.argv[2]
    cache = sys.argv[3] if len(sys.argv) > 3 else tempfile.mkdtemp(prefix="ocr-")
    os.makedirs(cache, exist_ok=True)
    from PIL import Image
    meta = json.load(urllib.request.urlopen(f"https://archive.org/metadata/{ident}"))
    count = int(meta["metadata"]["imagecount"])
    zipname = f"{ident}_jp2.zip"
    zmd5 = next(f["md5"] for f in meta["files"] if f["name"] == zipname)

    def page(n):
        leaf = f"{ident}_{n:04d}"
        jpg, txt = os.path.join(cache, leaf + ".jpg"), os.path.join(cache, leaf + ".txt")
        if not os.path.exists(txt):
            if not (os.path.exists(jpg) and os.path.getsize(jpg)):
                url = f"https://archive.org/download/{ident}/{zipname}/{ident}_jp2%2F{leaf}.jp2?ext=jpg&scale={SCALE}"
                subprocess.run(["curl", "-sfL", "--retry", "3", "-o", jpg, url], check=True)
            png = os.path.join(cache, leaf + ".png")
            Image.open(jpg).convert("L").point(lambda v: 255 if v > THRESHOLD else 0).save(png)
            subprocess.run(["tesseract", png, os.path.join(cache, leaf), "-l", "eng"],
                           check=True, capture_output=True, env={**os.environ, "OMP_THREAD_LIMIT": "1"})
            os.remove(png)
        return open(txt, encoding="utf-8").read()

    with concurrent.futures.ThreadPoolExecutor(8) as pool:
        pages = list(pool.map(page, range(count)))
    text = unicodedata.normalize("NFKC", "\n".join(pages)).encode("utf-8")
    with gzip.GzipFile(out, "wb", mtime=0) as fh:
        fh.write(text)
    import hashlib
    print(json.dumps({"images": {"file": zipname, "md5": zmd5}, "pages": count,
                      "md5": hashlib.md5(text).hexdigest()}, indent=1))

if __name__ == "__main__":
    main()
