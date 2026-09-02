from io import BytesIO
from pathlib import Path
from PIL import Image
import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
OUTPUT = ROOT / ".agents/outputs/adventure-visual-proof-v4.pdf"
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

def add_visual_page(output, title, image_path, img_rect):
    page = output.new_page(width=612, height=792)
    title_bar(page, title)
    insert_contain(page, img_rect, image_path)

def recompose_page(output, source, source_pno, clips_and_shifts, image_path=None, img_rect=None, labels_func=None):
    source_page = source[source_pno - 1]
    new_page = output.new_page(width=source_page.rect.width, height=source_page.rect.height)
    
    for clip_rect, shift_y in clips_and_shifts:
        src_rect = fitz.Rect(clip_rect)
        
        temp_doc = fitz.open()
        temp_doc.insert_pdf(source, from_page=source_pno-1, to_page=source_pno-1)
        tpage = temp_doc[0]
        
        if src_rect.y0 > 0:
            tpage.add_redact_annot(fitz.Rect(0, 0, 612, src_rect.y0))
        if src_rect.y1 < 792:
            tpage.add_redact_annot(fitz.Rect(0, src_rect.y1, 612, 792))
        
        tpage.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
        
        dest_rect = src_rect + (0, shift_y, 0, shift_y)
        new_page.show_pdf_page(dest_rect, temp_doc, 0, clip=src_rect)
        
        for link in source_page.links():
            cx = (link["from"].x0 + link["from"].x1)/2
            cy = (link["from"].y0 + link["from"].y1)/2
            if src_rect.contains(fitz.Point(cx, cy)):
                new_link = link.copy()
                new_link["from"] = link["from"] + (0, shift_y, 0, shift_y)
                new_page.insert_link(new_link)
                
    if image_path:
        insert_contain(new_page, img_rect, image_path)
        
    if labels_func:
        labels_func(new_page)

def main():
    prepared, icons = prepare_assets()
    source = fitz.open(SOURCE)
    output = fitz.open()

    chapter_icon_pages = {6: 0, 10: 1, 13: 2, 19: 3, 22: 4, 27: 5, 31: 6, 36: 7}

    for source_page_number in range(1, source.page_count + 1):
        if source_page_number in {7, 12, 16, 17, 18, 26, 30, 35}:
            if source_page_number == 7:
                recompose_page(
                    output, source, 7, 
                    clips_and_shifts=[((0, 0, 612, 420), 0)],
                    image_path=prepared["faith"],
                    img_rect=(146, 440, 466, 653)
                )
                recompose_page(
                    output, source, 7,
                    clips_and_shifts=[((0, 420, 612, 792), -350)]
                )

            elif source_page_number == 12:
                recompose_page(
                    output, source, 12, 
                    clips_and_shifts=[
                        ((0, 0, 612, 190), 0),
                        ((0, 190, 612, 792), 240)
                    ],
                    image_path=prepared["creation"],
                    img_rect=(156, 210, 456, 410)
                )

            elif source_page_number == 16:
                def add_labels_16(p):
                    label(p, (160, 360, 290, 380), "Self-Directed", 11)
                    label(p, (322, 360, 452, 380), "Christ-Directed", 11)
                recompose_page(
                    output, source, 16, 
                    clips_and_shifts=[
                        ((0, 0, 612, 215), 0),
                        ((0, 400, 612, 792), 0)
                    ],
                    image_path=prepared["directed"],
                    img_rect=(156, 225, 456, 350),
                    labels_func=add_labels_16
                )

            elif source_page_number == 17:
                def add_labels_17(p):
                    label(p, (110, 720, 220, 760), "Yield yourself\nto God", 9)
                    label(p, (250, 720, 360, 760), "Confess your\nsins", 9)
                    label(p, (390, 720, 500, 760), "Trust God to be\nin control", 9)
                recompose_page(
                    output, source, 17, 
                    clips_and_shifts=[
                        ((0, 0, 612, 540), 0)
                    ],
                    image_path=prepared["steps"],
                    img_rect=(106, 560, 506, 710),
                    labels_func=add_labels_17
                )

            elif source_page_number == 18:
                def add_labels_18(p):
                    label(p, (156, 460, 290, 490), "Exhale: Confess", 12)
                    label(p, (322, 460, 456, 490), "Inhale: Trust", 12)
                recompose_page(
                    output, source, 18, 
                    clips_and_shifts=[
                        ((0, 0, 612, 225), 0),
                        ((0, 225, 612, 792), 275)
                    ],
                    image_path=prepared["breathing"],
                    img_rect=(156, 250, 456, 450),
                    labels_func=add_labels_18
                )

            elif source_page_number == 26:
                recompose_page(output, source, 26, [((0, 0, 612, 620), 0)])
                recompose_page(
                    output, source, 26, 
                    clips_and_shifts=[((0, 620, 612, 792), -150)],
                    image_path=prepared["word"],
                    img_rect=(156, 80, 456, 380)
                )

            elif source_page_number == 30:
                recompose_page(
                    output, source, 30, 
                    clips_and_shifts=[
                        ((0, 0, 612, 490), 0),
                        ((0, 490, 612, 792), 100)
                    ],
                    image_path=prepared["prayer"],
                    img_rect=(106, 500, 506, 560)
                )

            elif source_page_number == 35:
                recompose_page(
                    output, source, 35, 
                    clips_and_shifts=[
                        ((0, 0, 612, 480), 0),
                        ((0, 480, 612, 792), 240)
                    ],
                    image_path=prepared["family"],
                    img_rect=(156, 490, 456, 690)
                )
        else:
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
                insert_contain(page, (520, 74, 540, 94), icon)

            if source_page_number == 5:
                insert_contain(page, (106, 540, 506, 765), prepared["journey"])
                
            elif source_page_number == 39:
                add_visual_page(output, "Ambassadors for Christ", prepared["ambassadors"], (156, 170, 456, 470))

            elif source_page_number == 42:
                insert_contain(page, (106, 520, 506, 745), prepared["closing"])

    metadata = source.metadata.copy()
    metadata.update(
        {
            "title": "The Adventure of Living with Jesus — Visual Proof v4",
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
