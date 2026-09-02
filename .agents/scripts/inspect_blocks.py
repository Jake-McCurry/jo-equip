import pymupdf as fitz
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
doc = fitz.open(SOURCE)

def print_blocks(pno):
    page = doc[pno - 1]
    print(f"--- Page {pno} ---")
    for b in page.get_text("dict")["blocks"]:
        if b["type"] == 0:
            text = "".join([l["spans"][0]["text"] for l in b["lines"]]).strip()
            print(f"bbox {b['bbox']}: {text[:60]}")
        elif b["type"] == 1:
            print(f"bbox {b['bbox']}: [IMAGE]")

for p in [12, 18, 30, 35]:
    print_blocks(p)
