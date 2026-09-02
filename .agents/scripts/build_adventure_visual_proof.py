from io import BytesIO
from pathlib import Path

from PIL import Image
import pymupdf as fitz


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
OUTPUT = ROOT / ".agents/outputs/adventure-visual-proof.pdf"
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
        if key in {"directed", "ambassadors"}:
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
            insert_contain(page, (45, 520, 567, 770), prepared["journey"])
        elif source_page_number == 12:
            insert_contain(page, (63, 300, 549, 665), prepared["creation"])
        elif source_page_number == 16:
            page.draw_rect(fitz.Rect(90, 220, 522, 400), fill=WHITE, color=WHITE, overlay=True)
            insert_contain(page, (90, 225, 522, 365), prepared["directed"])
            label(page, (105, 368, 300, 390), "Self-Directed", 11)
            label(page, (312, 368, 507, 390), "Christ-Directed", 11)
        elif source_page_number == 17:
            page.draw_rect(fitz.Rect(63, 548, 549, 770), fill=WHITE, color=WHITE, overlay=True)
            insert_contain(page, (95, 550, 517, 760), prepared["steps"])
            label(page, (99, 709, 231, 748), "Yield yourself\nto God", 8.5)
            label(page, (240, 709, 372, 748), "Confess your\nsins", 8.5)
            label(page, (381, 709, 513, 748), "Trust God to be\nin control", 8.5)
        elif source_page_number == 18:
            insert_contain(page, (72, 320, 540, 680), prepared["breathing"])
            label(page, (87, 610, 278, 642), "Exhale: Confess", 12)
            label(page, (334, 610, 525, 642), "Inhale: Trust", 12)
        elif source_page_number == 42:
            insert_contain(page, (63, 520, 549, 775), prepared["closing"])

        if source_page_number == 7:
            add_visual_page(output, "Faith versus Feelings", prepared["faith"])
        elif source_page_number == 26:
            add_visual_page(output, "Five Ways to Receive God's Word", prepared["word"], portrait=True)
        elif source_page_number == 30:
            add_visual_page(output, "A Daily Rhythm of Prayer", prepared["prayer"])
        elif source_page_number == 35:
            add_visual_page(output, "Belonging to God’s Family", prepared["family"])
        elif source_page_number == 39:
            add_visual_page(output, "Ambassadors for Christ", prepared["ambassadors"], portrait=True)

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
    print(OUTPUT)


if __name__ == "__main__":
    main()