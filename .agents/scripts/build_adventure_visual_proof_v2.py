from io import BytesIO
from pathlib import Path

from PIL import Image
import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
OUTPUT = ROOT / ".agents/outputs/adventure-visual-proof-v2.pdf"
WORK = Path("/tmp/adventure-visual-proof-assets")

NAVY = (0.035, 0.255, 0.373)
GOLD = (0.902, 0.596, 0.035)
WHITE = (1, 1, 1)

ASSETS = {
    "journey": ROOT / "attached_assets/page_5_8_milestones_1788387066808.png",
    "faith": ROOT / "attached_assets/Page_7-_Faith_versus_feelings_1788387066808.png",
    "creation": ROOT / "attached_assets/Page_12-_A_new_creation_1788387066808.png",
    "directed": ROOT / "attached_assets/Page_16-_Self-directed_and_Christ-directed_lives_1788387066808.png",
    "steps": ROOT / "attached_assets/Page_17-_Yield–Confess–Trust_1788387066808.png",
    "breathing": ROOT / "attached_assets/Page_18-_Spiritual_breathing__1788387066808.png",
    "word": ROOT / "attached_assets/Pages_24–26-_Five_ways_to_receive_God’s_Word__1788387066809.png",
    "prayer": ROOT / "attached_assets/Page_30-_A_daily_rhythm_of_prayer__1788387066808.png",
    "family": ROOT / "attached_assets/Page_35-_Belonging_to_God’s_family_1788387066809.png",
    "ambassadors": ROOT / "attached_assets/Page_39-_Ambassadors_for_Christ_1788387066809.png",
    "closing": ROOT / "attached_assets/Page_42-_Closing_visual_1788387066809.png",
    "symbols": ROOT / "attached_assets/8symbols2_1788387066807.png",
}

