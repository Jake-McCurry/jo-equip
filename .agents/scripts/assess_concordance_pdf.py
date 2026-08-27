from pathlib import Path

import fitz


PDF_PATH = Path(
    "attached_assets/ZMission-IngramSpark_03-30-26_260826_1787868242072.pdf"
)
OUTPUT_DIR = Path(".agents/outputs/concordance-assessment")
SAMPLE_PAGES = [1, 2, 5, 10, 25, 100, 300, 567, 900, 1134]


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    document = fitz.open(PDF_PATH)

    for page_number in SAMPLE_PAGES:
        page = document[page_number - 1]
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        pixmap.save(OUTPUT_DIR / f"page-{page_number:04d}.png")

    print(f"Rendered {len(SAMPLE_PAGES)} pages from {document.page_count} total pages.")


if __name__ == "__main__":
    main()