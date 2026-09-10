import pymupdf as fitz
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
doc = fitz.open(SOURCE)

for pno in range(1, doc.page_count + 1):
    page = doc[pno - 1]
    blocks = page.get_text("dict")["blocks"]
    for b in blocks:
        if b["type"] == 0:
            text = "".join([l["spans"][0]["text"] for l in b["lines"]]).strip()
            if "Go Deeper" in text:
                print(f"Page {pno} 'Go Deeper' starts at {b['bbox'][1]}")
                break
