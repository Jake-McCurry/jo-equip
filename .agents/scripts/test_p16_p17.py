import pymupdf as fitz
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
doc = fitz.open(SOURCE)
out = fitz.open()

def replace_diagram(out, doc, pno, redact_rect, image_rect, label_func=None):
    temp = fitz.open()
    temp.insert_pdf(doc, from_page=pno-1, to_page=pno-1)
    page = temp[0]
    page.add_redact_annot(fitz.Rect(redact_rect))
    page.apply_redactions()
    
    # Just draw rect for now
    page.draw_rect(fitz.Rect(image_rect), color=(1,0,0), fill=(1,0,0))
    if label_func:
        label_func(page)
        
    out.insert_pdf(temp, from_page=0, to_page=0)

def l16(page):
    # Need large enough labels. Text box height should be at least 20.
    page.insert_textbox(fitz.Rect(105, 370, 300, 395), "Self-Directed", fontsize=11, fontname="helv", color=(0,0,0), align=fitz.TEXT_ALIGN_CENTER)
    page.insert_textbox(fitz.Rect(312, 370, 507, 395), "Christ-Directed", fontsize=11, fontname="helv", color=(0,0,0), align=fitz.TEXT_ALIGN_CENTER)
replace_diagram(out, doc, 16, (0, 215, 612, 405), (90, 225, 522, 365), l16)

def l17(page):
    page.insert_textbox(fitz.Rect(99, 730, 231, 770), "Yield yourself\nto God", fontsize=9, fontname="helv", color=(0,0,0), align=fitz.TEXT_ALIGN_CENTER)
    page.insert_textbox(fitz.Rect(240, 730, 372, 770), "Confess your\nsins", fontsize=9, fontname="helv", color=(0,0,0), align=fitz.TEXT_ALIGN_CENTER)
    page.insert_textbox(fitz.Rect(381, 730, 513, 770), "Trust God to be\nin control", fontsize=9, fontname="helv", color=(0,0,0), align=fitz.TEXT_ALIGN_CENTER)
replace_diagram(out, doc, 17, (0, 540, 612, 792), (95, 550, 517, 720), l17)

test_pdf = ROOT / ".agents/outputs/adventure-layout-review/test_p16_p17.pdf"
out.save(test_pdf)
subprocess.run(["pdftotext", "-layout", str(test_pdf), str(ROOT / ".agents/outputs/adventure-layout-review/test_p16_p17.txt")])
with open(ROOT / ".agents/outputs/adventure-layout-review/test_p16_p17.txt") as f:
    print(f.read())
