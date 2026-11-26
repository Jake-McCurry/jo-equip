#!/usr/bin/env python3
"""Checks that John Wesley's "Sermons on Several Occasions", as transcribed by
Project Gutenberg from The Works of the Rev. John Wesley (Bristol: William
Pine, 1771), keep the wording of that printing. Each sermon is compared word
for word with the OCR text of an institutional scan of the same 1771 volume on
Internet Archive (Duke University Libraries). Maintenance only; normal builds
never run it. Writes scripts/data/wesley-verification.json, which
scripts/generate-sermons.mjs uses to decide what to publish.

Usage:
  bash scripts/fetch-sermon-sources.sh /tmp/sermon-sources
  python3 scripts/verify-wesley-sermons.py /tmp/sermon-sources

Method (deterministic; standard library only), the same as verify-sermons.py:
 1. Each sermon is the text between its heading ("SERMON XVII.") and the next
    sermon heading or the end of the volume's sermons. Footnote anchors, italic
    marks and transcriber's correction marks are dropped.
 2. The 1771 printing uses the long s, which OCR reads as "f"; lowercase "s" is
    folded to "f" on both sides before comparing.
 3. The sermon is aligned word by word (difflib) with the matching stretch of
    the scan. Differences are classified as case-only, archaic-word
    replacements ("ye" -> "you", "hath" -> "has" ...), OCR noise or other.
 4. A sermon is verified when at least 75% of its words align exactly, case
    differences are at most 4 per 1,000 words and archaic replacements at most
    1 per 1,000 words (the Spurgeon criteria). Verified sermons align 91-95%;
    the rest is OCR noise in 18th-century type.
 5. Supplements ("supplements" in wesley-sources.json): the Duke copy of
    volume 4 lacks pages 35-39, the end of Sermon XLIX, and no other scan of
    the 1771 volume was found (Internet Archive, HathiTrust and Google Books
    searched Nov 2026). Those pages are checked against Wesley's separate
    printing of the sermon (Bristol: W. Pine, 1777). The longest run of sermon
    words absent from the volume scan marks the missing pages; that stretch is
    compared with the supplement and the rest with the volume scan, each
    difference counted once, and the same criteria apply to the whole sermon
    (the supplement must also match >= 75% of the missing stretch). The 1760
    printing is not used: it capitalizes nouns.
"""
import collections, difflib, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
N = 5
MAX_CASE, MAX_ARCHAIC, MIN_COVERAGE = 4.0, 1.0, 0.75
ARCHAIC = set("ye thee thou thy thine hath doth saith unto art shalt wilt hast dost henceforth suffer wherefore thereof whereby lest yea nay shew shewed spake wist ere hither thither whence".split())

# Shared with scripts/generate-sermons.mjs (which checks the word counts agree).
HEADING = re.compile(r"^\s+SERMON ([IVXL]+)\.(?:\[\d+\]|¹)?\s*$")
END = re.compile(r"^\s*(?:THE END OF THE|The End of the)\b|^\s+ADVICE\s*$|^\s+Footnotes\.\s*$|^\*\*\* END OF")

def roman(s):
    v = {"I": 1, "V": 5, "X": 10, "L": 50}
    return sum(-v[a] if i + 1 < len(s) and v[a] < v[s[i + 1]] else v[a] for i, a in enumerate(s))

def split_sermons(text):
    """{number: [lines]} for the sermon bodies (the second, full occurrence of each heading)."""
    lines = text.replace("\r", "").split("\n")
    heads = [(i, roman(m.group(1))) for i, l in enumerate(lines) if (m := HEADING.match(l))]
    last = {}
    for i, n in heads:
        last[n] = i  # the contents list comes first; the body heading is the last occurrence
    starts = sorted((i, n) for n, i in last.items())
    out = {}
    for k, (i, n) in enumerate(starts):
        stop = starts[k + 1][0] if k + 1 < len(starts) else len(lines)
        j = i + 1
        while j < stop and not END.match(lines[j]):
            j += 1
        out[n] = lines[i:j]
    return out

