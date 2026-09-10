import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf")
page = doc[38]
print("Page 39 Text:")
for b in page.get_text("dict")["blocks"]:
    if b["type"] == 0:
        text = "".join([l["spans"][0]["text"] for l in b["lines"]]).strip()
        print(f"bbox {b['bbox']}: {text[:60]}")
