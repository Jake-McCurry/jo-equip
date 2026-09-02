import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PDF = ROOT / ".agents/outputs/adventure-visual-proof-v2.pdf"
REVIEW_DIR = ROOT / ".agents/outputs/adventure-layout-review"
REVIEW_DIR.mkdir(parents=True, exist_ok=True)

# The pages to include in the contact sheet (1-based indices in the NEW pdf)
# 5, 6(icon), 7, 10(icon), 12, 13(icon), 16, 17, 18, 19(icon), 22(icon), 
# 26(mod), 27(new), 28(icon), 31(prayer), 32(icon), 36(family), 37(icon), 40(ambassadors), 44(closing)
pages = [5, 6, 7, 10, 12, 13, 16, 17, 18, 19, 22, 26, 27, 28, 31, 32, 36, 37, 40, 44]

doc = fitz.open(OUTPUT_PDF)
images = []
for pno in pages:
    page = doc[pno - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(1, 1))
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    
    # Add border and label
    padded = Image.new("RGB", (img.width + 40, img.height + 60), (240, 240, 235))
    padded.paste(img, (20, 20))
    
    draw = ImageDraw.Draw(padded)
    label = f"Page {pno}"
    # Just draw text simply
    draw.text((20, img.height + 30), label, fill=(50, 50, 50))
    
    images.append(padded)

# Layout in grid
cols = 5
rows = math.ceil(len(images) / cols)
w, h = images[0].size
sheet = Image.new("RGB", (cols * w, rows * h), (240, 240, 235))

for i, img in enumerate(images):
    r, c = divmod(i, cols)
    sheet.paste(img, (c * w, r * h))

sheet.save(REVIEW_DIR / "v2-contact-sheet.jpg", quality=85)
print("Created contact sheet.")
