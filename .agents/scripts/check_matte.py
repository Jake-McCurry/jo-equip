from PIL import Image
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
WORK = Path("/tmp/adventure-visual-proof-assets")

for name in ["journey.png", "directed.png", "ambassadors.png", "chapter-icon-1.png"]:
    img = Image.open(WORK / name)
    print(f"{name} has {img.mode}")
