from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path


PDF = Path("attached_assets/ZMission-IngramSpark_03-30-26_260826_1787868242072.pdf")
OUT = Path(".agents/outputs/concordance-sample")
DATA_OUT = Path("artifacts/knowing-god-concordance/src/data/topics.json")
START_PAGE = 29
END_PAGE = 54

HEADINGS = [
    "ABASING", "ABHORRING", "ABIDING", "ABLE", "ABOUNDING", "ABSOLUTE",
    "ABSTINENCE", "ABUNDANT", "ACCEPTING", "ACCESSIBLE", "ACCOMPLISHING",
    "ACCOUNTABILITY", "ADDING", "ADMONISHING", "ADOPTION",
    "ADORING THE LORD", "ADORNING",
]

REF_RE = re.compile(
    r"^(?P<reference>(?:[1-3] )?[A-Z][A-Za-z]+(?: [A-Za-z]+)* "
    r"\d+:\d+(?:-\d+)?(?:, \d+(?:-\d+)?)?)\s+(?P<text>.*)$"
)
HEADER_RE = re.compile(
    r"^(?:"
    r"Knowing God:.*\|\s*\d+\s*\|\s*[A-Z]"
    r"|"
    r"[A-Z]\s*\|\s*\d+\s*\|\s*Knowing God:.*"
    r")$"
)
FORBIDDEN_SOURCE_PATTERNS = (
    "Knowing God: Topical Bible Verses",
    "| Knowing God:",
)


def dehyphenate(text: str) -> str:
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def extract_pages() -> list[tuple[int, str]]:
    pages: list[tuple[int, str]] = []
    page_dir = OUT / "raw-pages"
    page_dir.mkdir(parents=True, exist_ok=True)
    for page in range(START_PAGE, END_PAGE + 1):
        target = page_dir / f"page-{page}.txt"
        subprocess.run(
            ["pdftotext", "-f", str(page), "-l", str(page), "-raw", str(PDF), str(target)],
            check=True,
        )
        lines = []
        for line in target.read_text(errors="replace").splitlines():
            value = line.strip()
            if not value or HEADER_RE.match(value):
                continue
            if value in {str(page - 28), "A"}:
                continue
            lines.append(value)
        pages.append((page, "\n".join(lines)))
    return pages


def parse_topics(pages: list[tuple[int, str]]) -> list[dict]:
    line_records: list[tuple[int, str]] = []
    for page, text in pages:
        line_records.extend((page, line) for line in text.splitlines())

    starts = [(i, page, line) for i, (page, line) in enumerate(line_records) if line in HEADINGS]
    topics = []
    for index, (start, start_page, title) in enumerate(starts):
        end = starts[index + 1][0] if index + 1 < len(starts) else len(line_records)
        chunk = line_records[start + 1:end]
        source_pages = sorted({page for page, _ in chunk} | {start_page})
        lines = [line for _, line in chunk]

        additional_at = next((i for i, line in enumerate(lines) if line.startswith("Additional Scripture:")), None)
        see_at = next((i for i, line in enumerate(lines) if line.startswith("See Also:")), None)
        first_ref = next((i for i, line in enumerate(lines) if REF_RE.match(line)), None)
        is_cross_reference = bool(lines and lines[0].startswith("See ") and first_ref is None)

        definition_lines = lines[: first_ref or 0]
        definition = dehyphenate("\n".join(definition_lines))

        passage_end_candidates = [i for i in (additional_at, see_at) if i is not None]
        passage_end = min(passage_end_candidates) if passage_end_candidates else len(lines)
        passage_lines = lines[first_ref:passage_end] if first_ref is not None else []
        passages = []
        current = None
        for line in passage_lines:
            match = REF_RE.match(line)
            if match:
                if current:
                    current["text"] = dehyphenate("\n".join(current["text"]))
                    passages.append(current)
                current = {"reference": match.group("reference"), "text": [match.group("text")]}
            elif current:
                current["text"].append(line)
        if current:
            current["text"] = dehyphenate("\n".join(current["text"]))
            passages.append(current)

        supplemental = []
        if additional_at is not None:
            stop = see_at if see_at is not None and see_at > additional_at else len(lines)
            raw = "\n".join(lines[additional_at:stop]).replace("Additional Scripture:", "", 1)
            raw = dehyphenate(raw).rstrip(".")
            supplemental = [item.strip() for item in raw.split(";") if item.strip()]

        related = []
        if is_cross_reference:
            raw = dehyphenate("\n".join(lines)).removeprefix("See ").rstrip(".")
            related = [item.strip() for item in raw.split(";") if item.strip()]
        elif see_at is not None:
            raw = "\n".join(lines[see_at:]).replace("See Also:", "", 1)
            raw = dehyphenate(raw).rstrip(".")
            related = [item.strip() for item in raw.split(";") if item.strip()]

        topics.append({
            "id": title.lower().replace(" ", "-"),
            "title": title.title().replace(" The Lord", " the Lord"),
            "definition": definition,
            "primaryPassages": passages,
            "supplementalReferences": supplemental,
            "relatedTopics": related,
            "sourcePages": source_pages,
            "sampleStatus": (
                "cross-reference"
                if is_cross_reference
                else "complete"
                if additional_at is not None and see_at is not None
                else "partial"
            ),
        })
    return topics


