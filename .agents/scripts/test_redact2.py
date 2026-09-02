import pymupdf as fitz
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
doc = fitz.open(SOURCE)

temp = fitz.open()
temp.insert_pdf(doc, from_page=34, to_page=34) # Page 35
tpage = temp[0]

# Redact top and bottom
tpage.add_redact_annot(fitz.Rect(0, 0, 612, 480))
tpage.add_redact_annot(fitz.Rect(0, 480, 612, 792))
# Actually we want to KEEP the top (0, 0, 612, 480). 
# So let's just redact bottom.
temp2 = fitz.open()
temp2.insert_pdf(doc, from_page=34, to_page=34)
tpage2 = temp2[0]
tpage2.add_redact_annot(fitz.Rect(0, 480, 612, 792))
tpage2.apply_redactions()

out = fitz.open()
new_page = out.new_page(width=612, height=792)
new_page.show_pdf_page(fitz.Rect(0,0,612,480), temp2, 0, clip=fitz.Rect(0,0,612,480))
out.save(ROOT / ".agents/outputs/adventure-layout-review/test_redact2.pdf")
print("Saved")
