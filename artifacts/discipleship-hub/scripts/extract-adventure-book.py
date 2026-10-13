#!/usr/bin/env python3
"""
Reproducible extractor for the web-book prototype of
"The Adventure of Living with Jesus".

Source authority: public/books/adventure-of-living-with-jesus.pdf (read-only).
Outputs:
  src/data/adventure-book/adventure-book.json   structured semantic content
  public/books/adventure-of-living-with-jesus/read/img/*.webp   illustrations

Run from artifacts/discipleship-hub:
  python3 scripts/extract-adventure-book.py

The script classifies every text line on pages 2-34 by the PDF's own
typographic styles (size / weight / colour / indent) and fails loudly if a
line does not match a known style. It finishes with a word-level coverage
audit against the raw PDF text and prints the result.
"""
import html
import io
import json
import re
import sys
import unicodedata
from pathlib import Path

import pymupdf as fitz
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "public/books/adventure-of-living-with-jesus.pdf"
OUT_JSON = ROOT / "src/data/adventure-book/adventure-book.json"
IMG_DIR = ROOT / "public/books/adventure-of-living-with-jesus/read/img"
IMG_URL = "/books/adventure-of-living-with-jesus/read/img"

SLUGS = {
    "Begin the Adventure": "begin-the-adventure",
    "1. Citizen of Heaven": "citizen-of-heaven",
    "2. Your New Identity in Christ": "your-new-identity-in-christ",
    "3. The Holy Spirit — Your Constant Companion": "the-holy-spirit",
    "4. Walking by Faith, Not by Feelings": "walking-by-faith",
    "5. God’s Word — Your Road Map": "gods-word",
    "6. Prayer — Your Ongoing Conversation with God": "prayer",
    "7. Belonging to God’s Family": "belonging-to-gods-family",
    "8. Living a Life of Purpose": "living-a-life-of-purpose",
    "Continuing with Jesus": "continuing-with-jesus",
    "Additional Resources": "additional-resources",
}

# Alt text describes what each illustration shows, transcribing any words
# that are part of the artwork. Keyed by PDF image xref.
ALT = {
    50: "Illustrated winding path passing a garden gate, a butterfly, a flame, an open Bible, hands raised in prayer, a group of friends, a compass and a tree.",
    80: "Two circles compared. Self-Directed: self on the throne, with the cross outside and arrows scattered in every direction. Christ-Directed: Christ on the throne and self yielded, with arrows ordered around the centre.",
    84: "Three steps: 1. Choose to yield to God (Romans 12:2). 2. Confess your sins (1 John 1:9). 3. Trust God that He is in control (Romans 12:2).",
    85: "Spiritual breathing panel. Exhale: Confess your sins (1 John 1:9). Inhale: Ask the Holy Spirit to control you (Gal 5:16). Remember - Christ has freed you from the bondage of sin.",
    91: "The fruit of the Spirit in a framed panel: Love, Joy, Peace, Patience, Kindness, Goodness, Faithfulness, Gentleness, Self-control.",
    112: "Two taps labelled God's viewpoint and world's viewpoint pour into one basin labelled your mind, which flows out through a lower tap.",
    119: "There are five basic ways for you to get fed on God's Word: 1. Hear it taught. 2. Read it. 3. Study it. 4. Memorize key verses. 5. Meditation on its promises.",
    145: "A person with an open Bible at the centre of connected circles of people: family, coworkers, neighbours and a church small group.",
    294: "Five phone screens from the JO Discipleship App showing Facts for Faith, Time with God, Daily Inspiration, Books and Prayer sections.",
    297: "The JO EQUIP website banner reading: Reach people. Grow disciples. Multiply churches.",
}

PRINT_NAV = re.compile(r"^(CONTINUE THE ADVENTURE|Turn the page to continue\.|Next: .*)$")


def esc(s):
    return html.escape(s, quote=False)


def style_of(span):
    f = span["font"]
    return ("Bold" in f, "Italic" in f)


def line_text(line):
    return "".join(s["text"] for s in line["spans"])


