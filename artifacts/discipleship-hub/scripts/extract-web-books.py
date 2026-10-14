#!/usr/bin/env python3
"""
Repeatable extractor for the JO EQUIP online web-book editions.

Source authority: the current PDFs in public/books/<id>.pdf (read-only; never
modified). For every configured book this script:

  1. decodes every text span with PyMuPDF (MuPDF decodes legacy InDesign
     fonts that poppler drops), expanding ligatures;
  2. repairs known font-encoding damage *explicitly* (shift-31 encoded
     display fonts, Adobe private-use small caps / old-style figures, the
     Calibri "ti" glyph, lost "Th"/"ti"/"ft" ligatures) using a corpus
     lexicon - every repair is counted and listed in the report;
  3. removes only running page furniture (repeated headers/footers, page
     numbers, printer slugs) and blank answer lines;
  4. rebuilds reading order (two-column pages, drop caps, wrap hyphens,
     paragraphs continuing across pages) and semantic blocks (chapter
     headings, sub-headings, quotations, lists, figures, links, emphasis);
  5. splits the book at its genuine chapter/topic headings (per-book
     heading-size rules in CONFIG, validated by the report);
  6. audits word coverage against (a) the span stream after furniture
     removal and (b) an independent poppler `pdftotext` pass, and FAILS if
     any book loses content beyond the per-book tolerance.

Outputs
  src/data/web-books/<id>.json             structured book content
  src/data/web-books/extraction-report.json + docs/web-books-extraction-report.md
  public/books/<id>/read/img/*.{jpg,png}   illustrations

Run from artifacts/discipleship-hub:
  python3 scripts/extract-web-books.py            # all books
  python3 scripts/extract-web-books.py <id> ...   # selected books
"""
from __future__ import annotations

import collections
import hashlib
import html
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

import pymupdf

ROOT = Path(__file__).resolve().parent.parent
PDF_DIR = ROOT / "public/books"
OUT_DIR = ROOT / "src/data/web-books"
REPORT_MD = ROOT / "docs/web-books-extraction-report.md"

# ---------------------------------------------------------------------------
# Per-book layout rules. Values come from inventorying each PDF's heading
# typography (see report). h1: font sizes (pt, +-0.45) that mark a chapter /
# topic heading. skip: pages (1-based) that are cover art only. demote_after:
# from this page on, h1-sized lines become sub-headings (study questions,
# endnotes repeating chapter titles). toc: pages of the printed contents
# list, replaced by the web contents (reported, never silently dropped).
# tolerance: max share of independent-extractor words allowed to be missing.
CONFIG: dict[str, dict] = {
    "a-heart-after-god": {"h1": [28], "toc": [2], "regions": [{"page": 22, "kind": "lines", "head": False}]},
    "your-new-identity-in-christ": {"h1": [28], "toc": [3, 4, 5]},
    "beholding-the-majesty-of-god": {"h1": [28], "toc": [3, 4]},
    "walking-in-the-spirit": {"h1": [28], "toc": [3, 4], "tf_glyph": True},
    "who-is-the-real-jesus": {"h1": [28, 27.1], "toc": [3, 4], "glyph_fallback": {"8": "ti", "A": "ti", "F": "f"}, "regions": [{"page": 117, "kind": "lines"}]},
    "has-science-discovered-god": {"h1": [28.1], "toc": [3], "glyph_fallback": {"1": "f"}},
    "extraordinary-evangelism": {"h1": [26], "label": [30], "toc": "auto", "regions": [{"page": 96, "kind": "cols", "rect": [45, 168, 350, 556], "cols": [185], "head": ["Themes/problems", "How Christ answered this need"], "sections": 1}, {"page": 97, "kind": "cols", "rect": [50, 80, 350, 350], "cols": [195], "head": ["Themes/problems", "How Christ answered this need"], "sections": 1}, {"page": 123, "kind": "lines", "rowHeaders": False}, {"page": 146, "kind": "render", "rect": [50, 244, 337, 513], "alt": 'Diagram, One-Verse Evangelism. Romans 6:23 is written with boxes around key words: For the wages of sin is death, but the gift of God is eternal life in Christ Jesus our Lord. Below, a stick figure stands on the left and GOD is on the right, with the word Trust on the arrow between them. The left column of boxes reads WAGES, SIN, DEATH; the right column reads GIFT, OF GOD, ETERNAL LIFE. A cross labelled JESUS CHRIST bridges the gap between the two columns, with BUT at its foot.'}]},
    "extraordinary-evangelism-student-guide": {"h1": [26], "toc": "auto", "maxh1": 60, "regions": [{"page": 22, "kind": "render", "rect": [50, 180, 580, 580], "alt": "Diagram, the Engel Scale. A large arrow labelled Process Evangelism points upward; at the top: Many more post-conversion steps are needed for spiritual maturity, and the heading A New Disciple Is Born. Two columns follow. Our Role (printed vertically beside the steps): Be a Friend and Be Available; Demonstrate God's Love and Power; Explain Practically; Persuade. Seeker's Condition, numbered from the top: 1. Asking forgiveness of sin and having faith in God. 2. Challenge and decision to act. 3. Awareness of his or her need for God. 4. Positive attitude toward Christianity. 5. Grasps the cost to be a Christian. 6. Awareness of the basic facts of Christianity. 7. Interest in Christianity. 8. Initial awareness of Christianity. 9. No effective knowledge of Christianity. 10. Awareness of spirituality. 11. No belief or interest in spirituality."}, {"page": 23, "kind": "lines", "rowHeaders": False}, {"page": 44, "kind": "cols", "rect": [50, 115, 580, 725], "cols": [140, 240], "head": True, "rowHeaders": False}, {"page": 45, "kind": "cols", "rect": [40, 50, 580, 325], "cols": [130, 230], "head": True, "rowHeaders": False}]},
    "new-life-in-christ": {"h1": [18], "toc": "auto"},
    "40-days-of-gods-love": {"h1": [20], "toc": "auto"},
    "the-abiding-room": {"h1": [20, 23, 26], "toc": "auto"},
    "timeless-love-transforming-love": {"h1": [20], "toc": "auto"},
    "soul-prescription": {"h1": "auto", "toc": "auto", "regions": [{"page": 98, "kind": "lines", "rowHeaders": False}], "sin_family_boxes": True},
    "5-steps-to-break-destructive-behavior": {"h1": [22, 28], "toc": "auto", "regions": [{"page": 98, "kind": "lines", "rowHeaders": False}], "sin_family_boxes": True},
    "from-coping-to-cure": {"h1": [24], "toc": "auto", "regions": [{"page": 38, "kind": "lines", "head": False, "items": True}]},
    "i-want-happiness-now": {"h1": [28], "toc": "auto", "regions": [{"page": 25, "kind": "cols", "rect": [95, 380, 405, 553], "cols": [250], "head": True, "rowHeaders": False}, {"page": 81, "kind": "list", "rect": [80, 428, 405, 524], "cols": [215]}, {"page": 99, "kind": "list", "rect": [95, 128, 405, 290], "cols": [215]}, {"page": 111, "kind": "lines"}, {"page": 112, "kind": "lines"}]},
    "struggle-for-inner-peace": {"h1": [28], "toc": "auto"},
    "eight-great-ways-to-honor-your-husband": {"h1": [26, 31, 38], "toc": "auto", "demote": [24]},
    "eight-great-ways-to-honor-your-wife": {"h1": [21, 23, 26], "toc": "auto"},
    "hearing-the-voice-of-god": {"h1": [18], "toc": "auto"},
    "knowing-god": {"h1": "auto", "toc": "auto", "last_page": 28, "front_only": True},  # front matter only; topics come from the concordance corpus
}

DINGBAT_FONT = re.compile(r"Dingbat|Wingding|Embellish|Symbol|ZapfDingbats", re.I)
BULLET_CHARS = "•▪●◦‣∙·■□❑➢➤►▶✓✔❖⁃-–"
WORD = re.compile(r"[A-Za-z0-9]+(?:[’'][A-Za-z]+)*")
TERMINAL = re.compile(r"[.?!:;”\")’]\s*$")
REF_TAIL = re.compile(r"\(?[1-3]?\s?[A-Z][a-z]+\.?\s\d{1,3}(:\d{1,3}([-–]\d{1,3})?)?[^)]*\)?\s*$")

# Adobe private-use glyphs used by AGaramondPro / Trajan (small caps, old-style figures)
def pua_map(c: str) -> str | None:
    o = ord(c)
    if 0xF761 <= o <= 0xF77A:
        return chr(o - 0xF700)          # small-cap letters -> lowercase letter
    if 0xF730 <= o <= 0xF739:
        return chr(o - 0xF700)          # old-style figures
    if o == 0xF639:
        return "0"                       # AGaramond old-style zero
    if 0xF63A <= o <= 0xF641:
        return str(o - 0xF63A + 2)       # old-style two..nine (one is F6DC); verified against
                                         # "Genesis 2:24", "Proverbs 18:22", "copyright 2001"
    if o == 0xF6DC:
        return "1"                       # one.fitted
    if 0xF6E0 <= o <= 0xF6FF:
        return {0xF6E2: ",", 0xF6E5: "-", 0xF6E8: ".", 0xF6EB: "$"}.get(o)
    return None

CHAR_MAP = {"\u08a2": "ti", "\u00ad": "", "\ufb00": "ff", "\ufb01": "fi", "\ufb02": "fl", "\ufb03": "ffi",
            "\ufb04": "ffl", "\ufb05": "st", "\u2002": " ", "\u2003": " ", "\u2009": " ", "\u00a0": " ",
            "\u200b": "", "\ufeff": "", "\x82": "tt"}


