"""Import the supplied Waiting on God manuscripts as persistent local articles."""
import html
import json
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
source = Path(sys.argv[1])
articles = []
for path in sorted(source.glob("*.docx"), key=lambda p: int(p.name.split()[0])):
    day = int(path.name.split()[0])
    with ZipFile(path) as archive:
        doc = ET.fromstring(archive.read("word/document.xml"))
        relpath = "word/_rels/document.xml.rels"
        rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(archive.read(relpath))} if relpath in archive.namelist() else {}

    def inline(node):
        if node.tag == W + "t":
            return html.escape(node.text or "")
        if node.tag == W + "br":
            return "<br>"
        if node.tag in (W + "pPr", W + "rPr"):
            return ""
        text = "".join(inline(c) for c in node)
        if node.tag == W + "hyperlink" and node.get(R + "id") in rels:
            text = f'<a href="{html.escape(rels[node.get(R + "id")], quote=True)}">{text}</a>'
        if node.tag == W + "r":
            props = node.find(W + "rPr")
            if props is not None:
                for prop, tag in [("i", "em"), ("b", "strong")]:
                    el = props.find(W + prop)
                    if el is not None and el.get(W + "val") not in ("0", "false"):
                        text = f"<{tag}>{text}</{tag}>"
        return text

    rows = []
    for p in doc.findall("./" + W + "body/" + W + "p"):
        text = "".join(t.text or "" for t in p.iter(W + "t")).strip()
        if text:
            rows.append((text, inline(p)))
    if day == 0:
        rows = rows[:next(i for i, row in enumerate(rows) if row[0] == "Day 1")]
        title = "A Three Part, With One Heart, Introduction"
        body = rows[2:]
        slug = "introduction"
    else:
        assert rows[0][0] == f"Day {day}"
        title = rows[1][0]
        body = rows[2:]
        slug = f"day-{day}-" + re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    blocks = [{"type": "p", "html": markup} for _, markup in body]
    articles.append({
        "id": slug, "subId": "waiting-on-god", "channelId": "growth",
        "title": title if day == 0 else f"Day {day}: {title}",
        "description": f'{"Introduction" if day == 0 else f"Day {day}"} of Waiting on God by Andrew Murray — A 31-Day Adventure into the Heart of God—4th Edition.',
        "localSource": True, "blocks": blocks,
    })
assert len(articles) == 32
dest = ROOT / "artifacts/discipleship-hub/src/data/local/articles/waiting-on-god.json"
dest.write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n")
print(f"Imported {len(articles)} articles with {sum(len(a['blocks']) for a in articles)} source paragraphs.")
