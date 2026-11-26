#!/usr/bin/env python3
"""Checks that Alexander Maclaren's sermons in Expositions of Holy Scripture:
The Book of Psalms I. to XLIX., as transcribed by Project Gutenberg (eBook
#7925, which also holds the next Psalms volume), keep the wording of the
printed book. Each sermon is compared word for word with the OCR text of an
institutional scan of the 1908 Hodder and Stoughton printing on Internet
Archive (University of Toronto). Maintenance only; normal builds never run it.
Writes scripts/data/maclaren-verification.json, which
scripts/generate-sermons.mjs uses to decide what to publish.

Usage:
  bash scripts/fetch-sermon-sources.sh /tmp/sermon-sources
  python3 scripts/verify-maclaren-sermons.py /tmp/sermon-sources

Method (deterministic; standard library only):
 1. The sermons are listed in the volume's contents ("TITLE (Psalm i. 1, 2)");
    each runs from its title line to the next sermon's title, or to the
    heading of the second Psalms volume. split_sermons() must match
    splitMaclaren() in scripts/lib/maclaren-sermons.mjs: the generator refuses
    a sermon whose word count differs from the verified one.
 2. The scan's running heads ("THE BOOK OF PSALMS", the sermon title in
    capitals) are removed from the OCR: lines of at most 80 characters whose
    letters are mostly capitals.
 3. The alignment of scripts/verify-wesley-sermons.py (difflib; differences
    at the edges of the window ignored), without long-s folding: the book is
    set in modern type. Archaic replacements are counted only as one-for-one
    swaps of an archaic word in the printing for a modern one here.
 4. A sermon is verified when at least 98% of its words align exactly, case
    differences are at most 4 and archaic replacements at most 1 per 1,000
    words. Modern type gives clean OCR: verified sermons align 99.4-99.9%. The
    higher floor catches a sermon transcribed from a different printing: one
    (The Portrait of the Bride) aligns only 90% because a long passage in the
    transcription is not in the 1908 printing.
"""
import collections, difflib, hashlib, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
N = 5
MIN_COVERAGE, MAX_CASE, MAX_ARCHAIC = 0.98, 4.0, 1.0
ARCHAIC = set("ye thee thou thy thine hath doth saith unto art shalt wilt hast dost henceforth wherefore thereof whereby lest yea nay shew shewed spake wist ere hither thither whence".split())
CONTENTS_ENTRY = re.compile(r"^(.*?) \((.*)\)$")

def contents(lines):
    """[(title, reference)] from the first contents list (entries may wrap)."""
    start = next(i for i, l in enumerate(lines) if l.strip() == "CONTENTS")
    out, cur = [], []
    for l in lines[start + 1:]:
        if l.startswith("    ") and out:
            break
        if not l.strip():
            if cur:
                m = CONTENTS_ENTRY.match(" ".join(cur))
                if not m:
                    break
                out.append((m.group(1), m.group(2)))
                cur = []
            continue
        cur.append(l.strip())
    return out, start + 1

def split_sermons(text):
    """[(title, reference, [lines])] for the first volume; lines start after the title line."""
    lines = text.replace("\r", "").split("\n")
    entries, after = contents(lines)
    stop = next(i for i, l in enumerate(lines) if l.startswith("VOLUME II:"))
    pos, i = [], after + len(entries)
    for title, _ in entries:
        while lines[i].strip() != title:
            i += 1
        pos.append(i)
        i += 1
    pos.append(stop)
    return [(t, r, lines[pos[k] + 1:pos[k + 1]]) for k, (t, r) in enumerate(entries)]

def clean(t):
    t = re.sub(r"[_]", " ", t)
    return re.sub(r"(\w)-(?=\w)", r"\1", t)

def tokens(t):
    return re.findall(r"[A-Za-z]+", t)