ALT_FILE = Path(__file__).with_name("web-books-alt.json")
ALT: dict = json.loads(ALT_FILE.read_text()) if ALT_FILE.exists() else {}


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def words(s: str) -> list[str]:
    s = re.sub(r"<[^>]+>", " ", s)
    s = unicodedata.normalize("NFKC", html.unescape(s))
    return [w.lower().replace("’", "'") for w in WORD.findall(s)]


# ---------------------------------------------------------------------------
# Lexicon (for ligature repair + hyphen decisions), built from every PDF.
LEX: collections.Counter = collections.Counter()


def build_lexicon(ids: list[str]) -> None:
    for bid in ids:
        doc = pymupdf.open(PDF_DIR / f"{bid}.pdf")
        n = doc.page_count
        for i in range(n):
            for w in WORD.findall(doc[i].get_text("text", flags=0)):
                LEX[w] += 1
    # Lower-case view for case-insensitive lookups
    for w, c in list(LEX.items()):
        LEX["~" + w.lower()] += c


def lex(w: str) -> int:
    return LEX.get("~" + w.lower(), 0)


LIG_SUBS = ["ti", "ft", "tt", "fi", "fl", "ff", "ffi", "ffl", "tf", "th", "Th", "fj"]
TF_GLYPH = False
GLYPH_FALLBACK: dict = {}


def repair_token(tok: str) -> str | None:
    """Return a repaired word if `tok` is a damaged ligature form, else None."""
    if "\ufffd" in tok and not tok.strip("\ufffd"):
        return "☐"  # stand-alone unknown glyph: survey check box
    if "\ufffd" in tok:
        best = None
        for sub in LIG_SUBS + ["f"]:
            cand = tok.replace("\ufffd", sub)
            c = lex(cand)
            if c >= 1 and (best is None or c > best[1]):
                best = (cand, c)
        if best:
            return best[0]
        if tok[0] == "\ufffd" or tok[-1] == "\ufffd":
            return re.sub(r"\ufffd+", " ☐ ", tok).strip()  # check box glyph beside a word
        return tok.replace("\ufffd", "fi")  # unknown ligature glyph: fi is the only ligature these fonts lose
    if not re.fullmatch(r"[A-Za-z0-9]+", tok):
        return None
    damaged_mid = bool(re.fullmatch(r"[A-Za-z]+[0-9][A-Za-z]+|[A-Z]?[a-z]+[A-Z][a-z]+", tok))
    if lex(tok) > 2 and not damaged_mid:
        return None
    fb = None
    if damaged_mid and lex(tok) <= 2:
        for i, ch in enumerate(tok):
            if i and ch in GLYPH_FALLBACK:
                fb = tok[:i] + GLYPH_FALLBACK[ch] + tok[i + 1:]
                break
    best = None
    # 1. a single odd glyph (mid-word capital or digit) standing for a ligature
    for i, ch in enumerate(tok):
        if i == 0 or not (ch.isupper() or ch.isdigit()) or len(tok) < 4 or not any(x.islower() for x in tok):
            continue
        if not (tok[:i].isalpha() and (tok[i + 1:].isalpha() or tok[i + 1:] == "")):
            continue
        for sub in LIG_SUBS + ["f"] + (["fi", "fl"] if ch.isdigit() else []):
            cand = tok[:i] + sub.lower() + tok[i + 1:]
            c = lex(cand)
            if c >= (1 if ch.isdigit() else 3) and c > lex(tok) * 2 and (best is None or c > best[1]):
                best = (cand, c)
    # 2. a dropped "h" after initial T ("Te" -> "The", "Tis" -> "This")
    if tok[0] == "T" and len(tok) >= 2 and tok[1] != "h":
        cand = "Th" + tok[1:]
        c = lex(cand)
        if c >= 20 and lex(tok) <= 2 and (best is None or c > best[1]):
            best = (cand, c)
    # 3. a lowercase letter standing for "tf"/"ti" inside a word (Fruiulness)
    if TF_GLYPH and best is None and tok.isalpha() and len(tok) > 5 and lex(tok) == 0:
        for i in range(1, len(tok) - 1):
            for sub in ("tf", "ti", "ft", "tt"):
                cand = tok[:i] + sub + tok[i + 1:]
                c = lex(cand)
                if c >= 3 and (best is None or c > best[1]):
                    best = (cand, c)
    return best[0] if best else fb


