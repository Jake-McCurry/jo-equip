from PIL import Image
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parents[2]

def remove_matte(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    
    # Top left pixel as bg
    bg_r, bg_g, bg_b = pixels[0,0][:3]
    
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            
            # Distance from background color
            dist = math.sqrt((r-bg_r)**2 + (g-bg_g)**2 + (b-bg_b)**2)
            
            # High threshold to remove the fringe. 
            # E.g. if dist < 15, fully transparent
            if dist < 15:
                pixels[x, y] = (r, g, b, 0)
            elif dist < 80:
                alpha = int((dist - 15) / 65 * 255)
                # Un-premultiply RGB (approximate)
                # If color is c = alpha*f + (1-alpha)*bg, then f = (c - bg)/alpha + bg
                fa = alpha / 255.0
                if fa > 0:
                    new_r = min(255, max(0, int((r - bg_r * (1 - fa)) / fa)))
                    new_g = min(255, max(0, int((g - bg_g * (1 - fa)) / fa)))
                    new_b = min(255, max(0, int((b - bg_b * (1 - fa)) / fa)))
                    pixels[x, y] = (new_r, new_g, new_b, alpha)
                else:
                    pixels[x, y] = (r, g, b, 0)
            else:
                pixels[x, y] = (r, g, b, 255)
                
    return rgba

img = Image.open(ROOT / "attached_assets/page_5_8_milestones_1788387066808.png")
res = remove_matte(img)
res.save(ROOT / ".agents/outputs/adventure-layout-review/journey_test.png")
print("Done")
