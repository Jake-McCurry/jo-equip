import pymupdf as fitz
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
OUTPUT_DIR = ROOT / ".agents/outputs/adventure-layout-review/pages"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

doc = fitz.open(SOURCE)
pages_to_inspect = [5, 7, 12, 16, 17, 18, 24, 25, 26, 30, 35, 39, 42]

for pno in range(1, doc.page_count + 1):
    page = doc[pno - 1]
    # Render page
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    pix.save(OUTPUT_DIR / f"page_{pno}.png")
    
    # Extract blocks
    blocks = page.get_text("dict")["blocks"]
    text_blocks = []
    for b in blocks:
        if b["type"] == 0:
            text = "".join([l["spans"][0]["text"] for l in b["lines"]]).strip()
            if text:
                text_blocks.append({"bbox": b["bbox"], "text": text[:50]})
    
    if pno in pages_to_inspect:
        print(f"Page {pno}:")
        for b in text_blocks:
            if "Go Deeper" in b["text"] or "Faith versus" in b["text"] or "Five Ways" in b["text"]:
                print(f"  {b['bbox']} - {b['text']}")

