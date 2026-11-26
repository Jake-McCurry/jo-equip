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

Later sermons (the "later" section of wesley-sources.json): the sermons Wesley
first printed in the Arminian Magazine and collected in volumes 5-8 of Sermons
on Several Occasions (London, 1788), numbered 54-108 as in Thomas Jackson's
edition. No transcription of the 1788 printing exists; the transcription is
the Christian Classics Ethereal Library's public-domain plain text, which gives
the text of Jackson's 1872 edition. Each sermon is aligned with the OCR of a
scan of its 1788 volume, as above, with these differences:
 - Jackson's bracketed editor's notes ("[The following is Dryden's
   translation ... -- EDIT.]") are removed first; they are not Wesley's.
 - The 1788 printing capitalizes many nouns ("Eternity", "Duration") and
   Jackson standardized capitalization, so case differences cannot separate a
   modernized text from typography. They are reported, not used to decide.
   What is used is the modernization the Spurgeon check looks for: a pronoun
   for God or Christ capitalized in the transcription ("He", "His") where the
   printing has lower case, other than at the start of a sentence. At most
   1 per 1,000 words.
 - Archaic replacements are counted only as one-for-one swaps of an archaic
   word in the printing for its modern form here ("hath" -> "has"), at most
   1 per 1,000 words. Some scans are microfilm with noisy OCR, and the 1771
   rule counted stray archaic-looking fragments of OCR noise.
 - Coverage is unchanged (>= 75%).
 - A volume may list more than one scan; the scans are tried in order and the
   first that verifies the sermon is recorded.
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

# ---------- later sermons (1788 volumes 5-8; CCEL transcription of Jackson's 1872 text) ----------
# Shared with scripts/lib/wesley-sermons.mjs (splitLaterSermons, laterSermonWords).
LATER_HEADING = re.compile(r"^Sermon (\d+)\b")
LATER_END = re.compile(r"^ {5}_{10,}")
EDITOR_NOTE = re.compile(r"\[[^\[\]]*?(?:edit\.?|\(editors\s+note\))\s*\]", re.I)
DIVINE = set("he him his himself thou thee thy thine thyself who whom whose".split())
MAX_DIVINE = 1.0

def split_later(text):
    """{number: [lines]}: from each "Sermon n" heading to the rule before its notes."""
    lines = text.replace("\r", "").split("\n")
    heads = [(i, int(m.group(1))) for i, l in enumerate(lines) if (m := LATER_HEADING.match(l))]
    out = {}
    for k, (i, n) in enumerate(heads):
        stop = heads[k + 1][0] if k + 1 < len(heads) else len(lines)
        j = i + 1
        while j < stop and not LATER_END.match(lines[j]):
            j += 1
        out[n] = lines[i:j]
    return out

def later_clean(lines):
    t = EDITOR_NOTE.sub(" ", "\n".join(lines[1:]))
    t = re.sub(r"\[\d+\]", " ", t)
    return re.sub(r"(\w)-(?=\w)", r"\1", t)

def later_tokens(lines):
    """Words, and whether each starts a sentence (follows . ! ? : ; or an opening quote/bracket)."""
    t = later_clean(lines)
    words, starts = [], []
    for m in re.finditer(r"[A-Za-z]+", t):
        before = t[:m.start()].rstrip(" \n\"'(-")
        words.append(m.group(0))
        starts.append(not before or before[-1] in ".!?:;")
    return words, starts

def ocr_tokens_longs(path):
    raw = open(path, encoding="utf-8", errors="replace").read().replace("ſ", "s")
    raw = re.sub(r"[\u2010\u2011\u00ad]", "-", raw)
    raw = re.sub(r"-\s*\n\s*", "", raw)
    raw = re.sub(r"(\w)-(?=\w)", r"\1", raw)
    return [fold(w) for w in tokens(raw)]

# Modernizations of an archaic word, as single-word swaps (OCR noise rarely forms one).
MODERN = {"ye": "you", "thee": "you", "thou": "you", "thy": "your", "thine": "your yours", "hath": "has", "doth": "does",
          "saith": "says said", "unto": "to", "art": "are", "shalt": "shall", "wilt": "will", "hast": "have", "dost": "do",
          "shew": "show", "shewed": "showed", "shewn": "shown", "spake": "spoke", "wist": "knew", "ere": "before",
          "hither": "here", "thither": "there", "whence": "where", "yea": "yes", "nay": "no", "wherefore": "therefore why"}
