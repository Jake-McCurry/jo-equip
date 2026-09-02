import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / ".agents/outputs/adventure-layout-review/test_p12.pdf")
doc[0].get_pixmap(matrix=fitz.Matrix(2,2)).save(ROOT / ".agents/outputs/adventure-layout-review/test_p12.png")
print("Rendered.")
