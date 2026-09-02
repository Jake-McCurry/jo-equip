import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PDF = ROOT / ".agents/outputs/adventure-visual-proof-v3.pdf"
REVIEW_DIR = ROOT / ".agents/outputs/adventure-layout-review"

# 5(journey), 6(icon), 7(text), 8(visual faith), 10(icon), 12(butterfly), 
# 13(icon), 16(diagram), 17(diagram), 18(breathing), 19(icon), 22(icon),
# 26(text end), 27(visual word), 30(prayer strip), 35(family), 39(ambassadors visual)
pages = [5, 6, 7, 8, 11, 13, 14, 17, 18, 19, 20, 23, 27, 28, 31, 36, 40, 44]

doc = fitz.open(OUTPUT_PDF)
images = []
for pno in pages:
    page = doc[pno - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(1, 1))
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    
    padded = Image.new("RGB", (img.width + 40, img.height + 60), (240, 240, 235))
    padded.paste(img, (20, 20))
    
    draw = ImageDraw.Draw(padded)
    label = f"Page {pno}"
    draw.text((20, img.height + 30), label, fill=(50, 50, 50))
    
    images.append(padded)

cols = 5
rows = math.ceil(len(images) / cols)
w, h = images[0].size
sheet = Image.new("RGB", (cols * w, rows * h), (240, 240, 235))

for i, img in enumerate(images):
    r, c = divmod(i, cols)
    sheet.paste(img, (c * w, r * h))

sheet.save(REVIEW_DIR / "v3-contact-sheet.jpg", quality=85)
print("Created contact sheet v3.")
