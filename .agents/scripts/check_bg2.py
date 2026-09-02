from PIL import Image
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

for path in ROOT.glob("attached_assets/*.png"):
    img = Image.open(path)
    w, h = img.size
    p1 = img.convert("RGB").getpixel((w//2, 5))
    p2 = img.convert("RGB").getpixel((5, h//2))
    p3 = img.convert("RGB").getpixel((w-5, h//2))
    print(f"{path.name}: {p1}, {p2}, {p3}")
