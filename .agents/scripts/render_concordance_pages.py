from pathlib import Path
import sys

import fitz


PDF = Path("attached_assets/ZMission-IngramSpark_03-30-26_260826_1787868242072.pdf")
OUT = Path(".agents/outputs/concordance-sample/rendered")


def main() -> None:
    pages = [int(value) for value in sys.argv[1:]] or [100]
    OUT.mkdir(parents=True, exist_ok=True)
    document = fitz.open(PDF)
    for page_number in pages:
        page = document[page_number - 1]
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.6, 1.6), alpha=False)
        pixmap.save(OUT / f"page-{page_number:04d}.png")
        print(f"rendered PDF page {page_number}")


if __name__ == "__main__":
    main()