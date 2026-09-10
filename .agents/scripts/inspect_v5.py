import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf")
pages = [5, 7, 11, 16, 17, 18, 23, 29, 35, 39, 42]
for pno in pages:
    page = doc[pno-1]
    print(f"\n--- PAGE {pno} ---")
    blocks = page.get_text("dict")["blocks"]
    for b in blocks:
        if b["type"] == 0:
            lines = []
            for l in b["lines"]:
                lines.append("".join([s["text"] for s in l["spans"]]))
            text = "\n".join(lines)
            print(f"BBOX: {b['bbox']} | TEXT:\n{text}\n")
