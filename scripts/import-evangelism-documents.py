"""Import the ministry's October 2026 evangelism documents without rewriting copy."""
import html
import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"


def paragraphs(filename):
    with ZipFile(ROOT / "attached_assets" / filename) as archive:
        rels = {r.attrib["Id"]: r.attrib["Target"] for r in ET.fromstring(
            archive.read("word/_rels/document.xml.rels"))}
        document = ET.fromstring(archive.read("word/document.xml"))

    def inline(node):
        if node.tag == W + "t":
            return html.escape(node.text or "")
        if node.tag == W + "br":
            return "<br>"
        if node.tag in (W + "pPr", W + "rPr"):
            return ""
        text = "".join(inline(child) for child in node)
        if node.tag == W + "hyperlink":
            target = rels.get(node.get(R + "id"), "")
            target = target.removeprefix("https://equip.jesusonline.com")
            if target == "":
                target = "/"
            return f'<a href="{html.escape(target, quote=True)}">{text}</a>'
        if node.tag == W + "r":
            props = node.find(W + "rPr")
            if props is not None:
                if props.find(W + "i") is not None:
                    text = f"<em>{text}</em>"
                if props.find(W + "b") is not None:
                    text = f"<strong>{text}</strong>"
        return text

    result = []
    for node in document.findall(".//" + W + "body/" + W + "p"):
        text = "".join(t.text or "" for t in node.iter(W + "t"))
        if text.strip():
            result.append((text.strip(), inline(node).strip(), node.find(W + "pPr/" + W + "numPr") is not None))
    return result


def blocks(rows, start):
    result = []
    active = False
    for text, markup, is_list in rows:
        heading = re.match(r"^<H([23])>\s*(.*)", text, re.I)
        if heading and heading[2].strip() == start:
            active = True
        if not active or text == "FAQ suggestions":
            continue
        if heading:
            result.append({"type": "h" + heading[1], "text": heading[2].strip()})
        else:
            markup = markup.replace("I Corinthians 151-6", "1 Corinthians 15:1–6")
            markup = markup.replace("Christ.Evangelism", "Christ. Evangelism")
            if is_list:
                if not result or result[-1]["type"] != "ul":
                    result.append({"type": "ul", "items": []})
                result[-1]["items"].append(markup)
            else:
                result.append({"type": "p", "html": markup})
    return result


def body_html(items):
    return "\n".join(
        f'<{b["type"]}>{html.escape(b["text"]) if "text" in b else "".join("<li>" + i + "</li>" for i in b["items"]) if "items" in b else b["html"]}</{b["type"]}>'
        for b in items
    )


landing = blocks(paragraphs("Evangelism_Tools_1791830758535.docx"), "What Are Evangelism Tools?")
article = blocks(paragraphs("What_is_Evangelism__1791830806525.docx"), "Definitions")
assert len([b for b in landing if b["type"] == "h2"]) == 6
assert len([b for b in article if b["type"] == "h2"]) == 8
data = ROOT / "artifacts/discipleship-hub/src/data"
(data / "evangelismToolsContent.json").write_text(json.dumps(landing, ensure_ascii=False, indent=2) + "\n")
path = data / "generated/articles/understanding-evangelism.json"
articles = json.loads(path.read_text())
target = next(a for a in articles if a["id"] == "what-is-evangelism")
target["blocks"] = article
path.write_text(json.dumps(articles, ensure_ascii=False, indent=2) + "\n")
local = ROOT / "scripts/data/local-articles/40101-what-is-evangelism.html"
local.parent.mkdir(parents=True, exist_ok=True)
local.write_text(body_html(article) + "\n")
print(f"Imported {len(landing)} landing blocks and {len(article)} article blocks.")