def line_html(line, links):
    """Inline HTML for a line, merging spans with identical style."""
    parts = []
    for s in line["spans"]:
        if not s["text"]:
            continue
        b, i = style_of(s)
        cx = (s["bbox"][0] + s["bbox"][2]) / 2
        cy = (s["bbox"][1] + s["bbox"][3]) / 2
        uri = None
        for l in links:
            r = l["from"]
            if l.get("uri") and r.x0 - 1 <= cx <= r.x1 + 1 and r.y0 - 1 <= cy <= r.y1 + 1:
                uri = l["uri"]
        if s["text"].strip() == "":
            b = i = False
        key = (b, i, uri)
        if parts and parts[-1][0] == key:
            parts[-1][1].append(s["text"])
        else:
            parts.append((key, [s["text"]]))
    return parts


def join_parts(lines_parts):
    """Join lines of (key, texts) into a single inline HTML string."""
    flat = []
    for idx, parts in enumerate(lines_parts):
        for k, texts in parts:
            t = "".join(texts)
            if flat and flat[-1][0] == k:
                flat[-1][1] += t
            else:
                flat.append([k, t])
        if idx < len(lines_parts) - 1 and flat:
            last = flat[-1][1]
            if last.endswith((" ", "—", "–", "/", "-")):
                pass
            else:
                flat[-1][1] = last + " "
    out = []
    for (b, i, uri), t in flat:
        t = re.sub(r"\s+", " ", t)
        lead = t[: len(t) - len(t.lstrip())]
        trail = t[len(t.rstrip()):]
        core = esc(t.strip())
        if core:
            if i:
                core = f"<em>{core}</em>"
            if b:
                core = f"<strong>{core}</strong>"
            if uri:
                core = f'<a href="{html.escape(uri)}">{core}</a>'
        out.append(lead + core + trail)
    s = "".join(out)
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("</em> <em>", " ").replace("</strong> <strong>", " ")
    return s


def plain(h):
    return re.sub(r"<[^>]+>", "", h)


def classify(line, size, color, x, bold, italic, text):
    if "JesusOnline Ministries" in text and "Page" in text:
        return "footer"
    if set(text.strip()) <= set("_"):
        return "rule"
    if x >= 290 and x <= 300:
        return "card"
    if size >= 17:
        return "chapter"
    if 12.4 <= size <= 13.5 and bold and x < 60:
        return "h2"
    if color == 0xFFFFFF and bold and size == 11.0:
        return "thead"
    if x in (76, 370, 478) or (text.strip() == "☐"):
        return "tcell"
    if size < 8 and color in (0x2C5F7C,) and bold:
        return "printnav"
    if x == 63 and bold and abs(size - 10.1) < 0.2 and color == 0x1B4F72:
        return "printnav"
    if PRINT_NAV.match(text.strip()) and x in (63,):
        return "printnav"
    if italic and abs(size - 10.1) < 0.2 and color == 0x2C5F7C:
        return "caption"
    if x == 66 or (x == 63 and size < 8):
        return "card"
    if x == 54 and italic and color == 0x5A6570 and text.strip().startswith("Keep walking"):
        return "keepwalking"
    if x == 63 and abs(size - 10.6) < 0.2:
        return "question"
    if x == 64:
        return "callout"
    if x == 68:
        return "indent68"
    if x == 62 or text.lstrip().startswith("•"):
        return "bullet"
    if x in (52, 54):
        return "body"
    return None


