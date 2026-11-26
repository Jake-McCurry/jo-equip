#!/usr/bin/env python3
"""Checks which Spurgeon sermons in the CC0 markdown edition keep their original
wording, by comparing each one word for word with OCR text of scanned
19th-century printings on Internet Archive. Maintenance only; normal builds
never run it. Writes scripts/data/sermon-verification.json, which
scripts/generate-sermons.mjs uses to decide what to publish.

Why: the markdown edition descends from a modernized commercial edition. Many
sermons have rewritten Scripture quotations ("ye" -> "you"), capitalized
pronouns for God, and modernized words. Only sermons whose wording matches a
scan of an original printing are published.

Usage:
  bash scripts/fetch-sermon-sources.sh /tmp/sermon-sources
  python3 scripts/verify-sermons.py /tmp/sermon-sources

Method (deterministic; standard library only):
 1. Screening: sampled 5-word shingles (case-sensitive) from every sermon are
    looked up in every scan. A scan is a candidate for a sermon when it contains
    at least half of that sermon's sampled shingles.
 2. Comparison: the sermon is aligned word by word (difflib) with the matching
    stretch of each candidate scan. Differences are classified as
      - case: same word, different capitalization (e.g. "he" vs "He"),
      - archaic: the scan has an archaic form the edition replaced ("ye", "thee",
        "hath", "unto", "suffer" ...),
      - OCR noise (similar spelling) or other.
    The best candidate (fewest case + 3 x archaic + phrase differences) is kept.
 3. A sermon is verified when, against its best scan, at least 75% of its words
    align exactly, case differences are at most 4 per 1,000 words and archaic
    replacements at most 1 per 1,000 words. Modernized sermons typically show
    15-40 case differences per 1,000 words, so the two groups separate clearly.
 4. The preaching date is read from the scan's sermon heading when present
    ("Delivered on Sabbath Morning, January 7th, 1855").
"""
import collections, difflib, hashlib, html, io, json, os, re, sys, tarfile
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
TARBALL_SHA256 = "6f45da64d5390c38083d55fd8f5adb7785cb887af33b2fdfca08cf71b1ed013b"
COMMIT = "eeec6efe01edb6b80ef43a2e90aee2b816e018a9"
N, MOD = 5, 8
MAX_CASE, MAX_ARCHAIC, MIN_COVERAGE = 4.0, 1.0, 0.75
ARCHAIC = set("ye thee thou thy thine hath doth saith unto art shalt wilt hast dost henceforth suffer wherefore thereof whereby lest yea nay shew shewed spake wist ere hither thither whence".split())
MONTHS = "January February March April May June July August September October November December".split()

def normalize(t):
    t = re.sub(r"[\u2010\u2011\u00ad]", "-", t)
    t = re.sub(r"-\s*\n\s*", "", t)
    return re.sub(r"(\w)-(?=\w)", r"\1", t)

def tokens(t):
    return re.findall(r"[A-Za-z]+", normalize(t))

def fnv(s):
    h = 0x811C9DC5
    for ch in s.encode("utf-8"):
        h = ((h ^ ch) * 0x01000193) & 0xFFFFFFFF
    return h

def sermon_text(md):
    t = html.unescape(md)
    t = re.sub(r"^# .*\n", "", t)
    return re.sub(r"(?m)^Adapted from The C\.H\. Spurgeon Collection.*$", "", t)

def load_sermons(src):
    path = os.path.join(src, "spurgeon.tar.gz")
    data = open(path, "rb").read()
    digest = hashlib.sha256(data).hexdigest()
    if digest != TARBALL_SHA256:
        sys.exit(f"spurgeon.tar.gz digest changed ({digest}). Review the new source before updating TARBALL_SHA256.")
    out = {}
    with tarfile.open(fileobj=io.BytesIO(data)) as tar:
        for m in tar.getmembers():
            rel = m.name.split("/", 1)[1] if "/" in m.name else m.name
            if re.match(r"^volume-\d+/.+\.md$", rel):
                out[rel] = tar.extractfile(m).read().decode("utf-8")
    return out