def remove_checker(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = pixels[x, y]
            if min(r, g, b) > 205 and max(r, g, b) - min(r, g, b) < 18:
                pixels[x, y] = (r, g, b, 0)
    return rgba

def save_png(image: Image.Image, name: str) -> Path:
    path = WORK / name
    image.save(path, "PNG")
    return path

def prepare_assets():
    WORK.mkdir(parents=True, exist_ok=True)
    prepared = {}
    for key, path in ASSETS.items():
        if key == "symbols":
            continue
        image = Image.open(path)
        # We should remove checkerboard for all icons/vectors. 
        # Photos like faith, family, closing shouldn't have checker removed if they don't have it.
        # But wait, some images are illustrations.
        # Let's only remove checker for non-photographic images if they have white/checker background.
        if key in {"directed", "ambassadors", "journey", "symbols"}:
            image = remove_checker(image)
            bbox = image.getbbox()
            if bbox:
                image = image.crop(bbox)
        elif image.mode == "RGBA" or "transparency" in image.info:
            image = image.convert("RGBA")
            bbox = image.getbbox()
            if bbox:
                image = image.crop(bbox)
        prepared[key] = save_png(image, f"{key}.png")

    sheet = Image.open(ASSETS["symbols"])
    icons = []
    cell_w, cell_h = sheet.width // 4, sheet.height // 2
    for row in range(2):
        for col in range(4):
            cell = sheet.crop(
                (col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h)
            )
            cell = remove_checker(cell)
            bbox = cell.getbbox()
            if bbox:
                pad = 8
                x0, y0, x1, y1 = bbox
                cell = cell.crop(
                    (
                        max(0, x0 - pad),
                        max(0, y0 - pad),
                        min(cell.width, x1 + pad),
                        min(cell.height, y1 + pad),
                    )
                )
            icons.append(save_png(cell, f"chapter-icon-{len(icons) + 1}.png"))
    return prepared, icons

def insert_contain(page, rect, image_path):
    page.insert_image(fitz.Rect(rect), filename=str(image_path), keep_proportion=True, overlay=True)

def label(page, rect, text, size=10):
    page.insert_textbox(
        fitz.Rect(rect),
        text,
        fontsize=size,
        fontname="helv",
        color=NAVY,
        align=fitz.TEXT_ALIGN_CENTER,
        overlay=True,
    )

def title_bar(page, title):
    page.draw_rect(fitz.Rect(63, 58, 549, 110), fill=NAVY, color=NAVY, overlay=True)
    fontsize = 15 if len(title) > 30 else 18
    width = fitz.get_text_length(title, fontname="helv", fontsize=fontsize)
    x = max(78, (612 - width) / 2)
    page.insert_text(
        fitz.Point(x, 91),
        title,
        fontsize=fontsize,
        fontname="helv",
        color=WHITE,
        overlay=True,
    )

def add_visual_page(output, title, image_path, portrait=False):
    page = output.new_page(width=612, height=792)
    title_bar(page, title)
    rect = fitz.Rect(63, 135, 549, 735)
    if not portrait:
        rect = fitz.Rect(63, 170, 549, 650)
    insert_contain(page, rect, image_path)

def recompose_shift_go_deeper(output, doc, source_pno, split_y, shift_amount, image_path, img_rect, labels_func=None):
    # This replaces the last page in `output` with a recomposed page
    # where the top part is kept, image is drawn, and bottom part is shifted.
    page = output[-1]
    # Blank out the whole page to redraw parts
    page.draw_rect(fitz.Rect(0, 0, 612, 792), fill=WHITE, color=WHITE, overlay=True)
    
    # 1. Show top part
    clip_top = fitz.Rect(0, 0, 612, split_y)
    page.show_pdf_page(clip_top, doc, source_pno - 1, clip=clip_top)
    
    # 2. Draw image
    insert_contain(page, img_rect, image_path)
    
    # 3. Optional labels
    if labels_func:
        labels_func(page)
        
    # 4. Show bottom part shifted down
    clip_bottom = fitz.Rect(0, split_y, 612, 792)
    dest_rect = clip_bottom + (0, shift_amount, 0, shift_amount)
    page.show_pdf_page(dest_rect, doc, source_pno - 1, clip=clip_bottom)

def main():
    prepared, icons = prepare_assets()
    source = fitz.open(SOURCE)
    output = fitz.open()

    chapter_icon_pages = {6: 0, 10: 1, 13: 2, 19: 3, 22: 4, 27: 5, 31: 6, 36: 7}

    for source_page_number in range(1, source.page_count + 1):
        output.insert_pdf(
            source,
            from_page=source_page_number - 1,
            to_page=source_page_number - 1,
            links=True,
            annots=True,
        )
        page = output[-1]

        if source_page_number in chapter_icon_pages:
            icon = icons[chapter_icon_pages[source_page_number]]
            insert_contain(page, (508, 87, 543, 122), icon)

        if source_page_number == 5:
            insert_contain(page, (45, 530, 567, 770), prepared["journey"])
            
        elif source_page_number == 7:
            # Fit as a half-page panel
            # 3:2 image. height = 250, width = 375
            w, h = 375, 250
            x0 = (612 - w) / 2
            y0 = 500
            insert_contain(page, (x0, y0, x0+w, y0+h), prepared["faith"])

        elif source_page_number == 12:
            recompose_shift_go_deeper(
                output, source, 12, 
                split_y=200, 
                shift_amount=390, 
                image_path=prepared["creation"], 
                img_rect=(63, 220, 549, 570)
            )

        elif source_page_number == 16:
            page.draw_rect(fitz.Rect(90, 220, 522, 400), fill=WHITE, color=WHITE, overlay=True)
            insert_contain(page, (90, 225, 522, 365), prepared["directed"])
            label(page, (105, 368, 300, 390), "Self-Directed", 11)
            label(page, (312, 368, 507, 390), "Christ-Directed", 11)

        elif source_page_number == 17:
            page.draw_rect(fitz.Rect(63, 548, 549, 770), fill=WHITE, color=WHITE, overlay=True)
            insert_contain(page, (95, 550, 517, 740), prepared["steps"])
            label(page, (99, 739, 231, 768), "Yield yourself\nto God", 8.5)
            label(page, (240, 739, 372, 768), "Confess your\nsins", 8.5)
            label(page, (381, 739, 513, 768), "Trust God to be\nin control", 8.5)

        elif source_page_number == 18:
            def add_labels_18(p):
                label(p, (87, 560, 278, 592), "Exhale: Confess", 12)
                label(p, (334, 560, 525, 592), "Inhale: Trust", 12)
                
            recompose_shift_go_deeper(
                output, source, 18, 
                split_y=235, 
                shift_amount=380, 
                image_path=prepared["breathing"], 
                img_rect=(72, 260, 540, 550),
                labels_func=add_labels_18
            )

        elif source_page_number == 26:
            # We must insert the visual BEFORE Go Deeper.
            # Page 26 ends text at 610. "Go Deeper" at 639.
            # Blank out the "Go Deeper" block on Page 26
            page.draw_rect(fitz.Rect(0, 630, 612, 792), fill=WHITE, color=WHITE, overlay=True)
            
            # Create a NEW page to house the visual and the moved "Go Deeper"
            new_page = output.new_page(width=612, height=792)
            # Add visual
            insert_contain(new_page, (100, 80, 512, 492), prepared["word"])
            
            # Now copy the Go Deeper from source Page 26 to new_page, shifted down or just placed
            clip_bottom = fitz.Rect(0, 630, 612, 792)
            # Shift it UP a bit to be closer to the visual, e.g. from 630 to 520
            dest_rect = clip_bottom + (0, -110, 0, -110)
            new_page.show_pdf_page(dest_rect, source, 25, clip=clip_bottom)

        elif source_page_number == 30:
            recompose_shift_go_deeper(
                output, source, 30, 
                split_y=500, 
                shift_amount=50, 
                image_path=prepared["prayer"], 
                img_rect=(100, 410, 512, 518)  # ~1.5 inch strip
            )

        elif source_page_number == 35:
            recompose_shift_go_deeper(
                output, source, 35, 
                split_y=490, 
                shift_amount=220, 
                image_path=prepared["family"], 
                img_rect=(63, 400, 549, 680)
            )

        elif source_page_number == 39:
            add_visual_page(output, "Ambassadors for Christ", prepared["ambassadors"], portrait=True)

        elif source_page_number == 42:
            insert_contain(page, (63, 520, 549, 775), prepared["closing"])

    metadata = source.metadata.copy()
    metadata.update(
        {
            "title": "The Adventure of Living with Jesus — Visual Proof",
            "author": "JesusOnline Ministries",
            "subject": "Proofreading copy with supplied visual plan; not for publication",
        }
    )
    output.set_metadata(metadata)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    output.save(OUTPUT, garbage=4, deflate=True)
    print("Saved output to", OUTPUT)

if __name__ == "__main__":
    main()