# ---------------------------------------------------------------------------
class Book:
    def __init__(self, bid: str, cfg: dict):
        self.id = bid
        self.unreviewed_alt: list[str] = []
        self.cfg = cfg
        self.doc = pymupdf.open(PDF_DIR / f"{bid}.pdf")
        self.repairs: collections.Counter = collections.Counter()
        self.font_shift: set[str] = set()
        self.dropped = collections.Counter()
        self.limitations: list[str] = []
        self.img_dir = ROOT / f"public/books/{bid}/read/img"
        self.img_url = f"/books/{bid}/read/img"

    # ---- font decoding ---------------------------------------------------
    def detect_shift_fonts(self) -> None:
        stats = collections.defaultdict(lambda: [0, 0, 0])
        for page in self.doc.pages(0, min(self.doc.page_count, self.cfg.get("last_page") or self.doc.page_count)):
            for b in page.get_text("dict", flags=pymupdf.TEXT_CID_FOR_UNKNOWN_UNICODE)["blocks"]:
                for l in b.get("lines", []):
                    for s in l["spans"]:
                        t = s["text"]
                        if not t.strip():
                            continue
                        e = stats[s["font"]]
                        sh = "".join(chr(ord(c) + 31) if ord(c) < 0x60 else c for c in t)
                        e[0] += len(t.split())
                        e[1] += sum(1 for w in t.split() if lex(re.sub(r"\W", "", w)) > 0)
                        e[2] += sum(1 for w in sh.split() if lex(re.sub(r"\W", "", w)) > 0)
        for font, (n, raw, sh) in stats.items():
            if n >= 3 and sh > raw * 2 + 2:
                self.font_shift.add(font)

    def span_text(self, s: dict) -> str:
        t = s["text"]
        if s["font"] in self.font_shift or s["font"].endswith("#shift"):
            t = "".join(chr(ord(c) + 31) if ord(c) < 0x60 else c for c in t)
            self.repairs["shift-31 font decoded (spans)"] += 1
        out = []
        for c in t:
            if c in CHAR_MAP:
                if c in "\u08a2\x82":
                    self.repairs["Calibri/Carlito ti/tt glyph"] += 1
                out.append(CHAR_MAP[c])
                continue
            m = pua_map(c) if 0xE000 <= ord(c) <= 0xF8FF else None
            if m is not None:
                self.repairs["Adobe private-use glyph"] += 1
                out.append(m)
            elif 0xF000 <= ord(c) <= 0xF0FF:
                self.repairs["symbol-font ornament glyph dropped"] += 1
                out.append("")
            elif 0xE000 <= ord(c) <= 0xF8FF:
                self.repairs["UNMAPPED private-use glyph"] += 1
                out.append("")
            elif ord(c) < 0x20 and c not in "\t":
                out.append("")
            else:
                out.append(c)
        return "".join(out)

    # ---- page model ------------------------------------------------------
    def page_lines(self, pno: int) -> list[dict]:
        page = self.doc[pno]
        links = [(pymupdf.Rect(l["from"]), l["uri"]) for l in page.get_links() if l.get("uri")]
        FL = pymupdf.TEXT_MEDIABOX_CLIP | pymupdf.TEXT_PRESERVE_WHITESPACE
        d = page.get_text("dict", flags=FL)
        # Fonts without a usable Unicode map are re-read as raw glyph codes, which the
        # shift-31 decoder turns back into text (see detect_shift_fonts).
        dc = page.get_text("dict", flags=FL | pymupdf.TEXT_CID_FOR_UNKNOWN_UNICODE) if (self.font_shift or "\ufffd" in page.get_text("text", flags=FL)) else None
        lines = []
        for bi, b in enumerate(d["blocks"]):
            if b["type"] != 0:
                continue
            for li, l in enumerate(b["lines"]):
                if dc is not None:
                    try:
                        lc = dc["blocks"][bi]["lines"][li]
                        for si, s in enumerate(l["spans"]):
                            if lc["spans"][si]["font"] != s["font"]:
                                continue
                            if s["font"] in self.font_shift:
                                s["text"] = lc["spans"][si]["text"]
                            elif s["text"].count("\ufffd") >= max(2, len(s["text"]) * 0.5):
                                s["text"] = lc["spans"][si]["text"]
                                s["font"] = s["font"] + "#shift"
                    except (IndexError, KeyError):
                        self.repairs["UNALIGNED glyph-code span"] += 1
                if l["dir"][0] < 0.9:  # rotated text (spines, crop slugs)
                    if any(s["text"].strip() for s in l["spans"]):
                        self.dropped["rotated text line"] += 1
                    continue
                spans = []
                for s in l["spans"]:
                    t = self.span_text(s)
                    if not t:
                        continue
                    bold = bool(s["flags"] & 16) or bool(re.search(r"Bold|Black|Heavy|Semibold|Demi", s["font"]))
                    ital = bool(s["flags"] & 2) or bool(re.search(r"Italic|Oblique|-It\b|It$", s["font"]))
                    href = None
                    r = pymupdf.Rect(s["bbox"])
                    cx, cy = (r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2
                    for lr, uri in links:
                        if lr.x0 - 1 <= cx <= lr.x1 + 1 and lr.y0 - 1 <= cy <= lr.y1 + 1:
                            href = uri
                            break
                    spans.append({"t": t, "size": s["size"], "bold": bold, "ital": ital, "font": s["font"],
                                  "href": href, "bbox": s["bbox"], "dingbat": bool(DINGBAT_FONT.search(s["font"]))})
                if not spans or not "".join(x["t"] for x in spans).strip():
                    continue
                text = "".join(x["t"] for x in spans)
                vis = [x for x in spans if x["t"].strip()]
                size = max(x["size"] for x in vis)
                bbox = l["bbox"]
                lines.append({"spans": spans, "text": text, "size": size, "bbox": bbox, "block": (pno, bi),
                              "x0": bbox[0], "y0": bbox[1], "x1": bbox[2], "y1": bbox[3], "page": pno + 1,
                              "bold": all(x["bold"] for x in vis), "ital": all(x["ital"] for x in vis)})
        return self.attach_blanks(page, lines)

    BLANK = "\u2581"  # placeholder for a printed fill-in rule; rendered by blank_markup()

    def attach_blanks(self, page, lines: list[dict]) -> list[dict]:
        """Workbook fill-ins are drawn rules, not text. Put a placeholder where each
        rule sits on a text row so the blank (and the answer-key number printed after
        it) stay in the sentence instead of being lost or split into a new paragraph."""
        rules = []
        for dr in page.get_drawings():
            r = dr["rect"]
            if r.height <= 1.6 and r.width >= 20:
                rules.append(r)
        rules.sort(key=lambda r: (round(r.y0), r.x0))
        for r in rules:
            ry = (r.y0 + r.y1) / 2
            row = [l for l in lines if max(l["y0"], l["y1"] - 9) <= ry <= l["y1"] + 6 and l["y1"] - l["y0"] < 30]
            if not row:
                continue
            # rules running under text are underlines / table borders, not blanks
            def vis_x1(sp):  # span boxes include trailing spaces/tabs
                t = sp["t"]
                return sp["bbox"][0] + (sp["bbox"][2] - sp["bbox"][0]) * len(t.rstrip()) / max(1, len(t))
            def line_x1(l):
                return max((vis_x1(sp) for sp in l["spans"] if sp["t"].strip()), default=l["x1"])
            if any(sp["t"].strip() and sp["bbox"][0] < r.x1 - 3 and vis_x1(sp) > r.x0 + 3 for l in row for sp in l["spans"]):
                continue
            before = [l for l in row if -6 <= r.x0 - line_x1(l) <= 18]
            after = [l for l in row if -6 <= l["x0"] - r.x1 <= 14]
            if not before and not after:
                continue
            a = max(before, key=lambda l: l["x1"]) if before else None
            bl = min(after, key=lambda l: l["x0"]) if after else None
            proto = (a or bl)["spans"][-1 if a else 0]
            blank = {"t": f" {self.BLANK} ", "size": proto["size"], "bold": False, "ital": False, "font": proto["font"],
                     "href": None, "bbox": (r.x0, r.y0 - proto["size"], r.x1, r.y1), "dingbat": False}
            if a is not None and bl is not None and a is not bl:
                a["spans"] += [blank] + bl["spans"]
                lines.remove(bl)
                a["x1"] = bl["x1"]
            elif a is not None:
                a["spans"].append(blank)
                a["x1"] = max(a["x1"], r.x1)
            else:
                bl["spans"].insert(0, blank)
                bl["x0"] = min(bl["x0"], r.x0)
            l = a or bl
            l["text"] = "".join(x["t"] for x in l["spans"])
            l["bbox"] = (l["x0"], l["y0"], l["x1"], l["y1"])
            vis = [x for x in l["spans"] if x["t"].strip() and x["t"].strip() != self.BLANK]
            l["bold"] = all(x["bold"] for x in vis)
            l["ital"] = all(x["ital"] for x in vis)
            self.repairs["fill-in blank kept"] += 1
        return lines

    @classmethod
    def blank_markup(cls, s: str, html: bool) -> str:
        if cls.BLANK not in s:
            return s
        s = re.sub(rf"{cls.BLANK}(?:\s*{cls.BLANK})+", cls.BLANK, s)
        def rep(m):
            n = m.group(1)
            if html:
                label = f"fill-in blank {n}" if n else "fill-in blank"
                return f'<span class="rb-blank" role="img" aria-label="{label}">{"<sup>" + n + "</sup>" if n else ""}</span>'
            return f"________ ({n})" if n else "________"
        # the small number printed right after a rule points to the answer key
        out = re.sub(rf"\s?{cls.BLANK}\s*(?:(\d{{1,2}})(?:\.(?!\d))?(?![\d:,]))?", lambda m: (" " if m.group(0).startswith(" ") else "") + rep(m), s).replace("  ", " ")
        out = re.sub(r'(rb-blank"[^>]*>(?:<sup>\d+</sup>)?</span>|________(?: \(\d+\))?)(?=[^\s.,;:!?)\]’”<])', r"\1 ", out)
        return out

    # ---- furniture ---------------------------------------------------------
    def find_furniture(self, pages: list[list[dict]]) -> None:
        H = self.doc[0].rect.height
        sig = collections.Counter()

        def key(l):
            return re.sub(r"\d+", "#", l["text"].strip().lower())

        for lines in pages:
            seen = set()
            for l in lines:
                if l["y1"] < H * 0.1 or l["y0"] > H * 0.9:
                    k = key(l)
                    if k not in seen:
                        sig[k] += 1
                        seen.add(k)
        self.furniture_sigs = {k for k, c in sig.items() if c >= 3}

    def is_furniture(self, l: dict) -> str | None:
        H = self.doc[0].rect.height
        t = l["text"].strip()
        if re.search(r"\.indd\b|\d{1,2}/\d{1,2}/\d{2,4}\s+\d{1,2}:\d{2}", t):
            return "printer slug"
        zone = l["y1"] < H * 0.1 or l["y0"] > H * 0.9
        if not zone:
            return None
        if l["size"] <= self.body * 1.1 and re.fullmatch(r"(page\s*)?[0-9ivxlc]{1,4}|[–-]\s*\d+\s*[–-]", t, re.I):
            return "page number"
        if self.is_h1_size(l["size"]):
            return None
        if re.sub(r"\d+", "#", t.lower()) in self.furniture_sigs:
            return "running header/footer"
        return None

    def is_h1_size(self, size: float) -> bool:
        return any(abs(size - h) <= 0.45 for h in self.h1)

    # ---- reading order -----------------------------------------------------
    def order(self, lines: list[dict]) -> list[dict]:
        W = self.doc[0].rect.width
        mid = W / 2
        blocks: dict = collections.OrderedDict()
        for l in lines:
            blocks.setdefault(l["block"], []).append(l)
        bl = []
        for k, ls in blocks.items():
            x0 = min(l["x0"] for l in ls); x1 = max(l["x1"] for l in ls)
            y0 = min(l["y0"] for l in ls)
            side = "L" if x1 <= mid + 8 else "R" if x0 >= mid - 8 else "F"
            bl.append((y0, x0, side, ls))
        nL = sum(1 for b in bl if b[2] == "L" and len(b[3]) >= 2)
        nR = sum(1 for b in bl if b[2] == "R" and len(b[3]) >= 2)
        bl.sort(key=lambda b: (round(b[0], 0), b[1]))
        if nL >= 1 and nR >= 1 and nL + nR >= 3:
            out, seg = [], []
            def flush():
                seg.sort(key=lambda b: (0 if b[2] == "L" else 1, b[0]))
                out.extend(seg); seg.clear()
            for b in bl:
                if b[2] == "F":
                    flush(); out.append(b)
                else:
                    seg.append(b)
            flush()
            bl = out
            self.two_col_pages += 1
        res = []
        for b in bl:
            res.extend(sorted(b[3], key=lambda l: (round(l["y0"]), l["x0"])))
        return res

    # ---- images ------------------------------------------------------------
    def page_images(self, pno: int, xref_pages: dict) -> list[dict]:
        page = self.doc[pno]
        W, H = page.rect.width, page.rect.height
        out = []
        for info in page.get_image_info(xrefs=True):
            xref = info.get("xref") or 0
            r = pymupdf.Rect(info["bbox"]) & page.rect
            if r.is_empty or r.width < 40 or r.height < 40:
                self.dropped["tiny image/ornament"] += 1
                continue
            if any(rg["kind"] == "render" and rg["page"] == pno + 1 and pymupdf.Rect(rg["rect"]).contains(r)
                   for rg in self.cfg.get("regions", [])):
                self.dropped["image inside a re-rendered diagram region"] += 1
                continue
            if xref and len(xref_pages.get(xref, ())) > 3:
                self.dropped["repeated decorative image"] += 1
                continue
            if r.width * r.height > W * H * 0.85 and len(page.get_text("words")) > 40:
                self.dropped["full-page background image behind text"] += 1
                continue
            out.append({"xref": xref, "rect": r})
        return out

    def save_image(self, pno: int, img: dict, idx: int) -> dict | None:
        xref = img["xref"]
        self.img_dir.mkdir(parents=True, exist_ok=True)
        try:
            if not xref:
                raise ValueError("inline image")
            pix = pymupdf.Pixmap(self.doc, xref)
            info = self.doc.extract_image(xref)
            if info.get("smask"):
                mask = pymupdf.Pixmap(self.doc, info["smask"])
                pix = pymupdf.Pixmap(pix, mask)
            if pix.colorspace and pix.colorspace.n not in (1, 3):
                pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
            if pix.colorspace is None:  # stencil mask: render region instead
                raise ValueError("stencil")
        except Exception:
            pix = self.doc[pno].get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=img["rect"])
        if pix.width > 1400:
            f = max(1, round(pix.width / 1400))
            if f > 1:
                pix.shrink(f.bit_length() - 1)
        alpha = pix.alpha
        h = hashlib.sha1(pix.samples).hexdigest()[:10]
        name = f"p{pno + 1:03d}-{idx}-{h}.{'png' if alpha else 'jpg'}"
        path = self.img_dir / name
        try:
            if alpha:
                pix.save(path)
            else:
                if pix.n > 3:
                    pix = pymupdf.Pixmap(pix, 0)
                pix.save(path, jpg_quality=82)
        except Exception:
            path.unlink(missing_ok=True)  # failed PNG writes leave an empty file behind
            pix = self.doc[pno].get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=img["rect"])
            path = path.with_suffix(".jpg")
            name = path.name
            pix.save(path, jpg_quality=82)
            self.repairs["image re-rendered from page (unsupported colour space)"] += 1
        if not path.exists() or path.stat().st_size == 0:
            # some masked images save as empty files: render the page region instead
            path.unlink(missing_ok=True)
            pix = self.doc[pno].get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=img["rect"])
            path = path.with_suffix(".jpg")
            name = path.name
            pix.save(path, jpg_quality=82)
            self.repairs["empty image file re-rendered from page"] += 1
        key = f"p{pno + 1:03d}-{idx}"
        alt = img.get("alt", ALT.get(self.id, {}).get(key))
        if alt is None:
            self.unreviewed_alt.append(key)
            alt = f"Illustration from page {pno + 1} of the print edition"
        return {"t": "figure", "src": f"{self.img_url}/{name}",
                "alt": alt,
                "width": pix.width, "height": pix.height, "pdfPage": pno + 1,
                "wide": img["rect"].width > self.doc[pno].rect.width * 0.5}

    # ---- main --------------------------------------------------------------
    def extract(self) -> dict:
        doc = self.doc
        self.two_col_pages = 0
        self.detect_shift_fonts()
        self.last = min(doc.page_count, self.cfg.get("last_page") or doc.page_count)
        all_lines = [self.page_lines(i) for i in range(self.last)]
        body = collections.Counter()
        for ls in all_lines:
            for l in ls:
                body[round(l["size"], 1)] += len(l["text"])
        self.body = body.most_common(1)[0][0]
        h1 = self.cfg["h1"]
        if h1 == "auto":
            cands = [s for s, c in body.items() if s > self.body * 1.4]
            per = collections.Counter()
            for ls in all_lines:
                for s in {round(l["size"], 1) for l in ls}:
                    per[s] += 1
            h1 = sorted([s for s in cands if 6 <= per[s] <= 60], key=lambda s: -per[s])[:1]
        self.h1 = h1
        self.find_furniture(all_lines)
        demote = self.cfg.get("demote", [])

        xref_pages = collections.defaultdict(set)
        for i in range(self.last):
            for info in doc[i].get_image_info(xrefs=True):
                if info.get("xref"):
                    xref_pages[info["xref"]].add(i)

        # ---- per-page tokens: (kind, payload) ----
        stream: list[dict] = []
        kept_words: list[str] = []
        self.img_count = 0
        self.region_kept: list[str] = []
        self.regions_done: list[str] = []
        toc_pages = set(self.cfg["toc"]) if isinstance(self.cfg["toc"], list) else set()
        in_toc = False
        for pno, raw in enumerate(all_lines):
            if self.cfg.get("last_page") and pno + 1 > self.cfg["last_page"]:
                break
            if pno == 0:
                # page 1 is the cover in every catalogue PDF: its art is shown as the book cover
                self.dropped["cover page text (shown as cover image)"] += sum(len(words(l["text"])) > 0 for l in raw)
                continue
            lines = []
            for l in raw:
                f = self.is_furniture(l)
                if f:
                    self.dropped[f] += 1
                    continue
                t = l["text"]
                # blank answer lines
                stripped = re.sub(r"_{3,}|\.{6,}|…{3,}", "", t)
                if t.strip() and not stripped.strip(" \t:"):
                    self.dropped["blank answer line"] += 1
                    continue
                if all(s["dingbat"] or not s["t"].strip() for s in l["spans"]):
                    self.dropped["dingbat rule/ornament line"] += 1
                    continue
                lines.append(l)
            region_items, lines = self.regions(pno, lines)
            lines = self.order(lines)
            self.mark_columns(lines)
            lines = self.order_checklists(lines)
            # contents page detection
            heads = [l for l in lines if self.is_h1_size(l["size"]) or l["size"] >= self.body * 1.5]
            first_head = heads[0]["text"].strip().lower() if heads else ""
            if (pno + 1) in toc_pages or (self.cfg["toc"] == "auto" and re.fullmatch(r"(table of )?contents", first_head)):
                in_toc = True
            elif in_toc and self.cfg["toc"] == "auto":
                # TOC continues on pages full of dot leaders / trailing page numbers with no h1 heading
                numbered = sum(1 for l in lines if re.search(r"(\.{3,}|\s)\d{1,3}\s*$", l["text"]))
                in_toc = numbered >= max(3, len(lines) * 0.5) and not any(self.is_h1_size(l["size"]) for l in lines)
            else:
                in_toc = False
            if in_toc:
                self.toc_pages_found.append(pno + 1)
                self.dropped["printed contents page lines (replaced by web contents)"] += len(lines)
                continue
            imgs = self.page_images(pno, xref_pages)
            items = [{"k": "line", "l": l, "y": l["y0"]} for l in lines] + region_items
            for j, im in enumerate(imgs):
                fig = self.save_image(pno, im, j)
                if fig:
                    self.img_count += 1
                    items.append({"k": "fig", "fig": fig, "y": im["rect"].y0})
            # place figures before the first line that starts below them (keeps column order)
            ordered = [it for it in items if it["k"] == "line"]
            for it in sorted([i for i in items if i["k"] == "fig"], key=lambda i: i["y"]):
                pos = next((n for n, x in enumerate(ordered) if x["k"] == "line" and x["y"] >= it["y"]), len(ordered))
                ordered.insert(pos, it)
            # drop caps: a 1-3 letter span far above body size joins the next line
            pending = ""
            for it in ordered:
                if it["k"] == "fig":
                    stream.append(it)
                    continue
                l = it["l"]
                t = l["text"].strip()
                if l["size"] >= self.body * 2.2 and len(t) <= 3 and not self.is_h1_size(l["size"]) and re.fullmatch(r"[“\"‘']?[A-Za-z]{1,2}", t):
                    pending += t
                    self.repairs["drop cap rejoined"] += 1
                    continue
                if pending:
                    l = dict(l)
                    l["spans"] = [dict(l["spans"][0], t=pending + l["spans"][0]["t"].lstrip())] + l["spans"][1:]
                    l["text"] = "".join(s["t"] for s in l["spans"])
                    pending = ""
                kept_words.append("".join(sp["t"] for sp in l["spans"] if not sp.get("dingbat")) if l.get("check") else l["text"])
                stream.append({"k": "line", "l": l})
            if pending:
                stream.append({"k": "line", "l": {**ordered[-1]["l"], "spans": [{"t": pending, "size": self.body, "bold": False, "ital": False, "href": None, "dingbat": False}], "text": pending}} if ordered and ordered[-1]["k"] == "line" else {"k": "noop"})
                kept_words.append(pending)
        self.kept_words = kept_words
        return self.structure(stream, demote)

    # ---- authored structure: tables, option lists, diagrams ---------------------
    CHECK_GLYPHS = {"\x86", "❑", "\u2751", "\ufffd"}  # Wingdings box decodes as U+FFFD in this PDF

    def mark_columns(self, lines: list[dict]) -> None:
        """Record each body line's column left/right edge so short last lines and
        indented one-line paragraphs (dialogue) can be detected."""
        body = [l for l in lines if abs(l["size"] - self.body) < 0.6]
        for l in lines:
            peers = [m for m in body if abs(m["x0"] - l["x0"]) < 30 or (m["x0"] <= l["x0"] + 12 and m["x1"] >= l["x0"] + 40)]
            if peers:
                l["colr"] = max(m["x1"] for m in peers)
                l["coll"] = min(m["x0"] for m in peers)

    def is_check(self, l: dict) -> bool:
        for sp in l["spans"]:
            if sp["t"].strip():
                return bool(sp.get("dingbat")) and sp["t"].strip() in self.CHECK_GLYPHS or sp["t"].lstrip()[:1] == "❑"
        return False

    def order_checklists(self, lines: list[dict]) -> list[dict]:
        """Tick-box options printed in two columns: keep authored column order."""
        out, run = [], []
        W = self.doc[0].rect.width
        def flush():
            out.extend(sorted(run, key=lambda l: (l["x0"] > W * 0.45, l["y0"])))
            run.clear()
        for l in lines:
            if self.is_check(l):
                l["check"] = True
                run.append(l)
            else:
                if run and not l["text"].strip():
                    continue
                flush(); out.append(l)
        flush()
        return out

    @staticmethod
    def _join_cell(s: str | None, head: bool = False, items_only: bool = False) -> str:
        if not s:
            return ""
        parts = [re.sub(r"\s+", " ", x).strip() for x in s.split("\n")]
        parts = [x for x in parts if x]
        if items_only and not head:
            return "\n".join(parts)
        if head:
            return " ".join(parts)
        items: list[str] = []
        for x in parts:
            if items and (re.match(r"[a-z0-9(–-]", x) or re.search(r"(\b(of|for|to|in|and|the|a|that|who)|[-,–])$", items[-1])):
                items[-1] = items[-1] + ("" if items[-1].endswith("-") and re.match(r"[a-z]", x) else " ") + x
            else:
                items.append(x)
        return "\n".join(items)

    def _take(self, lines: list[dict], rect) -> tuple[list[dict], list[dict]]:
        inside, rest = [], []
        for l in lines:
            cx, cy = (l["x0"] + l["x1"]) / 2, (l["y0"] + l["y1"]) / 2
            (inside if rect.contains(pymupdf.Point(cx, cy)) else rest).append(l)
        self.region_kept += [l["text"] for l in inside if l["text"].strip()]
        return inside, rest

    def _fix(self, s: str) -> str:
        return "\n".join(self.fix_text(x) for x in s.split("\n"))

    def regions(self, pno: int, lines: list[dict]):
        page = self.doc[pno]
        regs = [r for r in self.cfg.get("regions", []) if r["page"] == pno + 1]
        if self.cfg.get("sin_family_boxes"):
            hd = [l for l in lines if l["text"].strip() == "SIN FAMILY"]
            vt = [l for l in lines if l["text"].strip() == "VIRTUE"]
            if hd and vt:
                y0 = hd[0]["y0"] - 2
                box = [l for l in lines if l["y0"] >= y0 and l["y0"] < y0 + 220 and l["size"] < self.body - 0.4]
                y1 = max(l["y1"] for l in box) + 2
                regs.append({"page": pno + 1, "kind": "boxes", "rect": [0, y0, page.rect.width, y1],
                             "split": (hd[0]["x1"] + vt[0]["x0"]) / 2})
        items = []
        for r in regs:
            blocks: list[dict] = []
            if r["kind"] == "lines":
                tabs = [t for t in page.find_tables(strategy="lines").tables if t.row_count >= 2 and t.col_count >= 2]
                if not tabs:
                    raise SystemExit(f"{self.id}: expected a ruled table on page {pno + 1}")
                for t in tabs:
                    rect = pymupdf.Rect(t.bbox)
                    _, lines = self._take(lines, rect + (-2, -2, 2, 2))
                    rows = t.extract()
                    caption = None
                    if sum(1 for c in rows[0] if c) == 1 and t.col_count > 1:
                        caption = self._join_cell(next(c for c in rows[0] if c), head=True)
                        rows = rows[1:]
                    if r.get("head", True):
                        head = [self._fix(self._join_cell(c, head=True)) for c in rows[0]]
                        rows = rows[1:]
                    else:
                        head = []
                    body = [[self._fix(self._join_cell(c, items_only=bool(r.get("items")))) for c in row] for row in rows]
                    body = [row for row in body if any(row)]
                    keep = [i for i in range(len(head) or len(body[0])) if (head and head[i]) or any(row[i] for row in body)]
                    head = [head[i] for i in keep] if head else []
                    body = [[row[i] for i in keep] for row in body]
                    if head and not any(head) and body:
                        head = body.pop(0)
                    b = {"t": "table", "head": head, "rows": body, "rowHeaders": bool(r.get("rowHeaders", True)), "pdfPage": pno + 1}
                    if caption:
                        b["caption"] = self.fix_text(caption)
                    blocks.append((rect.y0, b))
            elif r["kind"] in ("cols", "list", "boxes"):
                rect = pymupdf.Rect(r["rect"])
                inside, lines = self._take(lines, rect)
                if r["kind"] == "boxes":
                    cols = [[l for l in inside if (l["x0"] + l["x1"]) / 2 < r["split"]], [l for l in inside if (l["x0"] + l["x1"]) / 2 >= r["split"]]]
                    cols = [[re.sub(r"\s+", " ", l["text"]).strip() for l in sorted(c, key=lambda l: l["y0"]) if l["text"].strip()] for c in cols]
                    head = [c[0].capitalize() if c[0].isupper() else c[0] for c in cols]
                    blocks.append((rect.y0, {"t": "table", "head": head, "rows": [[self._fix("\n".join(c[1:])) for c in cols]],
                                             "rowHeaders": False, "pdfPage": pno + 1,
                                             "note": "In the print edition an arrow points from the sin family to its virtue."}))
                    self.regions_done.append(f"p{pno + 1} sin family → virtue")
                    items += [{"k": "fig", "fig": dict(b, _r=True), "y": y} for y, b in blocks]
                    continue
                xs = r["cols"]
                n = len(xs) + 1
                col = lambda x: sum(1 for c in xs if x >= c)
                rows: list[dict] = []
                pieces = []
                for l in inside:
                    # split a line into per-column pieces by span position (PyMuPDF can
                    # merge neighbouring cells into one line)
                    groups: dict[int, list[str]] = {}
                    for sp in l["spans"]:
                        if sp.get("dingbat"):
                            continue
                        groups.setdefault(col(sp["bbox"][0]) if sp["t"].strip() else (max(groups) if groups else col(l["x0"])), []).append(sp["t"])
                    for c, ts in groups.items():
                        pieces.append((l["y0"], c, "".join(ts), l))
                for y, c, t, l in sorted(pieces, key=lambda p: (p[0], p[1])):
                    t = re.sub(r"\s+", " ", t).strip().lstrip("•").strip()
                    if not t:
                        continue
                    if rows and abs(l["y0"] - rows[-1]["y"]) < 5:
                        rows[-1]["cells"][c] = (rows[-1]["cells"][c] + " " + t).strip()
                    else:
                        rows.append({"y": l["y0"], "cells": [""] * n, "bold": l["bold"]})
                        rows[-1]["cells"][c] = t
                if r["kind"] == "list":
                    items_ = [row["cells"][c] for c in range(n) for row in rows if row["cells"][c]]
                    blocks.append((rect.y0, {"t": "ul", "items": [esc(self.fix_text(i)) for i in items_], "pdfPage": pno + 1}))
                else:
                    head = r.get("head")
                    if head is True:
                        head = [h.capitalize() if h.isupper() else h for h in rows.pop(0)["cells"]]
                    cur = {"t": "table", "head": head, "rows": [], "rowHeaders": bool(r.get("rowHeaders", True)), "pdfPage": pno + 1}
                    tables = [cur]
                    for row in rows:
                        filled = [c for c in range(n) if row["cells"][c]]
                        sec_txt = row["cells"][filled[0]] if filled else ""
                        if r.get("sections") and filled == [r["sections"]] and all(w.isupper() for w in re.findall(r"[A-Za-z]{3,}", sec_txt)):
                            cur = {"t": "table", "head": head, "rows": [], "caption": row["cells"][filled[0]],
                                   "rowHeaders": cur["rowHeaders"], "pdfPage": pno + 1}
                            tables.append(cur)
                        elif cur["rows"] and not row["cells"][0]:
                            for c in filled:
                                cur["rows"][-1][c] = (cur["rows"][-1][c] + " " + row["cells"][c]).strip()
                        else:
                            cur["rows"].append(row["cells"])
                    for t in tables:
                        if t["rows"]:
                            t["head"] = [self.fix_text(h) for h in t["head"]]
                            t["rows"] = [[self.fix_text(c) for c in row] for row in t["rows"]]
                            blocks.append((rect.y0, t))
            elif r["kind"] == "render":
                rect = pymupdf.Rect(r["rect"])
                _, lines = self._take(lines, rect)
                fig = self.save_image(pno, {"xref": 0, "rect": rect, "alt": r["alt"]}, 9)
                fig["vector"] = True
                blocks.append((rect.y0, fig))
            if not blocks:
                raise SystemExit(f"{self.id}: region on page {pno + 1} produced nothing")
            self.regions_done.append(f"p{pno + 1} {r['kind']}")
            items += [{"k": "fig", "fig": dict(b, _r=True), "y": y} for y, b in blocks]
        return items, lines

    # ---- inline html ------------------------------------------------------
    def inline(self, spans: list[dict]) -> str:
        out = []
        cur = None
        buf = ""
        for s in spans:
            if s.get("dingbat"):
                continue
            st = (s["bold"] and not self.all_bold, s["ital"] and not self.all_ital, s["href"])
            if cur is None:
                cur = st
            if st != cur and s["t"].strip():
                out.append((cur, buf)); buf = ""; cur = st
            buf += s["t"]
        if buf:
            out.append((cur, buf))
        res = []
        for (b, i, href), t in out:
            lead = len(t) - len(t.lstrip()); trail = len(t) - len(t.rstrip())
            core = esc(t.strip())
            if not core:
                res.append(" " if t else "")
                continue
            if i: core = f"<em>{core}</em>"
            if b: core = f"<strong>{core}</strong>"
            if href and re.match(r"https?://|mailto:", href):
                core = f'<a href="{esc(href).replace(chr(34), "&quot;")}">{core}</a>'
            res.append(t[:lead] + core + (t[len(t) - trail:] if trail else ""))
        return "".join(res)

    # ---- structure -----------------------------------------------------------
    def structure(self, stream: list[dict], demote: list) -> dict:
        # paragraphs
        paras: list[dict] = []
        cur = None
        prev = None
        for it in stream:
            if it["k"] == "noop":
                continue
            if it["k"] == "fig":
                cur = None
                paras.append({"kind": "fig", "fig": it["fig"]})
                prev = None
                continue
            l = it["l"]
            t = l["text"].strip()
            first = l["spans"][0]["t"].lstrip() if l["spans"] else ""
            is_bullet = bool(t) and (t[0] in BULLET_CHARS and (len(t) > 1 and t[1] in " \t")) or (l["spans"] and l["spans"][0]["dingbat"] and len(l["spans"][0]["t"].strip()) <= 2) or t[:1] in "•▪●◦‣■❑➢►"
            h1 = self.is_h1_size(l["size"]) and len(t) <= self.cfg.get("maxh1", 120) and not any(abs(l["size"] - d) < 0.45 for d in demote)
            role = "h1" if h1 else "h2" if (l["size"] >= self.body * 1.12 and len(t) < 160) else "body"
            new = cur is None or prev is None
            if not new:
                same_page = prev["page"] == l["page"]
                gap = l["y0"] - prev["y1"] if same_page else 0
                if role != cur["role"]:
                    new = True
                elif role == "h1":
                    new = not same_page or gap > l["size"] * 1.2
                elif is_bullet or l.get("check"):
                    new = True
                elif same_page:
                    if gap > max(prev["size"], l["size"]) * 0.55 or gap < -l["size"] * 2:
                        new = True
                    elif l["x0"] > prev["x0"] + 9 and not cur.get("bullet") and abs(l["x0"] - cur["x0"]) > 9:
                        new = True  # first-line indent
                    elif ("coll" in l and l["x0"] >= l["coll"] + 6 and abs(l["x0"] - prev["x0"]) < 2 and prev["x0"] >= prev.get("coll", 0) + 6
                          and TERMINAL.search(prev["text"]) and prev["x1"] < prev.get("colr", prev["x1"]) - max(18, prev["size"] * 2.5)
                          and not cur.get("bullet") and l["x1"] > l["coll"] + 40):
                        new = True  # indented one-line paragraph (dialogue) followed by another indented paragraph
                    elif l["block"] != prev["block"] and (TERMINAL.search(prev["text"]) and l["x0"] > prev["x0"] + 9):
                        new = True
                    elif TERMINAL.search(prev["text"]) and re.match(r"\d{1,3}\.\s+\S", t):
                        new = True  # numbered note / list item
                    elif TERMINAL.search(prev["text"]) and prev["x1"] < prev.get("colr", prev["x1"]) - max(18, prev["size"] * 3):
                        new = True  # short last line of a paragraph
                    elif abs(l["size"] - prev["size"]) > 1.2:
                        new = True
                    elif l["bold"] != cur["bold"] and len(cur["lines"]) and TERMINAL.search(prev["text"] or "") is None and cur["bold"]:
                        new = True
                else:
                    # page turn: continue only an unfinished sentence
                    new = bool(TERMINAL.search(prev["text"])) or not re.match(r"[a-z(]", t)
            if new:
                cur = {"kind": "para", "role": role, "lines": [], "x0": l["x0"], "x1": l["x1"], "bullet": bool(is_bullet and role == "body"),
                       "bold": l["bold"], "ital": l["ital"], "page": l["page"], "size": l["size"], "check": bool(l.get("check"))}
                paras.append(cur)
            cur["lines"].append(l)
            cur["x1"] = max(cur["x1"], l["x1"])
            cur["bold"] = cur["bold"] and l["bold"]
            cur["ital"] = cur["ital"] and l["ital"]
            prev = l

        # body margins per page for quote detection
        W = self.doc[0].rect.width
        lefts = collections.Counter(round(p["x0"]) for p in paras if p["kind"] == "para" and p["role"] == "body" and len(p["lines"]) >= 3)
        left = lefts.most_common(1)[0][0] if lefts else 72
        rights = collections.Counter(round(max(l["x1"] for l in p["lines"])) for p in paras if p["kind"] == "para" and p["role"] == "body" and len(p["lines"]) >= 3)
        right = rights.most_common(1)[0][0] if rights else W - 72

        blocks: list[dict] = []
        def first_indent_of_next(i: int) -> float | None:
            # skip following one-liners at the same x; the run must end in a normal
            # body paragraph whose first line is indented relative to its second
            x = paras[i]["x0"]
            for q in paras[i + 1:i + 8]:
                if q["kind"] != "para" or q["role"] != "body":
                    return None
                if len(q["lines"]) == 1 and abs(q["x0"] - x) < 1.5:
                    continue
                if len(q["lines"]) >= 2 and q["lines"][1]["x0"] < q["lines"][0]["x0"] - 6:
                    return q["lines"][0]["x0"]
                return None
            return None
        for pi, p in enumerate(paras):
            if p["kind"] == "fig":
                f = p["fig"]
                blocks.append({"b": f if f["t"] == "figure" else {k: v for k, v in f.items() if k != "pdfPage"}, "page": f["pdfPage"]})
                continue
            spans = []
            for n, l in enumerate(p["lines"]):
                ls = [dict(s) for s in l["spans"]]
                if spans:
                    prevtxt = spans[-1]["t"].rstrip()
                    nxt = "".join(s["t"] for s in ls).lstrip()
                    m = re.search(r"([A-Za-z]+)[-‐]$", prevtxt)
                    if m and re.match(r"[a-z]", nxt):
                        nw = re.match(r"[a-z]+", nxt).group(0)
                        joined, hyph = m.group(1) + nw, m.group(1) + "-" + nw
                        if lex(joined) >= LEX.get(hyph, 0) and (lex(joined) > 0 or lex(nw) == 0):
                            spans[-1]["t"] = prevtxt[:-1]
                            self.repairs["wrap hyphen removed"] += 1
                        else:
                            spans[-1]["t"] = prevtxt
                        ls[0]["t"] = ls[0]["t"].lstrip()
                    elif prevtxt.endswith(("—", "/")):
                        spans[-1]["t"] = prevtxt
                        ls[0]["t"] = ls[0]["t"].lstrip()
                    else:
                        spans[-1]["t"] = prevtxt + " "
                        ls[0]["t"] = ls[0]["t"].lstrip()
                spans.extend(ls)
            # strip trailing/embedded answer underscores
            for s in spans:
                if re.search(r"_{3,}", s["t"]):
                    s["t"] = re.sub(r"\s*_{3,}\s*", f" {self.BLANK} ", s["t"])
                    self.repairs["typed answer blank kept"] += 1
            self.all_bold = p["bold"] and p["role"] != "body"
            self.all_ital = False
            text = re.sub(r"\s+", " ", "".join(s["t"] for s in spans)).strip()
            if not text:
                continue
            htmlx = re.sub(r"\s+", " ", self.inline(spans)).strip()
            htmlx = re.sub(r"</strong>(\s*)<strong>", r"\1", htmlx)
            htmlx = re.sub(r"</em>(\s*)<em>", r"\1", htmlx)
            if p["role"] == "h1":
                blocks.append({"b": {"t": "h1", "text": text, "lines": [re.sub(r"\s+", " ", l["text"]).strip() for l in p["lines"]]}, "page": p["page"]})
            elif p["role"] == "h2" or (p["bold"] and len(text) < 90 and not re.search(r"[.,;]$", text) and len(p["lines"]) <= 2 and not p["bullet"]) and not re.match(r"[•▪●◦]\s", text):
                blocks.append({"b": {"t": "h2", "text": text}, "page": p["page"]})
            elif p.get("check"):
                item = re.sub(r"^\s*❑\s*", "", htmlx)
                item = re.sub(r"(Other:)\s*\.?\s*$", r"\1 ________", item)
                if blocks and blocks[-1]["b"]["t"] == "checklist" and blocks[-1]["page"] == p["page"]:
                    blocks[-1]["b"]["items"].append(item)
                else:
                    blocks.append({"b": {"t": "checklist", "items": [item]}, "page": p["page"]})
            elif p["bullet"] or re.match(r"[•▪●◦]\s", text):
                item = re.sub(r"^\s*(?:[•▪●◦‣∙·■□❑➢➤►▶✓✔❖⁃]|[-–](?=\s))\s*", "", htmlx)
                if blocks and blocks[-1]["b"]["t"] == "ul" and blocks[-1]["page"] >= p["page"] - 1:
                    blocks[-1]["b"]["items"].append(item)
                else:
                    blocks.append({"b": {"t": "ul", "items": [item]}, "page": p["page"]})
            elif (p["x0"] >= left + 18 and max(l["x1"] for l in p["lines"]) <= right - 18 and len(text) > 40 and self.two_col_pages < 3
                  # a one-line paragraph sitting at the same first-line indent as the
                  # following body paragraph is dialogue, not an indented quotation
                  and not (len(p["lines"]) == 1 and first_indent_of_next(pi) is not None and abs(first_indent_of_next(pi) - p["x0"]) < 1.5)):
                kind = "scripture" if re.search(r"\b\d{1,3}:\d{1,3}\b", text[-40:]) else "excerpt"
                blocks.append({"b": {"t": "quote", "kind": kind, "html": htmlx}, "page": p["page"]})
            else:
                blocks.append({"b": {"t": "p", "html": htmlx}, "page": p["page"]})
        return self.split(blocks)

    # ---- ligature repair over final html ------------------------------------
    def fix_text(self, s: str) -> str:
        def rep(m):
            tok = m.group(0)
            r = repair_token(tok)
            if r:
                self.repairs[f"ligature: {tok} -> {r}"] += 1
                return r
            return tok
        def lig(m):
            a, b = m.group(1), m.group(2)
            j = a + b
            # join when the joined form is a known word and a half is not, or when
            # neither half is a word at all ("selfi sh": no PDF prints "selfish" whole)
            # (the lexicon is built from these same PDFs, so broken halves like "fi" and
            # "rst" occur in it too; prefer the joined form when it is at least as common
            # as the rarer half)
            # English words practically never end in "fi"/"fl", so a token ending in
            # one of those ligatures is always a broken word
            if re.search(r"f[il]$", a) or (lex(j) > 0 and lex(j) >= min(lex(a), lex(b))) or (lex(a) == 0 and lex(b) == 0):
                self.repairs["space after ligature removed"] += 1
                return j
            return m.group(0)
        parts = re.split(r"(<[^>]+>)", s)
        parts = [p if p.startswith("<") else re.sub(r"[A-Za-z0-9\ufffd]+", rep, p) for p in parts]
        return "".join(p if p.startswith("<") else re.sub(r"\b([A-Za-z]*(?:ffi|ffl|fi|fl|ff))\s([a-zà-ÿ]+)\b", lig, p) for p in parts)

    def fix_block(self, b: dict) -> dict:
        b = self._fix_block(b)
        def walk(o, key=None):
            if isinstance(o, str):
                return self.blank_markup(o, key in ("html", "items")).strip() if self.BLANK in o else o
            if isinstance(o, list):
                return [walk(x, key) for x in o]
            if isinstance(o, dict):
                return {k: walk(v, k) for k, v in o.items()}
            return o
        return walk(b)

    def _fix_block(self, b: dict) -> dict:
        for k in ("html", "text"):
            if k in b:
                b[k] = self.fix_text(b[k])
        if b.get("t") == "checklist":
            b["items"] = [self.fix_text(i) for i in b["items"]]
            return b
        if "items" in b:
            b["items"] = [self.fix_text(i) for i in b["items"]]
        if "lines" in b:
            b["lines"] = [self.fix_text(i) for i in b["lines"]]
        return b

    @staticmethod
    def merge_number_scales(blocks: list[dict]) -> list[dict]:
        """A printed 1-10 rating scale is laid out as separate numbers; keep it as one
        scale instead of ten stranded headings."""
        def num(e):
            b = e["b"]
            t = b.get("text") if b["t"] == "h2" else b.get("html") if b["t"] == "p" else None
            return int(t) if t and re.fullmatch(r"\d{1,2}", t.strip()) else None
        out, i = [], 0
        while i < len(blocks):
            j = i
            while j < len(blocks) and num(blocks[j]) == (num(blocks[i]) or -9) + (j - i):
                j += 1
            if num(blocks[i]) is not None and j - i >= 4:
                nums = [str(num(e)) for e in blocks[i:j]]
                html = '<span class="rb-scale" role="group" aria-label="Scale from ' + nums[0] + " to " + nums[-1] + '">' + "".join(f"<span>{n}</span>" for n in nums) + "</span>"
                out.append({"b": {"t": "p", "html": html}, "page": blocks[i]["page"]})
                i = j
            else:
                out.append(blocks[i]); i += 1
        return out

    # ---- chapters ---------------------------------------------------------------
    def split(self, blocks: list[dict]) -> dict:
        front: list[dict] = []
        chapters: list[dict] = []
        used = set()
        blocks = self.merge_number_scales(blocks)
        for e in blocks:
            b = self.fix_block(e["b"])
            if b["t"] == "h1":
                lines = b.pop("lines")
                label = None
                if len(lines) > 1 and re.fullmatch(r"(\d{1,2}\.?|[A-Z]\.|Day \d+|Part [IVX]+|Chapter \d+|Session \w+)", lines[0], re.I):
                    label = lines[0].rstrip(".")
                    title = " ".join(lines[1:])
                else:
                    title = b["text"]
                    m = re.match(r"^(\d{1,2})\.\s+(.*)$", title)
                    if m:
                        label, title = m.group(1), m.group(2)
                title = re.sub(r"\s+", " ", title).strip()
                if label is None and re.fullmatch(r"\d{1,2}\.?|[A-Z]\.|Day \d+|Part [IVX]+|Chapter \d+", title, re.I):
                    # number-only heading line: hold as label for the next heading on the page
                    self.pending_label = title.rstrip(".")
                    continue
                if getattr(self, "pending_label", None):
                    label, self.pending_label = self.pending_label, None
                number = int(label) if label and label.isdigit() else int(re.search(r"\d+", label).group(0)) if label and re.match(r"(Day|Chapter) \d+", label, re.I) else None
                base = re.sub(r"[^a-z0-9]+", "-", title.lower().replace("’", "").replace("'", "")).strip("-")[:70].strip("-") or "section"
                slug = base
                n = 2
                while slug in used:
                    slug = f"{base}-{n}"; n += 1
                used.add(slug)
                chapters.append({"slug": slug, "title": title, "label": label, "number": number, "pdfPage": e["page"], "blocks": []})
                continue
            if chapters:
                chapters[-1]["blocks"].append(b)
            else:
                front.append(b)
        # merge empty divider chapters (part openers with no text) into the next one as an eyebrow
        merged = []
        carry = None
        for c in chapters:
            if carry:
                c["part"] = carry["title"]
                c["pdfPage"] = min(c["pdfPage"], carry["pdfPage"])
                carry = None
            if not c["blocks"]:
                carry = c
                continue
            merged.append(c)
        if carry:
            merged.append(carry)
        return {"frontMatter": front, "chapters": merged}