def clean(t):
    t = re.sub(r"\[\d+\]|[¹²³⁴⁵⁶⁷⁸⁹⁰♦_|]", " ", t)
    t = re.sub(r"[\u2010\u2011\u00ad]", "-", t)
    return re.sub(r"(\w)-(?=\w)", r"\1", t)

def tokens(t):
    return re.findall(r"[A-Za-z]+", t)

def fold(w):
    return w.replace("s", "f")

def ocr_tokens(path):
    raw = open(path, encoding="utf-8", errors="replace").read()
    raw = re.sub(r"[\u2010\u2011\u00ad]", "-", raw)
    raw = re.sub(r"-\s*\n\s*", "", raw)
    raw = re.sub(r"(\w)-(?=\w)", r"\1", raw)
    return [fold(w) for w in tokens(raw)]

def ignorable(ws):
    return all(w.isupper() or w in ("th", "ft", "nd", "rd", "d") for w in ws)

def compare(words, ot, idx, scope=None):
    """Aligns a sermon with a scan's OCR. Only words for which scope(i) is true
    are counted (all words when scope is None). Returns raw counts and the
    per-word match flags, or None when the sermon is not in the scan."""
    pos = []
    for i in range(0, len(words) - N + 1, 3):
        p = idx.get(" ".join(words[i:i + N]))
        if p and len(p) <= 3:
            pos += [x - i for x in p]
    if not pos:
        return None
    off = collections.Counter(x // 200 for x in pos).most_common(1)[0][0] * 200
    lo, hi = max(0, off - 300), off + len(words) + 600
    o = ot[lo:hi]
    ops = difflib.SequenceMatcher(None, words, o, autojunk=False).get_opcodes()
    inside = scope or (lambda i: True)
    matched = [False] * len(words)
    for tag, i1, i2, _, _ in ops:
        if tag == "equal":
            matched[i1:i2] = [True] * (i2 - i1)
    c = collections.Counter()
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal" or not inside(i1):
            continue
        a, b = words[i1:i2], o[j1:j2]
        # The scan window starts before and ends after the sermon; differences at
        # either edge are neighbouring text, not changed wording.
        if i1 == 0 or i2 == len(words) or (tag == "insert" and ignorable(b)):
            continue
        al, bl = [w.lower() for w in a], [w.lower() for w in b]
        if al == bl:
            if not (ignorable(a) or ignorable(b)):
                c["case"] += 1
            continue
        if sum(fold(w) in {fold(x) for x in ARCHAIC} for w in bl) > sum(fold(w) in {fold(x) for x in ARCHAIC} for w in al):
            c["archaic"] += 1
            continue
        if difflib.SequenceMatcher(None, " ".join(al), " ".join(bl)).ratio() >= 0.6:
            continue
        if len(a) + len(b) >= 4:
            c["phrase"] += 1
    scoped = [i for i in range(len(words)) if inside(i)]
    return {"n": len(scoped), "equal": sum(matched[i] for i in scoped), "matched": matched, **c}

def rates(*parts):
    """Coverage and differences per 1,000 words over one or more scoped comparisons."""
    n = sum(p["n"] for p in parts)
    return {
        "coverage": round(sum(p["equal"] for p in parts) / n, 3),
        **{key: round(sum(p.get(key, 0) for p in parts) * 1000 / n, 2) for key in ("case", "archaic", "phrase")},
    }

def missing_run(matched):
    """(start, end) of the longest run of sermon words not found in the scan."""
    best, start = (0, 0), None
    for i, m in enumerate(matched + [True]):
        if not m and start is None:
            start = i
        elif m and start is not None:
            if i - start > best[1] - best[0]:
                best = (start, i)
            start = None
    return best

def load_ocr(path, md5):
    if hashlib.md5(open(path, "rb").read()).hexdigest() != md5:
        sys.exit(f"{path}: OCR text differs from the pinned md5")
    ot = ocr_tokens(path)
    idx = collections.defaultdict(list)
    for i in range(len(ot) - N + 1):
        idx[" ".join(ot[i:i + N])].append(i)
    return ot, idx

def check_with_supplement(words, primary, sup, ocr_dir):
    """A sermon with pages missing from the volume scan: the pages the scan has
    are checked against it, the missing stretch against the supplement (a
    separate printing of the same sermon). Each difference is counted once,
    against the scan responsible for that stretch."""
    whole = compare(words, *primary)
    if not whole:
        return None, None
    a, b = missing_run(whole["matched"])
    if not 300 <= b - a <= 2500:
        sys.exit(f"Sermon {sup['sermon']}: expected missing pages in the volume scan, found a run of {b - a} unmatched words")
    ot, idx = load_ocr(os.path.join(ocr_dir, sup["scan"]["id"] + ".txt"), sup["scan"]["md5"])
    have = compare(words, *primary, scope=lambda i: not a <= i < b)
    gap = compare(words, ot, idx, scope=lambda i: a <= i < b)
    if not gap:
        return None, None
    info = {"source": sup["scan"]["id"], "pages": sup["missingPages"], "fromWord": a, "toWord": b, "coverage": round(gap["equal"] / gap["n"], 3)}
    return rates(have, gap), info

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
    cfg = json.load(open(os.path.join(HERE, "data", "wesley-sources.json")))
    verified, reasons, checked = [], collections.Counter(), 0
    supplements = {(x["volume"], x["sermon"]): x for x in cfg.get("supplements", [])}
    for vol in cfg["volumes"]:
        tpath = os.path.join(src, "wesley", vol["transcription"]["file"])
        body = open(tpath, "rb").read()
        if hashlib.sha256(body).hexdigest() != vol["transcription"]["sha256"]:
            sys.exit(f"{tpath}: transcription differs from the pinned sha256")
        primary = load_ocr(os.path.join(src, "ocr", vol["scan"]["id"] + ".txt"), vol["scan"]["md5"])
        for n, lines in sorted(split_sermons(body.decode("utf-8")).items()):
            checked += 1
            raw = tokens(clean("\n".join(lines[1:])))
            words = [fold(w) for w in raw]
            sup = supplements.get((vol["volume"], n))
            extra = {}
            if sup:
                r, info = check_with_supplement(words, primary, sup, os.path.join(src, "ocr"))
                if info:
                    extra = {"supplement": info}
                    if info["coverage"] < MIN_COVERAGE:
                        reasons["too little of the missing pages matched the supplement"] += 1
                        continue
            else:
                whole = compare(words, *primary)
                r = rates(whole) if whole else None
            if not r:
                reasons["no matching text in the scan"] += 1
                continue
            if r["case"] > MAX_CASE or r["archaic"] > MAX_ARCHAIC:
                reasons["wording differs from the printing"] += 1
                continue
            if r["coverage"] < MIN_COVERAGE:
                reasons["too little of the text matched the scan"] += 1
                continue
            verified.append({"volume": vol["volume"], "number": n, "source": vol["scan"]["id"], "words": len(raw), **r, **extra})
            print(f"  {vol['volume']}/{n}: {r}{' ' + str(extra) if extra else ''}")
    out = {
        "criteria": {"minCoverage": MIN_COVERAGE, "maxCasePer1000": MAX_CASE, "maxArchaicPer1000": MAX_ARCHAIC},
        "checked": checked,
        "rejected": dict(sorted(reasons.items())),
        "verified": verified,
    }
    with open(os.path.join(HERE, "data", "wesley-verification.json"), "w") as fh:
        json.dump(out, fh, indent=0)
        fh.write("\n")
    print(f"{len(verified)} of {checked} verified; rejected: {dict(reasons)}")

if __name__ == "__main__":
    main()
