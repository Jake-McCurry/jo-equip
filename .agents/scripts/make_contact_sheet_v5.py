import pymupdf as fitz
from PIL import Image, ImageDraw
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[2]
OUTPUT_PDF = ROOT / ".agents/outputs/adventure-visual-proof-v5.pdf"
REVIEW_DIR = ROOT / ".agents/outputs/adventure-layout-review"

# (output_page_index_0_based, clip_rect, label)
crops = [
    (4, (40, 250, 570, 680), "Page 5: Journey map after list"),
    (6, (40, 150, 570, 480), "Page 7: Climber beside wrapped text"),
    (10, (40, 40, 570, 250), "Page 11: Butterfly beside wrapped text"),
    (15, (40, 120, 570, 440), "Page 16: Two-lives replacing diagram"),
    (16, (40, 400, 570, 760), "Page 17: Yield/Confess/Trust at end"),
    (17, (40, 120, 570, 480), "Page 18: Spiritual breathing before Go Deeper"),
    (23, (40, 40, 570, 500), "Page 24: Five Ways infographic at opening"),
    (29, (40, 360, 570, 650), "Page 30: Prayer rhythm accent"),
    (35, (40, 220, 570, 680), "Page 36: Family photo before response"),
    (39, (40, 480, 570, 760), "Page 40: Ambassadors beside wrapped text"),
    (42, (40, 400, 570, 780), "Page 43: Closing landscape")
]

doc = fitz.open(OUTPUT_PDF)
images = []
for pno, rect, label in crops:
    page = doc[pno]
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=fitz.Rect(rect))
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    
    padded = Image.new("RGB", (img.width + 40, img.height + 60), (240, 240, 235))
    padded.paste(img, (20, 40))
    
    draw = ImageDraw.Draw(padded)
    draw.text((20, 10), label, fill=(50, 50, 50))
    
    images.append(padded)

# Arrange in 2 columns
cols = 2
rows = math.ceil(len(images) / cols)
w, h = max(img.width for img in images), max(img.height for img in images)
sheet = Image.new("RGB", (cols * w, rows * h), (240, 240, 235))

for i, img in enumerate(images):
    r, c = divmod(i, cols)
    # Center image in cell
    cx = c * w + (w - img.width) // 2
    cy = r * h + (h - img.height) // 2
    sheet.paste(img, (cx, cy))

sheet.save(REVIEW_DIR / "v5-contact-sheet.jpg", quality=85)
print("Created contact sheet v5.")
