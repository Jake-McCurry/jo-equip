from PIL import Image
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

for name in ["steps", "breathing", "word", "prayer", "journey", "ambassadors"]:
    img = Image.open(ROOT / f"attached_assets/Page_17-_Yield–Confess–Trust_1788387066808.png" if name=="steps" else 
                     ROOT / f"attached_assets/Page_18-_Spiritual_breathing__1788387066808.png" if name=="breathing" else
                     ROOT / f"attached_assets/Pages_24–26-_Five_ways_to_receive_God’s_Word__1788387066809.png" if name=="word" else
                     ROOT / f"attached_assets/Page_30-_A_daily_rhythm_of_prayer__1788387066808.png" if name=="prayer" else
                     ROOT / f"attached_assets/page_5_8_milestones_1788387066808.png" if name=="journey" else
                     ROOT / f"attached_assets/Page_39-_Ambassadors_for_Christ_1788387066809.png")
    
    # Check top-left pixel
    pix = img.convert("RGB").getpixel((0,0))
    print(f"{name} bg: {pix}")
