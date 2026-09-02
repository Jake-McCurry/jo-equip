import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PDF = ROOT / ".agents/outputs/adventure-visual-proof-v4.pdf"
REVIEW_DIR = ROOT / ".agents/outputs/adventure-layout-review"

pages = [5, 6, 7, 8, 11, 13, 14, 17, 18, 19, 20, 23, 27, 28, 29, 32, 33, 37, 38, 42, 45]

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

sheet.save(REVIEW_DIR / "v4-contact-sheet.jpg", quality=85)
print("Created contact sheet v4.")
