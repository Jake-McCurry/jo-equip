import pymupdf as fitz
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
doc = fitz.open(SOURCE)
out = fitz.open()

# Recompose Page 12
page = out.new_page(width=612, height=792)

# Top part (0 to 200)
clip_top = fitz.Rect(0, 0, 612, 200)
page.show_pdf_page(clip_top, doc, 11, clip=clip_top)

# Image (220 to 550) - just draw a rect for testing
page.draw_rect(fitz.Rect(63, 220, 549, 550), color=(1,0,0), fill=(1,0,0))

# Bottom part (Go Deeper). Original is from 200 to 792.
# Shift down by 370 (from 200 to 570)
clip_bottom = fitz.Rect(0, 200, 612, 792)
# The destination rect must be the same size as clip_bottom but translated
dest_rect = clip_bottom + (0, 370, 0, 370)
page.show_pdf_page(dest_rect, doc, 11, clip=clip_bottom)

out.save(ROOT / ".agents/outputs/adventure-layout-review/test_p12.pdf")
print("Saved test_p12.pdf")
