import pymupdf as fitz
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
OUTPUT_DIR = ROOT / ".agents/outputs/adventure-layout-review/pages"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

doc = fitz.open(SOURCE)
pages_to_inspect = [5, 7, 12, 16, 17, 18, 24, 25, 26, 30, 35, 39, 42]

for pno in pages_to_inspect:
    page = doc[pno - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
    pix.save(OUTPUT_DIR / f"page_{pno}.png")

print("Rendered specific pages.")
