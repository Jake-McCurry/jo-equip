import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf")
for pno in [23, 24, 25]:
    page = doc[pno]
    print(f"--- PAGE {pno+1} ---")
    blocks = [b['bbox'] for b in page.get_text("dict")["blocks"] if b["type"]==0]
    drawings = [d["rect"] for d in page.get_drawings()]
    
    # Sort all vertical boundaries to find gaps > 20 points
    items = [(b[1], b[3], 'text') for b in blocks] + [(d.y0, d.y1, 'draw') for d in drawings]
    items.sort(key=lambda x: x[0])
    
    merged = []
    for y0, y1, type in items:
        if not merged:
            merged.append([y0, y1])
        else:
            if y0 <= merged[-1][1] + 5: # overlap or tiny gap
                merged[-1][1] = max(merged[-1][1], y1)
            else:
                merged.append([y0, y1])
                
    for i in range(len(merged)-1):
        gap = merged[i+1][0] - merged[i][1]
        if gap > 15:
            print(f"Safe cut between {merged[i][1]:.1f} and {merged[i+1][0]:.1f} (gap {gap:.1f})")