# ---------------------------------------------------------------------------
FURN: set = set()
FURN_TOKENS: set = set()


def poppler_words(pdf: Path, first: int, last: int) -> list[str]:
    try:
        out = subprocess.run(["pdftotext", "-f", str(first), "-l", str(last), "-enc", "UTF-8", str(pdf), "-"],
                             capture_output=True, text=True, timeout=300).stdout
    except Exception:
        return []
    out = unicodedata.normalize("NFKC", out)
    keep = []
    for line in out.split("\n"):
        t = line.strip()
        toks = set(words(t))
        if re.fullmatch(r"(page\s*)?[0-9ivxlc]{1,4}", t, re.I) or re.sub(r"\d+", "#", t.lower()) in FURN or (toks and toks <= FURN_TOKENS):
            continue
        if re.search(r"\.indd\b", t) or re.fullmatch(r"[_.…\s]{4,}", t):
            continue
        keep.append(line)
    return words("\n".join(keep))


def coverage(src: list[str], got: list[str], n: int = 24, strip: str | None = None) -> tuple[float, list[str]]:
    """Normalized-chunk coverage: the source word stream (letters/digits only,
    no spaces, so wrap hyphens and line joins cannot matter) is cut into
    n-character chunks; each chunk must occur somewhere in the output stream."""
    s = "".join(src).replace("'", "")
    g = "".join(got).replace("'", "")
    if strip:
        s = re.sub(strip, "", s)
        g = re.sub(strip, "", g)
    total = miss = 0
    missing = []
    for i in range(0, max(0, len(s) - n), n):
        ch = s[i:i + n]
        total += 1
        if ch not in g:
            miss += 1
            if len(missing) < 40:
                missing.append(ch)
    return (1 - miss / max(1, total)), missing


