import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf")

pages_to_check = [5, 7, 12, 16, 17, 18, 24, 25, 26, 30, 35, 39, 42]
for pno in pages_to_check:
    print(f"--- Page {pno} ---")
    page = doc[pno - 1]
    blocks = page.get_text("dict")["blocks"]
    if not blocks: continue
    
    # find first text block
    first = None
    for b in blocks:
        if b["type"] == 0:
            first = b
            break
    
    # find last text block (excluding Go Deeper)
    last = None
    go_deeper = None
    for b in blocks:
        if b["type"] == 0:
            text = "".join([l["spans"][0]["text"] for l in b["lines"]]).strip()
            if "Go Deeper" in text:
                go_deeper = b
                break
            last = b
            
    if last:
        print(f"Last normal text ends at y={last['bbox'][3]}")
    if go_deeper:
        print(f"Go Deeper starts at y={go_deeper['bbox'][1]}")
