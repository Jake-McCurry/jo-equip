import pymupdf as fitz
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"

doc = fitz.open(SOURCE)
pages_to_inspect = [5, 7, 12, 16, 17, 18, 24, 25, 26, 30, 35, 39, 42]

for pno in pages_to_inspect:
    page = doc[pno - 1]
    blocks = page.get_text("dict")["blocks"]
    go_deeper_y = -1
    for b in blocks:
        if b["type"] == 0:
            text = "".join([l["spans"][0]["text"] for l in b["lines"]]).strip()
            if "Go Deeper" in text:
                go_deeper_y = b["bbox"][1]
                print(f"Page {pno} 'Go Deeper' starts at {go_deeper_y}")
                break