OCR = {}
def ocr(src_dir, sid):
    if sid not in OCR:
        if len(OCR) >= 3:
            OCR.pop(next(iter(OCR)))
        raw = normalize(open(os.path.join(src_dir, "ocr", sid + ".txt"), encoding="utf-8", errors="replace").read())
        found = [(m.group(0), m.start()) for m in re.finditer(r"[A-Za-z]+", raw)]
        toks = [w for w, _ in found]
        idx = collections.defaultdict(list)
        for i in range(len(toks) - N + 1):
            idx[" ".join(toks[i:i + N])].append(i)
        OCR[sid] = (raw, toks, [p for _, p in found], idx)
    return OCR[sid]

def ocr_number(s):
    s = s.upper().replace("I", "1").replace("L", "1").replace("O", "0")
    return int(s) if s.isdigit() else None

def find_date(raw, end, volume):
    best = None
    window = raw[max(0, end - 3000):end]
    pat = r"Delivered\b[^\n]{0,80}?\b(" + "|".join(MONTHS) + r")\s*([\dIlO]{1,2})\s*(?:st|nd|rd|th|tk|d)?\s*[.,]?\s*(18[\dIlO]{2})"
    for m in re.finditer(pat, window, re.S | re.I):
        best = m
    if not best:
        return None
    month, day, year = MONTHS.index(best.group(1).capitalize()) + 1, ocr_number(best.group(2)), ocr_number(best.group(3))
    if not day or not year or not 1 <= day <= 31 or not 1853 <= year <= 1891:
        return None
    if volume <= 37 and year not in (1854 + volume, 1853 + volume):
        return None
    when = re.search(r"(Sabbath|Lord.s[- ]?Day|Sunday|Thursday|Tuesday|Monday|Wednesday|Friday|Saturday)\s+(Morning|Evening|Afternoon)", best.group(0), re.I)
    service = None
    if when:
        d = when.group(1).lower()
        service = ("Lord's Day" if d.startswith("lord") else d.capitalize()) + " " + when.group(2).lower()
    return {"date": f"{year:04d}-{month:02d}-{day:02d}", **({"service": service} if service else {})}

def ignorable(ws):
    return all(w.isupper() or w in ("th", "st", "nd", "rd", "d") for w in ws)

def compare(src_dir, words, sid, volume):
    raw, ot, offs, idx = ocr(src_dir, sid)
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
    equal = sum(i2 - i1 for t, i1, i2, _, _ in ops if t == "equal")
    first = next((j1 for t, _, _, j1, _ in ops if t == "equal"), 0)
    c = collections.Counter()
    for tag, i1, i2, j1, j2 in ops:
        if tag == "equal":
            continue
        a, b = words[i1:i2], o[j1:j2]
        if tag == "insert" and (j1 == 0 or j2 == len(o) or ignorable(b)):
            continue
        if tag == "delete" and (i1 == 0 or i2 == len(words)):
            continue
        al, bl = [w.lower() for w in a], [w.lower() for w in b]
        if al == bl:
            if not (ignorable(a) or ignorable(b)):
                c["case"] += 1
            continue
        if sum(w in ARCHAIC for w in bl) > sum(w in ARCHAIC for w in al):
            c["archaic"] += 1
            continue
        if difflib.SequenceMatcher(None, " ".join(al), " ".join(bl)).ratio() >= 0.6:
            continue
        if len(a) + len(b) >= 4:
            c["phrase"] += 1
    k = 1000 / len(words)
    return {
        "source": sid, "words": len(words), "coverage": round(equal / len(words), 3),
        "case": round(c["case"] * k, 2), "archaic": round(c["archaic"] * k, 2), "phrase": round(c["phrase"] * k, 2),
        "found": find_date(raw, offs[lo + first] if lo + first < len(offs) else len(raw), volume),
    }

