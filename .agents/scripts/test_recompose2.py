import pymupdf as fitz
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
doc = fitz.open(SOURCE)
out = fitz.open()

def recompose_page(output, source, source_pno, clips_and_shifts, image_path=None, img_rect=None):
    source_page = source[source_pno - 1]
    new_page = output.new_page(width=source_page.rect.width, height=source_page.rect.height)
    
    for clip_rect, shift_y in clips_and_shifts:
        src_rect = fitz.Rect(clip_rect)
        dest_rect = src_rect + (0, shift_y, 0, shift_y)
        new_page.show_pdf_page(dest_rect, source, source_pno - 1, clip=src_rect)
        
        for link in source_page.links():
            # simple center point check to see if link is in clip
            cx = (link["from"].x0 + link["from"].x1)/2
            cy = (link["from"].y0 + link["from"].y1)/2
            if src_rect.contains(fitz.Point(cx, cy)):
                new_link = link.copy()
                new_link["from"] = link["from"] + (0, shift_y, 0, shift_y)
                new_page.insert_link(new_link)
                
    if image_path:
        # just draw a red rect for testing
        new_page.draw_rect(fitz.Rect(img_rect), color=(1,0,0), fill=(1,0,0))
        
recompose_page(
    out, doc, 12, 
    clips_and_shifts=[
        ((0, 0, 612, 200), 0),
        ((0, 200, 612, 792), 390)
    ],
    image_path="test",
    img_rect=(63, 220, 549, 570)
)

out.save(ROOT / ".agents/outputs/adventure-layout-review/test_p12_v3.pdf")
print("Saved test_p12_v3.pdf")
