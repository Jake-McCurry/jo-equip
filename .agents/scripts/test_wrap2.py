import pymupdf as fitz
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
doc = fitz.open(ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf")
page = doc[6] # Page 7
page.add_redact_annot(fitz.Rect(63, 237, 548.1, 305))
page.apply_redactions()

text = "In the original Greek language, the word “believe” means to trust in, cling to, and rely upon. In other words, “believe” in the original Greek language is an active faith—much like the faith rock climbers have in the rope to hold them secure. Becoming a Christian means placing that kind of trust in Jesus: relying fully on His death for your sins and His resurrection for your eternal life."

# Let's match the color. The original color is likely a very dark gray/blue.
# I'll use (0.2, 0.2, 0.2)
page.insert_textbox(
    fitz.Rect(63, 237, 340, 360),
    text,
    fontname="tiro", # Times-Roman
    fontsize=11.5,
    color=(0.15, 0.15, 0.15),
    align=fitz.TEXT_ALIGN_LEFT
)

page.draw_rect(fitz.Rect(350, 237, 540, 363), color=(1,0,0)) # placeholder for image
doc.save(ROOT / ".agents/outputs/adventure-layout-review/test_wrap2.pdf")
print("Done")
