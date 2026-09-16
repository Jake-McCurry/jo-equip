"""Capture/compare publication edits and render title/end pages for review."""
import argparse
import hashlib
import json
from pathlib import Path
import fitz

BOOKS = [
    "adventure-of-living-with-jesus",
    "your-new-identity-in-christ",
    "beholding-the-majesty-of-god",
    "walking-in-the-spirit",
]
ROOT = Path("artifacts/discipleship-hub/public/books")
OUT = Path("/tmp/book-publication-review")
OUT.mkdir(exist_ok=True)


def snapshot():
    result = {}
    for name in BOOKS:
        doc = fitz.open(ROOT / f"{name}.pdf")
        result[name] = [{
            "text": page.get_text(),
            "links": sorted(link.get("uri", "") for link in page.get_links() if link.get("uri")),
            "image_hash": hashlib.sha256(page.get_pixmap().samples).hexdigest(),
        } for page in doc]
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--baseline", action="store_true")
    args = parser.parse_args()
    data = snapshot()
    if args.baseline:
        (OUT / "baseline.json").write_text(json.dumps(data))
    else:
        baseline = json.loads((OUT / "baseline.json").read_text())
        report = {}
        for name, pages in data.items():
            doc = fitz.open(ROOT / f"{name}.pdf")
            for idx, label in [(1, "title"), (len(doc)-1, "resources")]:
                doc[idx].get_pixmap(matrix=fitz.Matrix(1.25, 1.25)).save(OUT / f"{name}-{label}.png")
            before = baseline[name]
            report[name] = {
                "pages_before": len(before),
                "pages_after": len(pages),
                "title": pages[1]["text"],
                "ending": pages[-1]["text"],
                "title_links": pages[1]["links"],
                "ending_links": pages[-1]["links"],
                "cover_unchanged": before[0]["image_hash"] == pages[0]["image_hash"],
            }
            if name.startswith("adventure"):
                report[name]["untouched_pages_identical"] = before[2:-1] == pages[2:-1]
        (OUT / "report.json").write_text(json.dumps(report, indent=2))
        print(json.dumps(report, indent=2))