def word_coverage(src: list[str], got: list[str]) -> tuple[float, list[str]]:
    gc = collections.Counter(got)
    missing = []
    sc = collections.Counter(src)
    lost = 0
    for w, c in sc.items():
        d = c - gc.get(w, 0)
        if d > 0:
            lost += d
            missing.append(w)
    return (1 - lost / max(1, len(src))), missing


def block_words(b: dict) -> list[str]:
    t = b["t"]
    if t in ("p", "quote"): return words(b["html"])
    if t in ("h2", "h3"): return words(b["text"])
    if t in ("ul", "checklist"): return [w for i in b["items"] for w in words(i)]
    if t == "figure" and b.get("vector"): return words(b["alt"])
    if t == "table": return words(" ".join([b.get("caption") or ""] + b["head"] + [c for r in b["rows"] for c in r]))
    return []


def run(bid: str) -> dict:
    cfg = CONFIG[bid]
    global TF_GLYPH
    TF_GLYPH = bool(cfg.get("tf_glyph"))
    GLYPH_FALLBACK.clear(); GLYPH_FALLBACK.update(cfg.get("glyph_fallback", {}))
    bk = Book(bid, cfg)
    bk.toc_pages_found = []
    if bk.img_dir.exists():
        for f in bk.img_dir.iterdir():
            f.unlink()
    res = bk.extract()
    out_words = [w for b in res["frontMatter"] for w in block_words(b)]
    flow_words = list(out_words)
    region_out: list[str] = []
    for c in res["chapters"]:
        hw = words(c.get("part") or "") + words(c.get("label") or "") + words(c["title"])
        out_words += hw; flow_words += hw
        for b in c["blocks"]:
            bw = block_words(b)
            out_words += bw
            (region_out if b.get("_r") else flow_words).extend(bw)
    for b in res["frontMatter"] + [b for c in res["chapters"] for b in c["blocks"]]:
        b.pop("_r", None)
    # (a2) authored tables / option lists / diagrams: every source word in the region
    # must appear in the structured block (order-independent: tables reorder cells)
    reg_src = [w for t in bk.region_kept for w in words(bk.fix_text(t))]
    reg_cov, reg_missing = word_coverage(reg_src, region_out) if reg_src else (1.0, [])
    # (a) internal coverage: every kept line's words must be present
    kept = [w for w in bk.kept_words]
    # repairs change tokens; compare after applying the same repairs
    kept_fixed = [w for t in kept for w in words(bk.fix_text(t))]
    int_cov, int_missing = coverage(kept_fixed, flow_words)
    # (b) independent poppler coverage (body pages, minus contents pages & cover)
    FURN.clear(); FURN.update(bk.furniture_sigs)
    FURN_TOKENS.clear(); FURN_TOKENS.update(w for k in bk.furniture_sigs for w in words(k)); FURN_TOKENS.update(str(i) for i in range(1000))
    last = cfg.get("last_page") or bk.doc.page_count
    pages = [p for p in range(2, last + 1) if p not in set(bk.toc_pages_found)]
    pop = []
    for p in pages:
        pop += poppler_words(PDF_DIR / f"{bid}.pdf", p, p) if len(pages) < 40 else []
    if len(pages) >= 40:
        # batch for speed, excluding toc ranges
        ranges = []
        start = None
        for p in range(2, last + 2):
            if p in pages and start is None:
                start = p
            if (p not in pages or p == last + 1) and start is not None:
                ranges.append((start, p - 1)); start = None
        for a, z in ranges:
            pop += poppler_words(PDF_DIR / f"{bid}.pdf", a, z)
    # ligature-insensitive: poppler silently drops fi/fl/ti/tt glyphs in several of
    # these PDFs, so letters that participate in ligatures are ignored here.
    pop_cov, pop_missing = coverage(pop, out_words, n=20, strip=r"[filth]")
    # order-independent word-bag check (pull-quotes and sidebars make poppler's
    # reading order differ from the book's; this isolates real omissions)
    norm = lambda ws: [re.sub(r"[filth']", "", w) for w in ws if re.sub(r"[filth']", "", w)]
    bag_cov, bag_missing = word_coverage(norm(pop), norm(out_words))
    sus = collections.Counter()
    for w in out_words:
        if re.search(r"[a-z][A-Z]|[a-z]\d|\d[a-z]{2}", w) or lex(w) == 0:
            pass
    def strings(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k not in ("src", "slug", "t", "kind"):
                    yield from strings(v)
        elif isinstance(o, list):
            for v in o:
                yield from strings(v)
        elif isinstance(o, str):
            yield o
    alltext = "\n".join(strings(res))
    weird = collections.Counter(c for c in alltext if 0xE000 <= ord(c) <= 0xF8FF or c == "\ufffd" or 0x0800 <= ord(c) <= 0x08FF)
    garbled = re.findall(r"\b[A-Z]?[a-z]+[A-Z0-9][a-z]+\b", re.sub(r"<[^>]+>", " ", alltext))
    garbled = [g for g in garbled if not re.match(r"(Mc|Mac|La|De|Di|Le|Van|iP|eB|You|Jesus|God)", g)]
    figs = sum(1 for c in res["chapters"] for b in c["blocks"] if b["t"] == "figure") + sum(1 for b in res["frontMatter"] if b["t"] == "figure")
    report = {
        "id": bid,
        "sourcePages": bk.doc.page_count,
        "bodyFontSize": bk.body,
        "chapterHeadingSizes": bk.h1,
        "readings": len(res["chapters"]),
        "figures": figs,
        "twoColumnPages": bk.two_col_pages,
        "printedContentsPages": bk.toc_pages_found,
        "decodedShiftFonts": sorted(bk.font_shift),
        "repairs": dict(sorted(bk.repairs.items(), key=lambda kv: -kv[1])),
        "removed": dict(bk.dropped),
        "internalCoverage": round(int_cov, 5),
        "internalMissingSample": int_missing[:25],
        "independentCoverage": round(pop_cov, 5),
        "independentMissingSample": pop_missing[:40],
        "independentWordBagCoverage": round(bag_cov, 5),
        "independentWordBagMissingSample": bag_missing[:40],
        "structuredRegions": bk.regions_done,
        "regionWordCoverage": round(reg_cov, 5),
        "regionMissingSample": reg_missing[:25],
        "figuresWithoutReviewedAlt": bk.unreviewed_alt,
        "unexpectedGlyphs": {f"U+{ord(k):04X}": v for k, v in weird.items()},
        "suspiciousTokens": sorted(set(garbled))[:40],
        "words": len(out_words),
        "chapters": [{"slug": c["slug"], "title": c["title"], "label": c.get("label"), "pdfPage": c["pdfPage"], "blocks": len(c["blocks"])} for c in res["chapters"]],
    }
    data = {
        "id": bid,
        "source": f"public/books/{bid}.pdf",
        "sourcePages": bk.doc.page_count,
        "sourceSha256": hashlib.sha256((PDF_DIR / f"{bid}.pdf").read_bytes()).hexdigest(),
        "frontMatter": res["frontMatter"],
        "chapters": res["chapters"],
        "audit": {"internalCoverage": report["internalCoverage"], "independentCoverage": report["independentCoverage"],
                  "figures": figs, "words": len(out_words)},
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / f"{bid}.json").write_text(json.dumps(data, ensure_ascii=False, indent=0) + "\n", encoding="utf-8")
    return report


def main(argv: list[str]) -> int:
    ids = argv or list(CONFIG)
    build_lexicon([k for k in CONFIG if k != "knowing-god"])
    reports = []
    rp = OUT_DIR / "extraction-report.json"
    old = {r["id"]: r for r in json.loads(rp.read_text())["books"]} if rp.exists() else {}
    for bid in ids:
        r = run(bid)
        old[bid] = r
        print(f"{bid:42s} pages={r['sourcePages']:4d} readings={r['readings']:3d} figs={r['figures']:3d} "
              f"int={r['internalCoverage']:.4f} indep={r['independentCoverage']:.4f} bag={r['independentWordBagCoverage']:.4f} glyphs={r['unexpectedGlyphs']} sus={len(r['suspiciousTokens'])}")
    reports = [old[k] for k in CONFIG if k in old]
    failed = []
    for r in reports:
        why = []
        if r["internalCoverage"] < GATE["internal"]:
            why.append(f"internal coverage {r['internalCoverage']:.4f} < {GATE['internal']}")
        if r.get("regionWordCoverage", 1) < 0.995:
            why.append(f"structured region coverage {r['regionWordCoverage']:.4f} < 0.995 (missing {r['regionMissingSample'][:8]})")
        if r["independentWordBagCoverage"] < GATE["bag"]:
            why.append(f"independent word coverage {r['independentWordBagCoverage']:.4f} < {GATE['bag']}")
        if r["unexpectedGlyphs"]:
            why.append(f"undecoded glyphs {r['unexpectedGlyphs']}")
        if r["readings"] < 2 and not CONFIG[r["id"]].get("front_only"):
            why.append("fewer than 2 readings: chapter split failed")
        r["status"] = "FAIL" if why else "pass"
        r["failures"] = why
        if why:
            failed.append((r["id"], why))
    rp.write_text(json.dumps({"generatedBy": "scripts/extract-web-books.py", "gates": GATE, "books": reports}, ensure_ascii=False, indent=1) + "\n")
    write_markdown(reports)
    for bid, why in failed:
        print(f"FAIL {bid}: {'; '.join(why)}", file=sys.stderr)
    return 1 if failed else 0


GATE = {"internal": 0.998, "bag": 0.975}


def write_markdown(reports: list[dict]) -> None:
    L = ["# Web-book extraction report", "",
         "Generated by `scripts/extract-web-books.py` from the current PDFs in `public/books/` (PDFs are read-only).",
         "", "## Fidelity gates", "",
         f"- **Internal coverage** >= {GATE['internal']}: share of 24-character chunks of the kept PDF text (after removing only page furniture and blank answer lines, with the same glyph repairs applied) found in the web edition.",
         f"- **Independent word coverage** >= {GATE['bag']}: share of words from an independent poppler `pdftotext` pass found in the web edition (order-independent; letters f/i/l/t/h ignored because poppler drops ligature glyphs in several of these PDFs).",
         "- **Independent chunk coverage** (reported, not gated): the same in reading order; pull-quotes and sidebars that poppler interleaves lower this number without any loss.",
         "- No undecoded private-use or replacement glyphs may remain. A book that fails any gate makes the script exit non-zero.",
         "", "## Per-book summary", "",
         "| Book | PDF pages | Readings | Figures | Words | Internal | Indep. words | Indep. chunks | Status |",
         "|---|---:|---:|---:|---:|---:|---:|---:|---|"]
    for r in reports:
        L.append(f"| {r['id']} | {r['sourcePages']} | {r['readings']} | {r['figures']} | {r['words']} | {r['internalCoverage']:.4f} | {r['independentWordBagCoverage']:.4f} | {r['independentCoverage']:.4f} | {r.get('status')} |")
    L += ["", "## Details", ""]
    for r in reports:
        L += [f"### {r['id']}", "",
              f"- Chapter heading sizes: {r['chapterHeadingSizes']} pt (body {r['bodyFontSize']} pt); two-column pages: {r['twoColumnPages']}",
              f"- Printed contents pages replaced by web contents: {r['printedContentsPages'] or 'none'}",
              f"- Decoded shift-encoded fonts: {', '.join(r['decodedShiftFonts']) or 'none'}",
              f"- Repairs: " + (", ".join(f"{k} x{v}" for k, v in list(r['repairs'].items())[:12]) or "none") + (f" (+{len(r['repairs']) - 12} more ligature forms)" if len(r['repairs']) > 12 else ""),
              f"- Removed: " + (", ".join(f"{k} x{v}" for k, v in r['removed'].items()) or "nothing"),
              f"- Tokens flagged for review (mostly proper names / CamelCase brands): {', '.join(r['suspiciousTokens'][:15]) or 'none'}",
              f"- Readings: " + "; ".join(f"{(c['label'] + ' ') if c['label'] else ''}{c['title']} (p.{c['pdfPage']})" for c in r['chapters']),
              ""]
        if r.get("failures"):
            L.append(f"- **FAILED:** {'; '.join(r['failures'])}")
            L.append("")
    L += ["## Known limitations", "",
          "- Pull-quotes printed in margins are kept where they appear in the text flow (they repeat a sentence from the body).",
          "- Teaching images have manually reviewed descriptions; decorative images use empty alt. Image-only tables retain images with transcribed alt text.",
          "- The cover page (PDF page 1) is represented by the book's cover image, not re-extracted.",
          "- Decorative images repeated on more than 3 pages, tiny ornaments and full-page backgrounds behind text are dropped (counted above).",
          "- Meaning-bearing tables use semantic rows and headers. Workbook blanks and checklists are preserved visually, not as saved form fields.",
          "- Layout-inferred paragraph/quotation boundaries and occasional print page numerals may still need editorial review.",
          "- has-science-discovered-god and who-is-the-real-jesus ship fonts whose fi/ti glyphs decode as digits; these are repaired against a corpus lexicon and any unrepaired forms are listed above.",
          ""]
    REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
    REPORT_MD.write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
