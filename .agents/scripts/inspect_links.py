import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
doc = fitz.open(SOURCE)
pages = [12, 16, 17, 18, 26, 30, 35]
for pno in pages:
    page = doc[pno - 1]
    print(f"--- Page {pno} ---")
    for link in page.links():
        print(link)