def main():
    doc = fitz.open(PDF)
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    chapters = []
    front = {"blocks": []}
    cur = None
    unknown = []
    raw_words_pages = []
    response_lines = 0
    dropped_print_nav = []

    def target():
        return cur["blocks"] if cur else front["blocks"]

    for pno in range(1, doc.page_count):
        page = doc[pno]
        links = page.get_links()
        d = page.get_text("dict")
        items = []
        for b in d["blocks"]:
            if b["type"] == 1:
                continue
            for ln in b["lines"]:
                t = line_text(ln)
                if not t.strip():
                    continue
                items.append(("line", ln["bbox"][1], ln))
        for img in page.get_images(full=True):
            xref = img[0]
            bbox = page.get_image_bbox(img)
            items.append(("img", bbox.y0, (xref, img[1], bbox)))
        items.sort(key=lambda it: (round(it[1]), 0 if it[0] == "img" else 1, it[2]["bbox"][0] if it[0] == "line" else 0))

        # group into blocks
        para = None  # {kind, lines:[parts], lastY, size}

        def flush():
            nonlocal para
            if para is None:
                return
            k = para["kind"]
            h = join_parts(para["lines"])
            blk = target()
            if k == "body":
                blk.append({"t": "p", "html": h})
            elif k == "bodyquote":
                blk.append({"t": "quote", "kind": "excerpt", "html": h})
            elif k == "question":
                blk.append({"t": "question", "html": h})
            elif k == "bullet":
                item = re.sub(r"^•\s*", "", h)
                if blk and blk[-1]["t"] == "ul":
                    blk[-1]["items"].append(item)
                else:
                    blk.append({"t": "ul", "items": [item]})
            elif k == "scripture":
                if blk and blk[-1]["t"] == "panel" and para.get("adjacent"):
                    blk[-1]["blocks"].append({"t": "quote", "kind": "scripture", "html": h})
                else:
                    blk.append({"t": "quote", "kind": "scripture", "html": h})
            elif k == "panel":
                if blk and blk[-1]["t"] == "panel" and para.get("adjacent"):
                    blk[-1]["blocks"].append({"t": "p", "html": h})
                else:
                    blk.append({"t": "panel", "blocks": [{"t": "p", "html": h}]})
            elif k == "callout":
                c = blk[-1] if blk and blk[-1]["t"] == "callout" and para.get("adjacent") else None
                if c is None:
                    c = {"t": "callout", "kind": "note", "title": None, "blocks": []}
                    blk.append(c)
                if para.get("title"):
                    c["title"] = plain(h)
                    c["kind"] = para["title"]
                else:
                    c["blocks"].append({"t": "p", "html": h})
            elif k == "caption":
                # attach to most recent figure
                for prev in reversed(blk):
                    if prev["t"] == "figure":
                        prev["caption"] = plain(h)
                        break
                else:
                    raise SystemExit(f"Caption without figure on page {pno+1}: {h}")
            para = None

        prev_kind_end = None
        table = None
        card = None
        for kind, y, obj in items:
            if kind == "img":
                flush()
                xref, smask, bbox = obj
                if bbox.width >= 600:
                    continue  # full-page cover art (page 1 only)
                e = doc.extract_image(xref)
                im = Image.open(io.BytesIO(e["image"])).convert("RGB")
                if smask:
                    m = Image.open(io.BytesIO(doc.extract_image(smask)["image"])).convert("L")
                    im = im.convert("RGBA")
                    im.putalpha(m)
                if im.width > 1400:
                    im = im.resize((1400, round(im.height * 1400 / im.width)), Image.LANCZOS)
                name = f"p{pno+1:02d}-{xref}.webp"
                im.save(IMG_DIR / name, "WEBP", quality=82, method=6)
                href = None
                for l in links:
                    if l.get("uri") and l["from"].contains(fitz.Point((bbox.x0 + bbox.x1) / 2, (bbox.y0 + bbox.y1) / 2)):
                        href = l["uri"]
                if xref not in ALT:
                    raise SystemExit(f"Missing alt text for image xref {xref} on page {pno+1}")
                target().append({
                    "t": "figure", "src": f"{IMG_URL}/{name}", "alt": ALT[xref],
                    "width": im.width, "height": im.height, "pdfPage": pno + 1,
                    "wide": bbox.width > 380, **({"href": href} if href else {}),
                })
                prev_kind_end = None
                continue

            ln = obj
            t = line_text(ln)
            s0 = next(s for s in ln["spans"] if s["text"].strip())
            size = round(s0["size"], 1)
            color = s0["color"]
            x = round(ln["bbox"][0])
            bold, italic = style_of(s0)
            c = classify(ln, size, color, x, bold, italic, t)

            if pno == 1 and (size >= 12 or x == 63):
                c = "front"
            if c is None:
                unknown.append((pno + 1, x, size, hex(color), t))
                continue
            if c == "footer":
                continue
            if c == "rule":
                response_lines += 1
                continue

            # Front matter page (page 2): title/subtitle and contents list are
            # rendered from structured data on the intro / contents page.
            if pno == 1:
                if size >= 12 or t.strip() == "Contents" or re.match(r"^(\d\. |Begin the|Continuing with|Additional Res)", t.strip()):
                    continue
                if x == 63:
                    if bold:
                        flush()
                        front.setdefault("permission", {"title": t.strip(), "html": ""})
                        continue
                    para_kind = "permission"
                    front.setdefault("permLines", []).append(line_html(ln, links))
                    continue

            if c == "chapter":
                flush()
                title = t.strip()
                if title not in SLUGS:
                    raise SystemExit(f"Unexpected chapter title: {title!r}")
                m = re.match(r"^(\d)\.\s+(.*)$", title)
                cur = {
                    "slug": SLUGS[title], "title": m.group(2) if m else title,
                    "number": int(m.group(1)) if m else None, "pdfPage": pno + 1, "blocks": [],
                }
                chapters.append(cur)
                prev_kind_end = None
                continue
            if c == "h2":
                flush()
                target().append({"t": "h2", "text": t.strip()})
                prev_kind_end = None
                continue
            if c == "thead":
                flush()
                if table is None or table.get("closed"):
                    table = {"t": "table", "head": [], "rows": []}
                    target().append(table)
                table["head"].append(t.strip())
                continue
            if c == "tcell":
                if table is None:
                    raise SystemExit(f"Table cell without header p{pno+1}: {t}")
                yk = ln["bbox"][1]
                cell = (x, "checkbox" if t.strip() == "☐" else t.strip())
                row = next((r for r in table.setdefault("_rows", []) if abs(r[0] - yk) < 4), None)
                if row is None:
                    table["_rows"].append([yk, [cell]])
                else:
                    row[1].append(cell)
                table["rows"] = [[c[1] for c in sorted(r[1])] for r in table["_rows"]]
                continue
            if table is not None:
                table["closed"] = True
            if c == "printnav":
                flush()
                dropped_print_nav.append(t.strip())
                continue
            if c == "keepwalking":
                flush()
                target().append({"t": "continue", "note": t.strip()})
                continue
            if c == "card":
                flush()
                st = t.strip()
                if st.startswith("GO DEEPER") or st.startswith("GO FURTHER"):
                    card = {"t": "deeper", "label": "Go Further" if st.startswith("GO FURTHER") else "Go Deeper", "optional": "optional" in st, "title": "", "desc": [], "url": ""}
                    target().append(card)
                elif st.startswith("https://") or (card and card["url"] and not card["url"].endswith("/") is False and s0["font"] == "Helvetica"):
                    card["url"] += st
                elif s0["font"] == "Helvetica":
                    card["url"] += st
                elif bold and color == 0xFFFFFF:
                    card["title"] = (card["title"] + " " + st).strip()
                else:
                    card["desc"].append(st)
                continue

            # paragraph-type lines
            kind_map = {
                "body": "bodyquote" if italic and color == 0x2C2C2C and plain(t).strip().startswith("“") or (italic and para and para["kind"] == "bodyquote" and color == 0x2C2C2C) else "body",
                "question": "question",
                "bullet": "bullet",
                "indent68": "scripture" if italic else ("scripture" if para and para["kind"] == "scripture" and bold else "panel"),
                "callout": "callout",
                "caption": "caption",
            }
            k = kind_map[c]
            parts = line_html(ln, links)
            top = ln["bbox"][1]
            gap_limit = size * 1.75
            starts_new = (
                para is None or para["kind"] != k or (top - para["lastY"]) > gap_limit
                or (k == "bullet" and t.lstrip().startswith("•"))
                or (k == "question" and (t.lstrip().startswith("Q:") or t.lstrip().startswith("Your thoughts")))
                or (k == "callout" and bold and color == 0x1B4F72 or (k == "callout" and color == 0xC45C26))
                or (k == "callout" and para and para.get("title"))
            )
            if starts_new:
                adjacent = para is not None or (prev_kind_end is not None)
                prev_k = para["kind"] if para else prev_kind_end
                flush()
                para = {"kind": k, "lines": [parts], "lastY": top}
                para["adjacent"] = prev_k in ("panel", "scripture", "callout") and k in ("panel", "scripture", "callout")
                if k == "callout" and bold:
                    para["title"] = "info" if color == 0xC45C26 else "story"
            else:
                para["lines"].append(parts)
                para["lastY"] = top
            prev_kind_end = k
        flush()
        prev_kind_end = None

    if unknown:
        for u in unknown:
            print("UNCLASSIFIED", u, file=sys.stderr)
        raise SystemExit("Unclassified lines found; extend classify().")

    # Permission notice on page 2
    if "permLines" in front:
        front["permission"]["html"] = join_parts(front.pop("permLines"))

    # Front matter copyright paragraphs (everything collected into front blocks)
    for ch in chapters:
        # strip the internal "closed" flag on tables
        for b in ch["blocks"]:
            b.pop("closed", None); b.pop("_rows", None)
            if b["t"] == "deeper":
                b["desc"] = " ".join(b["desc"])

    data = {
        "source": "public/books/adventure-of-living-with-jesus.pdf",
        "sourcePages": doc.page_count,
        "title": "The Adventure of Living with Jesus",
        "subtitle": "A Guide to Discovering Your New Life",
        "frontMatter": front,
        "chapters": chapters,
        "audit": {},
    }

    # ---------- coverage audit ----------
    def words(s):
        s = unicodedata.normalize("NFKC", s)
        s = s.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
        return re.findall(r"[A-Za-z0-9']+", s.lower())

    src_words = []
    for pno in range(1, doc.page_count):
        for ln in doc[pno].get_text("text").splitlines():
            st = ln.strip()
            if not st or set(st) <= set("_") or ("JesusOnline Ministries" in st and "Page" in st):
                continue
            src_words += words(st)

    def collect(o, acc):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in ("src", "width", "height", "pdfPage", "wide", "slug", "t", "kind", "alt", "audit", "source", "sourcePages", "optional"):
                    continue
                collect(v, acc)
        elif isinstance(o, list):
            for v in o:
                collect(v, acc)
        elif isinstance(o, str):
            acc.append(plain(html.unescape(o)))
        elif isinstance(o, int) and o is not None:
            pass

    acc = []
    collect(data, acc)
    for ch in chapters:
        if ch["number"]:
            acc.append(f"{ch['number']}.")
    # Contents list on page 2 is represented by the chapter titles themselves.
    out_words = words(" ".join(acc))
    for ch in chapters:
        out_words += words(ch["title"]) + ([str(ch["number"])] if ch["number"] else [])
    out_words += words("Contents")
    for nav in dropped_print_nav:
        out_words += words(nav)  # intentionally replaced by web navigation
    from collections import Counter
    sc, oc = Counter(src_words), Counter(out_words)
    missing = sc - oc
    data["audit"] = {
        "sourceWords": sum(sc.values()),
        "missingWordTokens": sum(missing.values()),
        "missing": dict(missing.most_common(40)),
        "responseLinesOmitted": response_lines,
        "printNavigationReplaced": dropped_print_nav,
        "figures": sum(1 for ch in chapters for b in ch["blocks"] if b["t"] == "figure"),
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps({k: v for k, v in data["audit"].items() if k != "printNavigationReplaced"}, ensure_ascii=False, indent=1))
    print("chapters:", [(c["slug"], c["pdfPage"], len(c["blocks"])) for c in chapters])
    print("print-nav lines replaced:", len(dropped_print_nav))


if __name__ == "__main__":
    main()
