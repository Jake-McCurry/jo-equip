#!/usr/bin/env python3
"""Checks that George Whitefield's sermons, as transcribed by Project Gutenberg
from The Works of the Reverend George Whitefield, M.A. (London: Edward and
Charles Dilly, 1771-1772), volumes 5 and 6, keep the wording of that printing.
Each sermon is compared word for word with the OCR text of an institutional
scan of the same volume on Internet Archive (Princeton Theological Seminary
Library). Maintenance only; normal builds never run it. Writes
scripts/data/whitefield-verification.json, which scripts/generate-sermons.mjs
uses to decide what to publish.

Usage:
  bash scripts/fetch-sermon-sources.sh /tmp/sermon-sources
  python3 scripts/verify-whitefield-sermons.py /tmp/sermon-sources

Method: the comparison of scripts/verify-wesley-sermons.py for the 1771
volumes, imported from that script unchanged (same splitting, long-s folding,
alignment and criteria: >= 75% of words aligned exactly, <= 4 case differences
and <= 1 archaic replacement per 1,000 words). The transcribers' correction
notes (paragraphs marked with card-suit symbols) are left out of the
comparison; the recorded word count covers the whole sermon as the generator
splits it.
"""
import hashlib, importlib.util, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("wesley", os.path.join(HERE, "verify-wesley-sermons.py"))
W = importlib.util.module_from_spec(spec)
spec.loader.exec_module(W)

NOTE = re.compile(r"^\s*[♦♠♥♣]")

def without_notes(lines):
    """Drops transcribers' notes: a paragraph whose first line starts with a card-suit mark."""
    out, skip = [], False
    for l in lines:
        if not l.strip():
            skip = False
        elif NOTE.match(l):
            skip = True
        if not skip:
            out.append(l)
    return out

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
    cfg = json.load(open(os.path.join(HERE, "data", "whitefield-sources.json")))
    verified, rejected, checked = [], [], 0
    for vol in cfg["volumes"]:
        t, s = vol["transcription"], vol["scan"]
        path = os.path.join(src, "whitefield", t["file"])
        if hashlib.sha256(open(path, "rb").read()).hexdigest() != t["sha256"]:
            sys.exit(f"{path}: differs from the pinned sha256")
        sermons = W.split_sermons(open(path, encoding="utf-8").read())
        lo, hi = vol["sermons"]
        if sorted(sermons) != list(range(lo, hi + 1)):
            sys.exit(f"volume {vol['volume']}: expected sermons {lo}-{hi}, found {sorted(sermons)}")
        scan = W.load_ocr(os.path.join(src, "ocr", f"{s['id']}.txt"), s["md5"])
        for n, lines in sorted(sermons.items()):
            checked += 1
            words = len(W.tokens(W.clean("\n".join(lines[1:]))))
            compared = [W.fold(w) for w in W.tokens(W.clean("\n".join(without_notes(lines[1:]))))]
            c = W.compare(compared, *scan)
            r = W.rates(c) if c else None
            row = {"volume": vol["volume"], "number": n, "words": words, "source": s["id"], **(r or {})}
            ok = r and r["coverage"] >= W.MIN_COVERAGE and r["case"] <= W.MAX_CASE and r["archaic"] <= W.MAX_ARCHAIC
            (verified if ok else rejected).append(row if ok else {**row, "reason": "not in the scan" if not r else "wording differs"})
            print(n, "ok" if ok else "REJECTED", r)
    out = {
        "edition": cfg["edition"]["title"],
        "criteria": {"minCoverage": W.MIN_COVERAGE, "maxCasePer1000": W.MAX_CASE, "maxArchaicPer1000": W.MAX_ARCHAIC},
        "checked": checked,
        "rejected": len(rejected),
        "verified": verified,
        "rejectedSermons": rejected,
    }
    with open(os.path.join(HERE, "data", "whitefield-verification.json"), "w") as f:
        json.dump(out, f, indent=1)
        f.write("\n")
    print(f"{len(verified)} of {checked} Whitefield sermons verified")

if __name__ == "__main__":
    main()
