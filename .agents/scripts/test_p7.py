import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf")
out = fitz.open()
out.insert_pdf(doc, from_page=6, to_page=6)
page = out[0]
page.draw_rect(fitz.Rect(63, 510, 549, 750), color=(1,0,0))
out.save(ROOT / ".agents/outputs/adventure-layout-review/test_p7.pdf")
out[0].get_pixmap(matrix=fitz.Matrix(2,2)).save(ROOT / ".agents/outputs/adventure-layout-review/test_p7.png")
