import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf")
for i in range(doc.page_count):
    page = doc[i]
    for b in page.get_text("dict")["blocks"]:
        if b["type"] == 0:
            text = "".join([l["spans"][0]["text"] for l in b["lines"]]).strip()
            if "Five Ways" in text or "God's Word -" in text:
                print(f"Page {i+1}: {text[:60]}")
