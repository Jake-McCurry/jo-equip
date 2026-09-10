from PIL import Image
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
img = Image.open(ROOT / "attached_assets/8symbols2_1788387066807.png").convert("RGB")
colors = set()
for y in range(50):
    for x in range(50):
        colors.add(img.getpixel((x,y)))
print(list(colors)[:10])
