import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / ".agents/outputs/adventure-visual-proof-v4.pdf")
print("Total pages:", doc.page_count)
for i in range(doc.page_count):
    page = doc[i]
    text = "".join([b["lines"][0]["spans"][0]["text"] for b in page.get_text("dict")["blocks"] if b["type"]==0 and b["lines"]])
    print(f"Page {i+1}: {text[:40]}")
