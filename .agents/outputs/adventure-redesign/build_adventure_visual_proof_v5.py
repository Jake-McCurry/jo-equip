from io import BytesIO
from pathlib import Path
from PIL import Image
import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[3]
SOURCE = ROOT / "attached_assets/Adventure-0920226_1788387073638.pdf"
OUTPUT = ROOT / ".agents/outputs/adventure-visual-proof-v5.pdf"
WORK = Path("/tmp/adventure-visual-proof-assets")

NAVY = (0.035, 0.255, 0.373)
GOLD = (0.902, 0.596, 0.035)
WHITE = (1, 1, 1)
WRAP_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf"

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

def recompose_page_multi(output, source, clips_and_shifts, images=None, labels=None, wraps=None):
    new_page = output.new_page(width=612, height=792)
    
    for src_pno, clip_rect, shift_y in clips_and_shifts:
        src_rect = fitz.Rect(clip_rect)
        temp_doc = fitz.open()
        temp_doc.insert_pdf(source, from_page=src_pno-1, to_page=src_pno-1)
        tpage = temp_doc[0]
        
        if src_rect.y0 > 0:
            tpage.add_redact_annot(fitz.Rect(0, 0, 612, src_rect.y0))
        if src_rect.y1 < 792:
            tpage.add_redact_annot(fitz.Rect(0, src_rect.y1, 612, 792))
            
        tpage.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE)
        
        dest_rect = src_rect + (0, shift_y, 0, shift_y)
        new_page.show_pdf_page(dest_rect, temp_doc, 0, clip=src_rect)
        
        for link in source[src_pno-1].links():
            cx = (link["from"].x0 + link["from"].x1)/2
            cy = (link["from"].y0 + link["from"].y1)/2
            if src_rect.contains(fitz.Point(cx, cy)):
                new_link = link.copy()
                new_link["from"] = link["from"] + (0, shift_y, 0, shift_y)
                new_page.insert_link(new_link)
                
    if images:
        for img_rect, img_path in images:
            insert_contain(new_page, img_rect, img_path)
            
    if wraps:
        for wrap in wraps:
            rect, text = wrap[0], wrap[1]
            wrap_size = wrap[2] if len(wrap) > 2 else 11.1
            new_page.insert_font(fontname="wrapserif", fontfile=WRAP_FONT)
            new_page.insert_textbox(
                fitz.Rect(rect), 
                text, 
                fontname="wrapserif", 
                fontsize=wrap_size, 
                color=(0.15, 0.15, 0.15), 
                align=fitz.TEXT_ALIGN_LEFT
            )
            
    if labels:
        for rect, text, size in labels:
            label(new_page, rect, text, size)