def ocr(path, md5):
    if hashlib.md5(open(path, "rb").read()).hexdigest() != md5:
        sys.exit(f"{path}: OCR text differs from the pinned md5")
    kept = []
    for l in open(path, encoding="utf-8", errors="replace").read().split("\n"):
        letters = re.sub(r"[^A-Za-z]", "", l)
        if letters and len(l.strip()) <= 80 and sum(c.isupper() for c in letters) / len(letters) >= 0.6:
            continue  # running head
        kept.append(l)
    raw = "\n".join(kept)
    raw = re.sub(r"-\s*\n\s*", "", raw)
    raw = re.sub(r"(\w)-(?=\w)", r"\1", raw)
    ot = tokens(raw)
    idx = collections.defaultdict(list)
    for i in range(len(ot) - N + 1):
        idx[" ".join(ot[i:i + N])].append(i)
    return ot, idx

def compare(words, ot, idx):
    pos = []
    for i in range(0, len(words) - N + 1, 3):
        p = idx.get(" ".join(words[i:i + N]))
        if p and len(p) <= 3:
            pos += [x - i for x in p]
    if not pos:
        return None
    off = collections.Counter(x // 200 for x in pos).most_common(1)[0][0] * 200
    o = ot[max(0, off - 300):off + len(words) + 600]
    c = collections.Counter()
    equal = 0
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, words, o, autojunk=False).get_opcodes():
        if tag == "equal":
            equal += i2 - i1
            continue
        if i1 == 0 or i2 == len(words):
            continue
        a, b = words[i1:i2], o[j1:j2]
        if [w.lower() for w in a] == [w.lower() for w in b]:
            if not (all(w.isupper() for w in a) or all(w.isupper() for w in b)):
                c["case"] += 1
        elif len(a) == len(b) and any(y.lower() in ARCHAIC and x.lower() not in ARCHAIC for x, y in zip(a, b)):
            c["archaic"] += 1
    n = len(words)
    return {"coverage": round(equal / n, 3), "case": round(c["case"] * 1000 / n, 2), "archaic": round(c["archaic"] * 1000 / n, 2)}

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
    cfg = json.load(open(os.path.join(HERE, "data", "maclaren-sources.json")))
    verified, rejected = [], []
    for vol in cfg["volumes"]:
        t, s = vol["transcription"], vol["scan"]
        path = os.path.join(src, "maclaren", t["file"])
        if hashlib.sha256(open(path, "rb").read()).hexdigest() != t["sha256"]:
            sys.exit(f"{path}: differs from the pinned sha256")
        scan = ocr(os.path.join(src, "ocr", f"{s['id']}.txt"), s["md5"])
        for k, (title, ref, lines) in enumerate(split_sermons(open(path, encoding="utf-8").read()), 1):
            words = tokens(clean("\n".join(lines)))
            r = compare(words, *scan)
            row = {"volume": vol["volume"], "position": k, "title": title, "words": len(words), "source": s["id"], **(r or {})}
            ok = r and r["coverage"] >= MIN_COVERAGE and r["case"] <= MAX_CASE and r["archaic"] <= MAX_ARCHAIC
            (verified if ok else rejected).append(row if ok else {**row, "reason": "not in the scan" if not r else "wording differs from the printing"})
            print(k, title, "ok" if ok else "REJECTED", r)
    out = {
        "edition": cfg["edition"]["title"],
        "criteria": {"minCoverage": MIN_COVERAGE, "maxCasePer1000": MAX_CASE, "maxArchaicPer1000": MAX_ARCHAIC},
        "checked": len(verified) + len(rejected),
        "rejected": len(rejected),
        "verified": verified,
        "rejectedSermons": rejected,
    }
    with open(os.path.join(HERE, "data", "maclaren-verification.json"), "w") as f:
        json.dump(out, f, indent=1)
        f.write("\n")
    print(f"{len(verified)} of {out['checked']} Maclaren sermons verified")

if __name__ == "__main__":
    main()
