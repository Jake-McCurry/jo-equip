import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / ".agents/outputs/adventure-layout-review/test_redact2.pdf")
print("Drawings:")
for d in doc[0].get_drawings():
    print(d["rect"])