def validate_topics(topics: list[dict]) -> None:
    serialized = json.dumps(topics, ensure_ascii=False)
    leaked = [
        pattern for pattern in FORBIDDEN_SOURCE_PATTERNS
        if pattern in serialized
    ]
    if leaked:
        raise ValueError(
            "Generated data contains leaked running headers: "
            + ", ".join(leaked)
        )

    for topic in topics:
        if not topic["title"] or not topic["sourcePages"]:
            raise ValueError("Every topic must have a title and source pages")
        for passage in topic["primaryPassages"]:
            if not passage["reference"] or not passage["text"]:
                raise ValueError(
                    f"Topic {topic['title']} contains an incomplete passage"
                )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    pages = extract_pages()
    topics = parse_topics(pages)
    validate_topics(topics)
    DATA_OUT.parent.mkdir(parents=True, exist_ok=True)
    DATA_OUT.write_text(json.dumps(topics, indent=2, ensure_ascii=False) + "\n")

    complete = [topic for topic in topics if topic["sampleStatus"] == "complete"]
    cross_references = [topic for topic in topics if topic["sampleStatus"] == "cross-reference"]
    partial = [topic for topic in topics if topic["sampleStatus"] == "partial"]
    report = f"""# Knowing God concordance sample validation

## Scope
- Source: `{PDF}`
- Representative range: PDF pages {START_PAGE}–{END_PAGE} (26 concordance pages; 30 rendered pages 25–54 include front matter and blanks)
- Topics detected: {len(topics)} ({len(complete)} complete, {len(cross_references)} cross-reference-only, {len(partial)} partial at the sample boundary)
- Primary passages: {sum(len(t["primaryPassages"]) for t in topics)}
- Supplemental references: {sum(len(t["supplementalReferences"]) for t in topics)}
- Related-topic links: {sum(len(t["relatedTopics"]) for t in topics)}

## Covered structures
- Topic starts and long topic continuations across pages
- Left-to-right two-column page flow and page breaks
- Multi-line definitions and long scripture passages
- Additional Scripture lists, including wrapped and hyphenated lines
- See Also lists, including wrapped and hyphenated topic names
- Multi-word topic headings (`Adoring the Lord`)

## Validation findings
- The embedded text layer is sufficient; OCR is not required.
- Generation fails if either mirrored running-header pattern leaks into structured content.
- Standalone all-caps headings reliably identify topic starts in raw reading order.
- Printed line-end hyphens must be removed when a word continues on the next extracted line.
- Column-aware `-raw` extraction is materially safer than `-layout`, whose rows interleave the two columns.
- The first and last records in a bounded sample may be partial by design; the full run should include one page of overlap on both sides and trim after topic assembly.

## Ambiguities and losses
- Bible references that omit a repeated book name after a semicolon remain as printed (for example, `24`); resolving them requires a reference grammar with inherited book/chapter context.
- Curly apostrophes and small-cap `LORD` survive; discretionary print hyphens are normalized.
- The source contains an apparent stray character in `y{{our` on PDF page 31; it is preserved rather than silently corrected.
- Related topics are normalized as labels only; links should resolve after the complete topic catalog is extracted.
- Cross-reference-only topics (such as `Abstinence`) intentionally contain no definition or primary passages.
- Boundary topic `{partial[0]["title"] if partial else "none"}` lacks closing metadata because the sample ends before the source topic does.

## Prototype data
- Structured JSON: `{DATA_OUT}`
- Raw page text: `{OUT / "raw-pages"}`
- Rendered verification pages: `{OUT / "rendered"}`
"""
    (OUT / "validation-report.md").write_text(report)
    print(report)


if __name__ == "__main__":
    main()