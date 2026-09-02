from PIL import Image
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]

files = ["steps", "breathing", "word", "prayer", "journey", "ambassadors", "symbols", "directed", "creation"]
for name in files:
    img = Image.open(ROOT / f"attached_assets/Page_17-_Yield–Confess–Trust_1788387066808.png" if name=="steps" else 
                     ROOT / f"attached_assets/Page_18-_Spiritual_breathing__1788387066808.png" if name=="breathing" else
                     ROOT / f"attached_assets/Pages_24–26-_Five_ways_to_receive_God’s_Word__1788387066809.png" if name=="word" else
                     ROOT / f"attached_assets/Page_30-_A_daily_rhythm_of_prayer__1788387066808.png" if name=="prayer" else
                     ROOT / f"attached_assets/page_5_8_milestones_1788387066808.png" if name=="journey" else
                     ROOT / f"attached_assets/Page_39-_Ambassadors_for_Christ_1788387066809.png" if name=="ambassadors" else
                     ROOT / f"attached_assets/8symbols2_1788387066807.png" if name=="symbols" else
                     ROOT / f"attached_assets/Page_16-_Self-directed_and_Christ-directed_lives_1788387066808.png" if name=="directed" else
                     ROOT / f"attached_assets/Page_12-_A_new_creation_1788387066808.png")
    
    print(f"{name}: mode={img.mode}, info={list(img.info.keys())}")