def judge(job):
    src_dir, rel, words, cands = job
    volume = int(rel.split("/")[0].split("-")[1])
    best = None
    for sid in cands[:4]:
        r = compare(src_dir, words, sid, volume)
        if r and (best is None or (r["case"] + 3 * r["archaic"] + r["phrase"], -r["coverage"]) < (best["case"] + 3 * best["archaic"] + best["phrase"], -best["coverage"])):
            best = r
    return rel, best

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else sys.exit(__doc__)
    sources = json.load(open(os.path.join(HERE, "data", "sermon-scan-sources.json")))
    for s in sources:
        body = open(os.path.join(src, "ocr", s["id"] + ".txt"), "rb").read()
        if hashlib.md5(body).hexdigest() != s["md5"]:
            sys.exit(f"{s['id']}: OCR text differs from the pinned md5")
    sermons = load_sermons(src)
    files = sorted(sermons, key=lambda f: [int(x) if x.isdigit() else x for x in re.split(r"(\d+)", f)])
    words = {f: tokens(sermon_text(sermons[f])) for f in files}

    # 1. Screening with sampled shingles.
    index, occ, per = {}, [], {}
    for f in files:
        n = 0
        w = words[f]
        for i in range(len(w) - N + 1):
            h = fnv(" ".join(w[i:i + N]))
            if h % MOD:
                continue
            index.setdefault(h, []).append(len(occ))
            occ.append(f)
            n += 1
        per[f] = n
    cands = collections.defaultdict(list)
    for s in sources:
        toks = tokens(open(os.path.join(src, "ocr", s["id"] + ".txt"), encoding="utf-8", errors="replace").read())
        seen, cnt = set(), collections.Counter()
        for i in range(len(toks) - N + 1):
            h = fnv(" ".join(toks[i:i + N]))
            if h % MOD:
                continue
            for o in index.get(h, ()):
                if o not in seen:
                    seen.add(o)
                    cnt[occ[o]] += 1
        for f, n in cnt.items():
            if per[f] and n >= 0.5 * per[f]:
                cands[f].append((n / per[f], s["id"]))
    jobs = [(src, f, words[f], [sid for _, sid in sorted(cands[f], key=lambda x: (-x[0], x[1]))]) for f in files if cands[f]]
    jobs.sort(key=lambda j: j[3][0])

    # 2-3. Word-by-word comparison.
    with Pool(min(6, os.cpu_count() or 1)) as pool:
        results = dict(pool.map(judge, jobs, chunksize=8))

    verified, reasons = [], collections.Counter()
    for f in files:
        r = results.get(f)
        if not r:
            reasons["no scan of an original printing found"] += 1
            continue
        if r["case"] > MAX_CASE or r["archaic"] > MAX_ARCHAIC:
            reasons["wording modernized"] += 1
            continue
        if r["coverage"] < MIN_COVERAGE:
            reasons["too little of the text matched the scan"] += 1
            continue
        found = r.pop("found")
        verified.append({"file": f, **r, **(found or {})})
    out = {
        "edition": {"repository": "lyteword/chspurgeon-sermons", "commit": COMMIT, "sha256": TARBALL_SHA256},
        "criteria": {"minCoverage": MIN_COVERAGE, "maxCasePer1000": MAX_CASE, "maxArchaicPer1000": MAX_ARCHAIC},
        "checked": len(files),
        "rejected": dict(sorted(reasons.items())),
        "verified": verified,
    }
    with open(os.path.join(HERE, "data", "sermon-verification.json"), "w") as fh:
        json.dump(out, fh, indent=0)
        fh.write("\n")
    print(f"{len(verified)} of {len(files)} verified; rejected: {dict(reasons)}; dated: {sum(1 for v in verified if 'date' in v)}")

if __name__ == "__main__":
    main()
