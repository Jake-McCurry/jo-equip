import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open()
page = doc.new_page(width=612, height=792)
text = "In the original Greek language, the word “believe” means to trust in, cling to, and rely upon. In other words, “believe” in the original Greek language is an active faith—much like the faith rock climbers have in the rope to hold them secure. Becoming a Christian means placing that kind of trust in Jesus: relying fully on His death for your sins and His resurrection for your eternal life."
rc = page.insert_textbox(fitz.Rect(63, 237, 340, 400), text, fontname="tiro", fontsize=12, color=(0,0,0), align=fitz.TEXT_ALIGN_LEFT)
print("Return code:", rc)
doc.save(ROOT / ".agents/outputs/adventure-layout-review/test_wrap.pdf")