def main():
    prepared, icons = prepare_assets()
    source = fitz.open(SOURCE)
    output = fitz.open()

    chapter_icons_by_source = {6: 0, 10: 1, 13: 2, 19: 3, 22: 4, 27: 5, 31: 6, 36: 7}

    for source_page_number in range(1, source.page_count + 1):
        if source_page_number == 5:
            recompose_page_multi(output, source, [
                (5, (0, 0, 612, 415), 0),
                (5, (0, 415, 612, 792), 120)
            ], images=[((130, 425, 480, 525), prepared["journey"])])

        elif source_page_number == 7:
            text7 = "In the original Greek language, the word “believe” means to trust in, cling to, and rely upon. In other words, “believe” in the original Greek language is an active faith—much like the faith rock climbers have in the rope to hold them secure. Becoming a Christian means placing that kind of trust in Jesus: relying fully on His death for your sins and His resurrection for your eternal life."
            recompose_page_multi(output, source, [
                (7, (0, 0, 612, 237), 0),
                (7, (0, 310, 612, 792), 45)
            ], images=[((380, 237, 530, 337), prepared["faith"])],
               wraps=[((63, 237, 360, 350), text7)])

        elif source_page_number == 11:
            text11 = "You are now a completely new creation—like a butterfly that was once a caterpillar. You may not always feel new or act new, but in God’s eyes you are fully new. The Father sees you as the one His Son purchased with His own blood. You are His royal child (Hebrews 2:9-11)."
            recompose_page_multi(output, source, [
                (11, (0, 0, 612, 57), 0),
                (11, (0, 115, 612, 792), 25)
            ], images=[((418, 57, 538, 137), prepared["creation"])],
               wraps=[((63, 57, 400, 140), text11)])

        elif source_page_number == 12:
            output.insert_pdf(source, from_page=11, to_page=11, links=True, annots=True)

        elif source_page_number == 16:
            labels16 = [((160, 350, 290, 370), "Self-Directed", 11), ((322, 350, 452, 370), "Christ-Directed", 11)]
            recompose_page_multi(output, source, [
                (16, (0, 0, 612, 215), 0),
                (16, (0, 380, 612, 792), 0)
            ], images=[((156, 215, 456, 340), prepared["directed"])], labels=labels16)

        elif source_page_number == 17:
            labels17 = [((110, 710, 220, 750), "Yield yourself\nto God", 9), ((250, 710, 360, 750), "Confess your\nsins", 9), ((390, 710, 500, 750), "Trust God to be\nin control", 9)]
            recompose_page_multi(output, source, [
                (17, (0, 0, 612, 540), 0)
            ], images=[((106, 550, 506, 700), prepared["steps"])], labels=labels17)

        elif source_page_number == 18:
            labels18 = [((156, 385, 290, 415), "Exhale: Confess", 12), ((322, 385, 456, 415), "Inhale: Trust", 12)]
            recompose_page_multi(output, source, [
                (18, (0, 0, 612, 215), 0),
                (18, (0, 215, 612, 792), 200)
            ], images=[((156, 225, 456, 375), prepared["breathing"])], labels=labels18)

        elif source_page_number == 23:
            recompose_page_multi(output, source, [(23, (0, 0, 612, 650), 0)])
            recompose_page_multi(output, source, [
                (23, (0, 650, 612, 675), -590),
                (23, (0, 675, 612, 792), -295),
                (24, (0, 0, 612, 200), 497)
            ], images=[((156, 100, 456, 350), prepared["word"])])

        elif source_page_number == 24:
            recompose_page_multi(output, source, [(24, (0, 200, 612, 792), -140)])

        elif source_page_number == 29:
            recompose_page_multi(output, source, [
                (29, (0, 0, 612, 472), 0),
                (29, (0, 472, 612, 792), 45)
            ], images=[((63, 475, 549, 515), prepared["prayer"])])

        elif source_page_number == 35:
            recompose_page_multi(output, source, [
                (35, (0, 0, 612, 345), 0),
                (35, (0, 345, 612, 792), 150)
            ], images=[((349, 335, 549, 468), prepared["family"])])

        elif source_page_number == 39:
            text39 = "Paul writes, “We are ambassadors for Christ” (2 Corinthians 5:20). An ambassador represents a sovereign authority in a foreign state. In the same way, Jesus, your King, has commissioned you to represent His Kingdom in this world. You are Christ’s witness and God’s choice to reach others for Him."
            recompose_page_multi(output, source, [
                (39, (0, 0, 612, 582), 0),
                (39, (0, 660, 612, 732), 50)
            ], images=[((405, 586, 530, 670), prepared["ambassadors"])],
               wraps=[((63, 586, 385, 700), text39, 10.5)])
            # Remove the clipped remnant of the original paragraph while
            # preserving the response-card rule beneath it.
            for remnant in output[-1].search_for("Him."):
                if remnant.y0 < 500:
                    output[-1].add_redact_annot(remnant, fill=False)
            output[-1].apply_redactions(
                images=fitz.PDF_REDACT_IMAGE_NONE,
                graphics=fitz.PDF_REDACT_LINE_ART_NONE,
            )

        elif source_page_number == 42:
            recompose_page_multi(output, source, [
                (42, (0, 0, 612, 792), 0)
            ], images=[((106, 510, 506, 735), prepared["closing"])])

        else:
            output.insert_pdf(source, from_page=source_page_number-1, to_page=source_page_number-1, links=True, annots=True)

        if source_page_number in chapter_icons_by_source:
            icon = icons[chapter_icons_by_source[source_page_number]]
            insert_contain(output[-1], (520, 74, 540, 94), icon)

    metadata = source.metadata.copy()
    metadata.update(
        {
            "title": "The Adventure of Living with Jesus — Visual Proof v5",
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
