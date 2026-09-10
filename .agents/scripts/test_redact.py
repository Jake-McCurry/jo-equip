import pymupdf as fitz
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
doc = fitz.open(SOURCE)

# We want to create a page 12 that has top part and shifted bottom part, without duplicate text.
# Strategy: 
# 1. Create top page: copy source page 12, redact bottom part.
# 2. Create bottom page: copy source page 12, redact top part.
# 3. Create a blank page.
# 4. show_pdf_page the redacted top page and bottom page onto the blank page.
# Will the text be duplicated? Let's check!

doc2 = fitz.open()
doc2.insert_pdf(doc, from_page=11, to_page=11)
doc2.insert_pdf(doc, from_page=11, to_page=11)
p_top = doc2[0]
p_bot = doc2[1]

p_top.add_redact_annot(fitz.Rect(0, 190, 612, 792))
p_top.apply_redactions()

p_bot.add_redact_annot(fitz.Rect(0, 0, 612, 190))
p_bot.apply_redactions()

out = fitz.open()
new_page = out.new_page(width=612, height=792)

# clip top
new_page.show_pdf_page(fitz.Rect(0,0,612,190), doc2, 0, clip=fitz.Rect(0,0,612,190))
# clip bottom, shifted
dest_bot = fitz.Rect(0, 190, 612, 792) + (0, 390, 0, 390)
new_page.show_pdf_page(dest_bot, doc2, 1, clip=fitz.Rect(0, 190, 612, 792))

test_pdf = ROOT / ".agents/outputs/adventure-layout-review/test_redact.pdf"
out.save(test_pdf)

subprocess.run(["pdftotext", "-layout", str(test_pdf), str(ROOT / ".agents/outputs/adventure-layout-review/test_redact.txt")])
with open(ROOT / ".agents/outputs/adventure-layout-review/test_redact.txt") as f:
    print(f.read())
