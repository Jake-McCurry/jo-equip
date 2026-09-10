"""Deterministically clean the embedded Adventure review artwork.

Only alpha is changed for the source artwork.  Opaque source pixels are kept
as decoded; no resizing, redrawing, OCR, or content generation is performed.
The edge-connected masks are deliberately conservative so white interiors of
cards, diagrams, and device screens remain intact.
"""

from __future__ import annotations

from collections import deque
import json
from pathlib import Path
from typing import Callable, Iterable, Sequence

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[3]
SOURCE = Path("/tmp/adventure-review-inspect/adventure/word/media")
OUT = Path(__file__).resolve().parent


RGB = tuple[int, int, int]
Rect = tuple[int, int, int, int]


def light_neutral(pixel: RGB, minimum: int = 235, spread: int = 16) -> bool:
    """Match white/gray page margins, not colored lettering or fills."""
    return min(pixel) >= minimum and max(pixel) - min(pixel) <= spread


def cream_margin(pixel: RGB) -> bool:
    """Match image1's lightly varied warm-cream paper only."""
    r, g, b = pixel
    return r >= 235 and g >= 228 and b >= 216 and max(pixel) - min(pixel) <= 25


def checker_margin(pixel: RGB) -> bool:
    """Match image8's baked neutral checkerboard cells."""
    return light_neutral(pixel, minimum=220, spread=10)


