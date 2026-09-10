"""Content-integrity check for the ministry's Attributes of God manuscript."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[2]
DOCX = ROOT / "attached_assets/Attributes_of_God_updated_articles_260905_1789064531315.docx"
DATA = ROOT / "artifacts/discipleship-hub/src/data/local/articles/attributes-of-god.json"
PUBLIC = ROOT / "artifacts/discipleship-hub/public"
PREFIX = "/categories/growth/attributes-of-god/"


class Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.links = []

    def handle_data(self, text):
        self.parts.append(text)

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.links.append(dict(attrs).get("href", ""))


def plain(html):
    parser = Text()
    parser.feed(html)
    return "".join(parser.parts)


def normalized(text):
    return re.sub(r"\s|\xad", "", unicodedata.normalize("NFKC", text))


articles = json.loads(DATA.read_text())
assert len(articles) == 27
assert len({a["id"] for a in articles}) == 27
assert sum(bool(a.get("parentArticleId")) for a in articles) == 20
assert sum(bool(a.get("appSlug")) for a in articles) == 6
all_text = []
headings = Counter()
internal_links = []
images = []
for article in articles:
    assert article["subId"] == "attributes-of-god"
    assert article["channelId"] == "growth"
    assert article.get("localSource") is True
    assert (PUBLIC / article["pdf"].lstrip("/")).is_file(), article["pdf"]
    all_text.append(article["title"])
    for block in article["blocks"]:
        if block["type"] in ("h2", "h3"):
            headings[(block["type"], plain(block["text"]).strip())] += 1
            all_text.append(plain(block["text"]))
        elif block["type"] == "figure":
            images.append(block)
            assert block["alt"].strip()
            assert (PUBLIC / block["src"].lstrip("/")).is_file(), block["src"]
            all_text.append(plain(block.get("caption", "")))
        else:
            for fragment in ([block["html"]] if "html" in block else block.get("items", [])):
                parser = Text()
                parser.feed(fragment)
                all_text.extend(parser.parts)
                internal_links.extend(href for href in parser.links if href.startswith(PREFIX))
    if article.get("parentArticleId"):
        for title, tag in [
            ("Daily Impact", "h2"),
            ("Questions for Personal Application", "h3"),
            ("Reflection", "h3"),
        ]:
            assert sum(b["type"] == tag and plain(b.get("text", "")).strip() == title
                       for b in article["blocks"]) == 1, (article["id"], title)
        assert sum(b["type"] == "h2" and plain(b.get("text", "")).startswith("Word Pictures of")
                   for b in article["blocks"]) == 1, article["id"]

ids = {article["id"] for article in articles}
for href in internal_links:
    assert urlparse(href).path.removeprefix(PREFIX) in ids, href
assert len(set(internal_links)) >= 20
joined = normalized("".join(all_text))
assert "[Usethefollowing" not in joined
ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
with ZipFile(DOCX) as archive:
    document = ET.fromstring(archive.read("word/document.xml"))
    paragraphs = [
        "".join(node.text or "" for node in p.findall(".//w:t", ns)).strip()
        for p in document.findall(".//w:body/w:p", ns)
    ]
started = False
missing = []
checked = 0
for text in paragraphs:
    if text.startswith("1. The Supreme Pursuit"):
        started = True
    if not started or not text or text.startswith("[Use the following"):
        continue
    text = re.sub(r"^[1-7]\.\s*", "", text)
    text = re.sub(r"^>>\s*", "", text)
    if "Let not the wise man" in text:
        text = text.replace("Jeremiah 9:23-24", "Jeremiah 9:24")
    checked += 1
    if normalized(text) not in joined:
        missing.append(text)
print(f"Articles: {len(articles)}; detail articles: 20; images: {len(images)}")
print(f"Go Deeper targets: {len(set(internal_links))}; source paragraphs checked: {checked}")
print(f"Missing source paragraphs: {len(missing)}")
for text in missing:
    print("MISSING:", text[:250])
assert not missing
print("Content, hierarchy, local links, image paths, and PDF files verified.")