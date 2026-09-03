import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf")
for pno in [22, 23]:
    page = doc[pno-1]
    print(f"--- PAGE {pno} ---")
    for b in page.get_text("dict")["blocks"]:
        if b["type"] == 0:
            text = "".join([l["spans"][0]["text"] for l in b["lines"]]).strip()
            print(f"{b['bbox']}: {text[:60]}")
