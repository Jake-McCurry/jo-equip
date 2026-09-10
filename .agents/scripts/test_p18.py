import pymupdf as fitz
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
doc = fitz.open(SOURCE)
out = fitz.open()

def recompose_page(output, source, source_pno, clips_and_shifts, image_path=None, img_rect=None, labels_func=None):
    source_page = source[source_pno - 1]
    new_page = output.new_page(width=source_page.rect.width, height=source_page.rect.height)
    
    for clip_rect, shift_y in clips_and_shifts:
        src_rect = fitz.Rect(clip_rect)
        temp_doc = fitz.open()
        temp_doc.insert_pdf(source, from_page=source_pno-1, to_page=source_pno-1)
        tpage = temp_doc[0]
        
        if src_rect.y0 > 0:
            tpage.add_redact_annot(fitz.Rect(0, 0, 612, src_rect.y0))
        if src_rect.y1 < 792:
            tpage.add_redact_annot(fitz.Rect(0, src_rect.y1, 612, 792))
        tpage.apply_redactions()
        
        dest_rect = src_rect + (0, shift_y, 0, shift_y)
        new_page.show_pdf_page(dest_rect, temp_doc, 0, clip=src_rect)
        
        for link in source_page.links():
            cx = (link["from"].x0 + link["from"].x1)/2
            cy = (link["from"].y0 + link["from"].y1)/2
            if src_rect.contains(fitz.Point(cx, cy)):
                new_link = link.copy()
                new_link["from"] = link["from"] + (0, shift_y, 0, shift_y)
                new_page.insert_link(new_link)
                
    if image_path:
        new_page.draw_rect(fitz.Rect(img_rect), color=(1,0,0), fill=(1,0,0))
        
    if labels_func:
        labels_func(new_page)

def add_labels_18(p):
    p.insert_textbox(fitz.Rect(87, 560, 278, 592), "Exhale: Confess", fontsize=12, fontname="helv", color=(0,0,0), align=fitz.TEXT_ALIGN_CENTER)
    p.insert_textbox(fitz.Rect(334, 560, 525, 592), "Inhale: Trust", fontsize=12, fontname="helv", color=(0,0,0), align=fitz.TEXT_ALIGN_CENTER)
    
recompose_page(
    out, doc, 18, 
    clips_and_shifts=[
        ((0, 0, 612, 235), 0),
        ((0, 235, 612, 792), 370)
    ],
    image_path="test",
    img_rect=(72, 250, 540, 540),
    labels_func=add_labels_18
)

test_pdf = ROOT / ".agents/outputs/adventure-layout-review/test_p18.pdf"
out.save(test_pdf)
subprocess.run(["pdftotext", "-layout", str(test_pdf), str(ROOT / ".agents/outputs/adventure-layout-review/test_p18.txt")])
with open(ROOT / ".agents/outputs/adventure-layout-review/test_p18.txt") as f:
    print(f.read())
