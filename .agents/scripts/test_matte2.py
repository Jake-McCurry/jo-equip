from PIL import Image
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

img = Image.open(ROOT / ".agents/outputs/adventure-layout-review/journey_test.png")
red = Image.new("RGBA", img.size, (255, 0, 0, 255))
red.paste(img, (0,0), img)
red.save(ROOT / ".agents/outputs/adventure-layout-review/journey_red.png")
print("Done")