SWAPS = {(fold(m), fold(a)) for a, ms in MODERN.items() for m in ms.split()}

def later_differences(words, starts, ot, idx):
    """Per 1,000 words: pronouns for God capitalized here but lower case in the scan (mid-sentence),
    and archaic words in the scan replaced by modern ones here."""
    pos = []
    for i in range(0, len(words) - N + 1, 3):
        p = idx.get(" ".join(words[i:i + N]))
        if p and len(p) <= 3:
            pos += [x - i for x in p]
    if not pos:
        return None
    off = collections.Counter(x // 200 for x in pos).most_common(1)[0][0] * 200
    o = ot[max(0, off - 300):off + len(words) + 600]
    divine = archaic = 0
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, words, o, autojunk=False).get_opcodes():
        if tag != "replace" or i2 - i1 != j2 - j1 or i1 == 0 or i2 == len(words):
            continue
        for a, b, s in zip(words[i1:i2], o[j1:j2], starts[i1:i2]):
            if a != b and a.lower() == b.lower() and a[0].isupper() and b[0].islower() and a.lower() in DIVINE and not s:
                divine += 1
            elif (a.lower(), b.lower()) in SWAPS:
                archaic += 1
    k = 1000 / len(words)
    return round(divine * k, 2), round(archaic * k, 2)

def verify_later(src, later):
    t = later["transcription"]
    tpath = os.path.join(src, "wesley", t["file"])
    body = open(tpath, "rb").read()
    if hashlib.sha256(body).hexdigest() != t["sha256"]:
        sys.exit(f"{tpath}: transcription differs from the pinned sha256")
    chunks = split_later(body.decode("utf-8"))
    scans = {}
    for vol in later["volumes"]:
        for s in vol["scans"]:
            spath = os.path.join(src, "ocr", s["id"] + ".txt")
            if hashlib.md5(open(spath, "rb").read()).hexdigest() != s["md5"]:
                sys.exit(f"{spath}: OCR text differs from the pinned md5")
            ot = ocr_tokens_longs(spath)
            idx = collections.defaultdict(list)
            for i in range(len(ot) - N + 1):
                idx[" ".join(ot[i:i + N])].append(i)
            scans[s["id"]] = (ot, idx)
    verified, reasons, checked = [], collections.Counter(), 0
    for vol in later["volumes"]:
        first, last = vol["sermons"]
        for n in range(first, last + 1):
            checked += 1
            raw, starts = later_tokens(chunks[n])
            words = [fold(w) for w in raw]
            reason = None
            for s in vol["scans"]:
                ot, idx = scans[s["id"]]
                whole = compare(words, ot, idx)
                if not whole:
                    reason = reason or "no matching text in the scan"
                    continue
                r = rates(whole)
                r["divine"], r["archaic"] = later_differences(words, starts, ot, idx)
                if r["divine"] > MAX_DIVINE or r["archaic"] > MAX_ARCHAIC:
                    reason = reason or "wording differs from the printing"
                    continue
                if r["coverage"] < MIN_COVERAGE:
                    reason = reason or "too little of the text matched the scan"
                    continue
                verified.append({"volume": vol["volume"], "number": n, "source": s["id"], "words": len(raw), **r})
                print(f"  {vol['volume']}/{n}: {s['id']} {r}")
                reason = None
                break
            if reason:
                reasons[reason] += 1
                print(f"  {vol['volume']}/{n}: not verified ({reason})")
    return {
        "criteria": {"minCoverage": MIN_COVERAGE, "maxDivineCapitalsPer1000": MAX_DIVINE, "maxArchaicPer1000": MAX_ARCHAIC},
        "checked": checked,
        "rejected": dict(sorted(reasons.items())),
        "verified": verified,
    }

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
    cfg = json.load(open(os.path.join(HERE, "data", "wesley-sources.json")))
    later = verify_later(src, cfg["later"])
    print(f"later sermons: {len(later['verified'])} of {later['checked']} verified; rejected: {later['rejected']}")
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
        "later": later,
    }
    with open(os.path.join(HERE, "data", "wesley-verification.json"), "w") as fh:
        json.dump(out, fh, indent=0)
        fh.write("\n")
    print(f"{len(verified)} of {checked} verified; rejected: {dict(reasons)}")

if __name__ == "__main__":
    main()