def alpha_from_edge_fill(
    image: Image.Image,
    is_background: Callable[[RGB], bool],
    protected: Sequence[Rect] = (),
) -> tuple[Image.Image, int]:
    """Make only edge-connected background candidates transparent.

    Rectangles are x0,y0,x1,y1 (inclusive) and act as barriers.  They are used
    for white card/device interiors whose fill is intentionally opaque even
    though it has the same color as the outer page.
    """
    rgb = image.convert("RGB")
    width, height = rgb.size
    source = rgb.load()
    protected_rects = tuple(protected)

    def is_protected(x: int, y: int) -> bool:
        return any(x0 <= x <= x1 and y0 <= y <= y1 for x0, y0, x1, y1 in protected_rects)

    removed = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if removed[index] or is_protected(x, y):
            return
        if is_background(source[x, y]):
            removed[index] = 1
            queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        if height > 1:
            enqueue(x, height - 1)
    for y in range(1, height - 1):
        enqueue(0, y)
        if width > 1:
            enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    alpha = Image.new("L", (width, height), 255)
    alpha_data = alpha.load()
    for index, value in enumerate(removed):
        if value:
            alpha_data[index % width, index // width] = 0

    result = rgb.convert("RGBA")
    result.putalpha(alpha)
    return result, sum(removed)


def solid_rgba(source_path: Path) -> Image.Image:
    """Load a source without altering its pixels, adding an opaque alpha."""
    return Image.open(source_path).convert("RGBA")


def white_page_background() -> Image.Image:
    return Image.new("RGB", (1, 1), (255, 255, 255))


def composite_on(image: Image.Image, color: RGB) -> Image.Image:
    background = Image.new("RGBA", image.size, color + (255,))
    return Image.alpha_composite(background, image)


def fit_inside(image: Image.Image, max_width: int, max_height: int) -> Image.Image:
    scale = min(max_width / image.width, max_height / image.height, 1.0)
    if scale == 1.0:
        return image
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    return image.resize(size, Image.Resampling.LANCZOS)


def make_comparison(entries: list[dict[str, object]]) -> None:
    """Show each result twice: light-gray page and white page."""
    tile_width = 620
    image_area_height = 235
    label_height = 44
    row_height = image_area_height + label_height
    sheet = Image.new("RGB", (tile_width * 2, row_height * len(entries)), (232, 232, 232))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 16)
        small_font = ImageFont.truetype("DejaVuSans.ttf", 12)
    except OSError:
        font = ImageFont.load_default()
        small_font = font

    for row, entry in enumerate(entries):
        image = Image.open(OUT / str(entry["output"])).convert("RGBA")
        preview = fit_inside(image, tile_width - 24, image_area_height - 20)
        y0 = row * row_height
        for column, background in enumerate(((224, 224, 224), (255, 255, 255))):
            x0 = column * tile_width
            draw.rectangle((x0, y0, x0 + tile_width - 1, y0 + image_area_height - 1), fill=background)
            shown = composite_on(preview, background)
            paste_x = x0 + (tile_width - shown.width) // 2
            paste_y = y0 + (image_area_height - shown.height) // 2
            sheet.paste(shown.convert("RGB"), (paste_x, paste_y))
            draw.text((x0 + 10, y0 + image_area_height + 5), "light gray" if column == 0 else "white", fill=(70, 70, 70), font=small_font)
        label = f'{entry["original"]}  →  {entry["output"]}  |  {entry["disposition"]}'
        draw.text((10, y0 + image_area_height + 22), label, fill=(35, 35, 35), font=font)

    sheet.save(OUT / "comparison.png", format="PNG", optimize=True)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    entries: list[dict[str, object]] = []

    def save(
        original: str,
        output: str,
        image: Image.Image,
        disposition: str,
        method: str,
        removed_pixels: int | None = None,
        notes: str = "",
    ) -> None:
        image.save(OUT / output, format="PNG", optimize=True)
        entry: dict[str, object] = {
            "output": output,
            "disposition": disposition,
            "pixel_dimensions": {"width": image.width, "height": image.height},
            "mode": image.mode,
            "method": method,
        }
        if removed_pixels is not None:
            entry["transparent_pixels_added"] = removed_pixels
        if notes:
            entry["notes"] = notes
        entries.append({"original": original, **entry})

    # The source filenames are the authority here.  image1 is the cream
    # illustration and image10 is the website screenshot in this extraction.
    cleaned, count = alpha_from_edge_fill(solid_rgba(SOURCE / "image1.png"), cream_margin)
    save(
        "image1.png",
        "image1.png",
        cleaned,
        "cleaned_edge_connected_cream_margin",
        "edge-connected warm-cream flood fill; artwork pixels retained",
        count,
        "Cream outside the illustrated navy/orange linework is transparent.",
    )

    cleaned, count = alpha_from_edge_fill(
        solid_rgba(SOURCE / "image2.jpg"),
        lambda pixel: light_neutral(pixel, minimum=235, spread=16),
    )
    save(
        "image2.jpg",
        "image2.png",
        cleaned,
        "cleaned_edge_connected_white_margin",
        "edge-connected near-white flood fill; original JPEG pixels retained",
        count,
        "Output is PNG so the white page around both colored diagrams can be transparent.",
    )

    # Keep each card's intentionally white interior opaque while removing the
    # page between and outside cards.
    card_interiors: tuple[Rect, ...] = (
        (28, 30, 1000, 1000),
        (1135, 30, 2150, 1000),
        (2250, 30, 3228, 1000),
    )
    cleaned, count = alpha_from_edge_fill(
        solid_rgba(SOURCE / "image3.png"),
        lambda pixel: light_neutral(pixel, minimum=235, spread=16),
        card_interiors,
    )
    save(
        "image3.png",
        "image3.png",
        cleaned,
        "cleaned_edge_connected_white_margin",
        "edge-connected near-white flood fill with three card-interior barriers",
        count,
        "White card interiors remain opaque so lettering and panel backgrounds are preserved.",
    )

    # These are intentional full-bleed navy/orange teaching panels.  They are
    # explicitly recorded rather than incorrectly treating their fills as a
    # removable background.
    save(
        "image4.png",
        "image4.png",
        solid_rgba(SOURCE / "image4.png"),
        "intentionally_unchanged",
        "copied as RGBA with fully opaque alpha",
        notes="Intentional Exhale/Inhale navy and orange teaching panel reaches the image edges.",
    )
    save(
        "image5.png",
        "image5.png",
        solid_rgba(SOURCE / "image5.png"),
        "intentionally_unchanged",
        "copied as RGBA with fully opaque alpha",
        notes="Intentional navy fruit-of-the-Spirit teaching panel reaches the image edges.",
    )

    cleaned, count = alpha_from_edge_fill(
        solid_rgba(SOURCE / "image6.png"),
        lambda pixel: light_neutral(pixel, minimum=235, spread=16),
    )
    save(
        "image6.png",
        "image6.png",
        cleaned,
        "cleaned_edge_connected_white_margin",
        "edge-connected near-white flood fill around the faucet diagram",
        count,
        "Black labels, faucet imagery, water, and sink remain untouched.",
    )

    # The dashed outer border can have openings; barrier rectangle prevents the
    # white diagram panel behind the lettering from being flood-filled.
    cleaned, count = alpha_from_edge_fill(
        solid_rgba(SOURCE / "image7.png"),
        lambda pixel: light_neutral(pixel, minimum=235, spread=16),
        ((18, 28, 1525, 622),),
    )
    save(
        "image7.png",
        "image7.png",
        cleaned,
        "cleaned_edge_connected_white_margin",
        "edge-connected near-white flood fill with diagram-panel barrier",
        count,
        "The white interior of the five-ways diagram remains opaque.",
    )

    # image8 contains a baked, repeating gray/white checkerboard rather than
    # alpha.  Edge-connected neutral fill removes only the connected board;
    # outlined figure interiors are not treated as page margin.
    cleaned, count = alpha_from_edge_fill(
        solid_rgba(SOURCE / "image8.png"),
        checker_margin,
    )
    save(
        "image8.png",
        "image8.png",
        cleaned,
        "cleaned_edge_connected_checkerboard",
        "edge-connected neutral checkerboard flood fill",
        count,
        "Navy/orange people, connection lines, and enclosed light interiors are retained.",
    )

    # image9 is the phone/app screenshot in this extraction.  Protect screen
    # interiors while removing the baked white/grid page around the devices.
    phone_interiors: tuple[Rect, ...] = (
        (64, 33, 168, 242),
        (161, 22, 271, 254),
        (262, 14, 374, 260),
        (373, 24, 482, 250),
        (480, 34, 580, 240),
    )
    cleaned, count = alpha_from_edge_fill(
        solid_rgba(SOURCE / "image9.png"),
        lambda pixel: light_neutral(pixel, minimum=220, spread=14),
        phone_interiors,
    )
    save(
        "image9.png",
        "image9.png",
        cleaned,
        "cleaned_edge_connected_white_grid_margin",
        "edge-connected near-white/gray flood fill with five phone-screen barriers",
        count,
        "Phone screens and their lettering stay opaque; outer white/grid page becomes transparent.",
    )

    # image10 is the website screenshot in this extraction.  Only its actual
    # outer white page margin is removed; the faded lower reflection remains
    # opaque as part of the screenshot.
    cleaned, count = alpha_from_edge_fill(
        solid_rgba(SOURCE / "image10.png"),
        lambda pixel: light_neutral(pixel, minimum=240, spread=12),
        ((10, 14, 761, 325),),
    )
    save(
        "image10.png",
        "image10.png",
        cleaned,
        "cleaned_outer_white_margin_only",
        "edge-connected near-white flood fill outside screenshot bounds",
        count,
        "Website screenshot and reflection are preserved; only safely isolated outer white is transparent.",
    )

    manifest = {
        "source_directory": str(SOURCE),
        "output_directory": str(OUT),
        "purpose": "Adventure review image cleanup; alpha-only edits, no content regeneration",
        "naming_note": "The extracted basenames place the cream line illustration at image1, the app screenshot at image9, and the website screenshot at image10; processing follows those actual source files.",
        "coverage_limitations": [
            "Opaque source RGB pixels are preserved exactly; transparent edges use hard, deterministic edge-connected masks and may retain a small source-colored matte on anti-aliased artwork.",
            "Intentional white interiors of cards and device screens are protected with barriers, so some interior white remains opaque by design.",
            "image4 and image5 are intentionally unchanged because their navy/orange teaching-panel fills reach the image edges.",
        ],
        "images": {entry["original"]: {key: value for key, value in entry.items() if key != "original"} for entry in entries},
        "comparison": "comparison.png",
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    make_comparison(entries)

    print(f"Cleaned {len(entries)} source images into {OUT}")
    for entry in entries:
        print(
            f'{entry["original"]} -> {entry["output"]}: '
            f'{entry["disposition"]}, {entry["pixel_dimensions"]}'
        )


if __name__ == "__main__":
    main()