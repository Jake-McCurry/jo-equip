#!/usr/bin/env python3
"""Extract and validate the complete Knowing God topical concordance."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
PDF = ROOT / "attached_assets/ZMission-IngramSpark_03-30-26_260826_1788215966373.pdf"
OUTPUT = ROOT / "artifacts/discipleship-hub/public/knowing-god/data"
FIRST_BODY_PAGE = 29
LAST_BODY_PAGE = 1126
PRINTED_PAGE_OFFSET = 28
SOURCE_TITLE = "Knowing God: Topical Bible Verses on the Nature and Character of the Almighty"
MINIMUM_TOPIC_COUNT = 600

BOOKS = (
    "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|"
    "(?:1|2|I|II) Samuel|(?:(?:1|2|I|II) )?Kings|"
    "(?:1|2|I|II) Chronicles|Ezra|Nehemiah|Esther|"
    "Job|Psalms?|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|"
    "Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|"
    "Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|"
    "Romans|(?:1|2) Corinthians|Galatians|Ephesians|Philippians|Colossians|"
    "(?:1|2) Thessalonians|(?:1|2) Timothy|Titus|Philemon|Hebrews|James|"
    "(?:1|2) Peter|(?:1|2|3) John|Jude|Revelation"
)
REFERENCE_RE = re.compile(
    rf"^(?P<reference>(?:{BOOKS})\s+\d+(?::\d+)?"
    r"(?:-\d+)?(?:,\s*\d+(?::\d+)?(?:-\d+)?)*)(?:\s+)(?P<text>.+)$"
)
REFERENCE_ONLY_RE = re.compile(
    rf"^(?:{BOOKS})\s+\d+(?::\d+)?(?:-\d+)?"
    r"(?:,\s*\d+(?::\d+)?(?:-\d+)?)*$"
)
HEADER_FRAGMENT = "Knowing God: Topical Bible Verses on the Nature and Character of the Almighty"
ALL_CAPS_RE = re.compile(r"^[A-Z0-9‘“][A-Z0-9 ’'‘’“”&,.\-–—:()]+$")
SOURCE_MARKER_RE = re.compile(
    r"\((?:Amplified Bible,\s*Classic Edition\s*\(AMPC\)|AMPC)\)"
)
SEE_RE = re.compile(r"^See(?:\s+[Aa]lso:|\s+[A-Z‘“]|[A-Z])")
KNOWN_TOC_ONLY = {"NON-IMPOSSIBILITATION OF THE LORD"}


def compact_json(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=False) + "\n"


def join_wrapped(lines: list[str]) -> str:
    """Join visual lines, removing only line-wrap hyphens."""
    result = ""
    for raw in lines:
        value = raw.strip()
        if not value:
            continue
        if not result:
            result = value
        elif result.endswith("-") and value[0].isalnum():
            result = result[:-1] + value
        else:
            result += " " + value
    normalized = re.sub(r"[ \t]+", " ", result).strip()
    # MuPDF splits one printed "your" glyph run into "y{" + "our".
    # The rendered source on physical page 31 confirms the brace is absent.
    return normalized.replace("y{our idols", "your idols")


def is_caps(value: str) -> bool:
    return bool(ALL_CAPS_RE.fullmatch(value)) and any("A" <= char <= "Z" for char in value)


def is_heading_line(value: str) -> bool:
    return is_caps(value) or bool(
        re.fullmatch(r"[A-Z][A-Z ,’'\-]+ \([^)]*[a-z][^)]*\)", value)
    )


def slugify(title: str) -> str:
    normalized = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    normalized = normalized.lower().replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")


def extract_pages(pdf: Path) -> list[list[tuple[int, str]]]:
    mutool = shutil.which("mutool")
    if not mutool:
        raise RuntimeError("MuPDF's mutool executable is required")
    with tempfile.TemporaryDirectory(prefix="knowing-god-") as temporary:
        pattern = str(Path(temporary) / "page-%04d.txt")
        subprocess.run(
            [
                mutool,
                "draw",
                "-q",
                "-F",
                "txt",
                "-o",
                pattern,
                str(pdf),
                f"{FIRST_BODY_PAGE}-{LAST_BODY_PAGE}",
            ],
            check=True,
        )
        pages: list[list[tuple[int, str]]] = []
        for physical_page in range(FIRST_BODY_PAGE, LAST_BODY_PAGE + 1):
            page_path = Path(temporary) / f"page-{physical_page:04d}.txt"
            if not page_path.exists():
                raise ValueError(f"MuPDF did not extract physical page {physical_page}")
            page_lines: list[tuple[int, str]] = []
            for raw in page_path.read_text(encoding="utf-8", errors="strict").splitlines():
                value = raw.strip()
                if not value or HEADER_FRAGMENT in value:
                    continue
                if value == str(physical_page - PRINTED_PAGE_OFFSET):
                    continue
                page_lines.append((physical_page, value))
            pages.append(page_lines)
        return pages


def flatten_pages(pages: list[list[tuple[int, str]]]) -> list[tuple[int, str]]:
    records = [record for page in pages for record in page]
    normalized: list[tuple[int, str]] = []
    cursor = 0
    while cursor < len(records):
        page, value = records[cursor]
        if value == "See" and cursor + 1 < len(records) and records[cursor + 1][0] == page:
            normalized.append((page, f"See {records[cursor + 1][1]}"))
            cursor += 2
            continue
        if (
            value == "Additional"
            and cursor + 1 < len(records)
            and records[cursor + 1] == (page, "Scripture:")
        ):
            normalized.append((page, "Additional Scripture:"))
            cursor += 2
            continue
        normalized.append((page, value))
        cursor += 1
    return normalized


def find_record_end(
    lines: list[tuple[int, str]], start: int, known_titles: set[str], current_title: str
) -> tuple[int, str]:
    """Return the exclusive end and record kind after its final See paragraph."""
    cursor = start
    saw_body = False
    saw_reference = False
    while cursor < len(lines):
        value = lines[cursor][1]
        if value.startswith(("See Also:", "See also:")):
            kind = "topic"
            break
        if SEE_RE.match(value) and not saw_reference:
            kind = "topic" if saw_body else "cross-reference"
            break
        if REFERENCE_RE.match(value) or REFERENCE_ONLY_RE.match(value):
            saw_reference = True
        saw_body = True
        cursor += 1
    else:
        raise ValueError(f"No closing See paragraph after source line {start}")

    marker_page = lines[cursor][0]
    while cursor < len(lines):
        if lines[cursor][1].endswith("."):
            cursor += 1
            break
        # Letter dividers may follow an unpunctuated See line after a blank
        # PDF page. They are never part of a target label.
        if len(lines[cursor][1]) == 1 and lines[cursor][1].isalpha():
            return cursor, kind
        if (
            cursor > start
            and is_caps(lines[cursor][1])
            and (
                lines[cursor][1] in known_titles
                and lines[cursor][1] > current_title
                or (
                    lines[cursor][0] != marker_page
                    and not lines[cursor - 1][1].endswith(("-", ";", ","))
                )
            )
        ):
            return cursor, kind
        cursor += 1
    else:
        if kind == "cross-reference":
            return cursor, kind
        raise ValueError(f"Unterminated See paragraph after source line {start}")

    # A small number of entries have an editorial Note after See Also. Include
    # those lines until the next catalogued heading; otherwise the next line is
    # the next topic (some headings contain a lowercase pronunciation guide).
    if cursor < len(lines) and lines[cursor][1].startswith("Note:"):
        while cursor < len(lines):
            value = lines[cursor][1]
            if len(value) == 1 and value.isalpha():
                return cursor, kind
            if value in known_titles:
                return cursor, kind
            cursor += 1
    return cursor, kind


def parse_title(lines: list[tuple[int, str]], start: int) -> tuple[str, int]:
    title_lines: list[str] = []
    cursor = start
    while cursor < len(lines) and (
        is_caps(lines[cursor][1])
        or (not title_lines and is_heading_line(lines[cursor][1]))
    ):
        title_lines.append(lines[cursor][1])
        cursor += 1
    if not title_lines:
        raise ValueError(f"Expected topic heading at source line {start}: {lines[start][1]!r}")
    return join_wrapped(title_lines), cursor


def split_related(raw: str, prefix: str) -> list[str]:
    content = raw.removeprefix(prefix).strip()
    if content.endswith("."):
        content = content[:-1]
    return [item.strip() for item in content.split(";") if item.strip()]


def parse_topic(
    title: str,
    title_start: int,
    body_start: int,
    end: int,
    kind: str,
    lines: list[tuple[int, str]],
) -> dict:
    records = lines[title_start:end]
    body = lines[body_start:end]
    values = [value for _, value in body]
    source_pages = sorted({page for page, _ in records})

    if kind == "cross-reference":
        see_end = next(
            (index + 1 for index, value in enumerate(values) if value.endswith(".")),
            len(values),
        )
        see_also = split_related(join_wrapped(values[:see_end]), "See ")
        return {
            "id": slugify(title),
            "title": title.title(),
            "sourcePages": source_pages,
            "passages": [],
            "definition": "",
            "additionalScripture": "",
            "seeAlso": see_also,
            "sourceMarkers": [],
            "recordType": "cross-reference",
        }

    additional_at = next(
        (index for index, value in enumerate(values) if value.startswith("Additional Scripture:")),
        None,
    )
    see_at = next(
        (
            index
            for index, value in enumerate(values)
            if value.startswith(("See Also:", "See also:"))
        ),
        None,
    )
    if see_at is None:
        see_at = next(
            (index for index, value in enumerate(values) if SEE_RE.match(value)),
            None,
        )
    if see_at is None:
        raise ValueError(f"{title}: topic has no closing See paragraph")

    first_reference = next(
        (
            index
            for index, value in enumerate(values)
            if REFERENCE_RE.match(value) or REFERENCE_ONLY_RE.match(value)
        ),
        None,
    )
    passage_stop = additional_at if additional_at is not None else see_at
    passages: list[dict[str, str]] = []
    current: dict[str, object] | None = None
    if first_reference is not None:
        for value in values[first_reference:passage_stop]:
            match = REFERENCE_RE.match(value)
            if match:
                if current:
                    passages.append(
                        {
                            "reference": str(current["reference"]),
                            "text": join_wrapped(current["text"]),  # type: ignore[arg-type]
                        }
                    )
                current = {"reference": match.group("reference"), "text": [match.group("text")]}
            elif REFERENCE_ONLY_RE.match(value):
                if current:
                    passages.append(
                        {
                            "reference": str(current["reference"]),
                            "text": join_wrapped(current["text"]),  # type: ignore[arg-type]
                        }
                    )
                current = {"reference": value, "text": []}
            elif current:
                current["text"].append(value)  # type: ignore[union-attr]
        if current:
            passages.append(
                {
                    "reference": str(current["reference"]),
                    "text": join_wrapped(current["text"]),  # type: ignore[arg-type]
                }
            )

    definition_stop = first_reference if first_reference is not None else passage_stop
    definition = join_wrapped(values[:definition_stop])
    additional = ""
    if additional_at is not None:
        additional = join_wrapped(values[additional_at:see_at]).removeprefix(
            "Additional Scripture:"
        ).strip()
    see_end = next(
        (
            index + 1
            for index in range(see_at, len(values))
            if values[index].endswith(".")
        ),
        len(values),
    )
    related_raw = join_wrapped(values[see_at:see_end])
    related_prefix = (
        "See Also:"
        if related_raw.startswith("See Also:")
        else "See also:"
        if related_raw.startswith("See also:")
        else "See"
    )
    related = split_related(related_raw, related_prefix)
    if see_end < len(values):
        definition = join_wrapped([definition, *values[see_end:]])
    markers = list(dict.fromkeys(SOURCE_MARKER_RE.findall(definition)))

    return {
        "id": slugify(title),
        "title": title.title(),
        "sourcePages": source_pages,
        "passages": passages,
        "definition": definition,
        "additionalScripture": additional,
        "seeAlso": related,
        "sourceMarkers": markers,
        "recordType": "topic",
    }


def parse_topics(lines: list[tuple[int, str]], expected_toc_titles: list[str]) -> list[dict]:
    try:
        cursor = next(index for index, (_, value) in enumerate(lines) if value == "ABASING")
    except StopIteration as error:
        raise ValueError("Could not find first topic ABASING") from error

    topics: list[dict] = []
    while cursor < len(lines):
        while cursor < len(lines) and (
            len(lines[cursor][1]) == 1 and lines[cursor][1].isalpha()
        ):
            cursor += 1
        title_start = cursor
        title, body_start = parse_title(lines, title_start)
        end, kind = find_record_end(
            lines, body_start, set(expected_toc_titles), title
        )
        topics.append(parse_topic(title, title_start, body_start, end, kind, lines))
        cursor = end
        if title == "ZION":
            break
    if not topics or topics[-1]["title"].upper() != "ZION":
        raise ValueError("Extraction did not reach the final ZION cross-reference")
    return topics


def toc_titles(pdf: Path) -> list[str]:
    """Extract the independently typeset Table of Contents topic catalog."""
    mutool = shutil.which("mutool")
    assert mutool
    result = subprocess.run(
        [mutool, "draw", "-q", "-F", "txt", str(pdf), "21-27"],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    titles: list[str] = []
    for line in result.stdout.splitlines():
        value = line.strip()
        match = re.match(r"^(?P<title>[A-Z][A-Z0-9 ,’'&\-]+?)\s*\.{3,}\s*\d+\s*$", value)
        if match:
            titles.append(re.sub(r"\s+", " ", match.group("title")).strip())
    return titles


def validate_topics(
    topics: list[dict], expected_toc_titles: list[str], blank_pages: set[int]
) -> dict:
    errors: list[str] = []
    titles = [topic["title"].upper() for topic in topics]
    ids = [topic["id"] for topic in topics]
    if len(topics) < MINIMUM_TOPIC_COUNT:
        errors.append(f"sample-sized output: only {len(topics)} topics")
    duplicate_titles = sorted(title for title, count in Counter(titles).items() if count > 1)
    duplicate_ids = sorted(identifier for identifier, count in Counter(ids).items() if count > 1)
    if duplicate_titles:
        errors.append("duplicate topics: " + ", ".join(duplicate_titles))
    if duplicate_ids:
        errors.append("duplicate topic ids: " + ", ".join(duplicate_ids))
    toc_positions = [titles.index(title) for title in expected_toc_titles if title in titles]
    if toc_positions != sorted(toc_positions):
        errors.append("Table of Contents topics are reordered in body extraction")
    missing_toc = [
        title
        for title in expected_toc_titles
        if title not in titles and title not in KNOWN_TOC_ONLY
    ]
    if missing_toc:
        errors.append("missing Table of Contents topics: " + ", ".join(missing_toc))

    for topic in topics:
        pages = topic["sourcePages"]
        if not topic["title"] or not pages:
            errors.append(f"empty accidental record: {topic['id'] or '(no id)'}")
            continue
        if pages[0] < FIRST_BODY_PAGE or pages[-1] > LAST_BODY_PAGE:
            errors.append(f"{topic['title']}: impossible page range {pages[0]}-{pages[-1]}")
        omitted_pages = [
            page
            for page in range(pages[0], pages[-1] + 1)
            if page not in pages
        ]
        unexplained_pages = [page for page in omitted_pages if page not in blank_pages]
        if unexplained_pages:
            errors.append(
                f"{topic['title']}: unexplained noncontiguous source pages {pages}; "
                f"nonblank gaps {unexplained_pages}"
            )
        if topic["recordType"] == "topic" and not (
            topic["definition"] or topic["passages"] or topic["additionalScripture"]
        ):
            errors.append(f"empty accidental record: {topic['title']}")
        if (
            topic["recordType"] == "cross-reference"
            and len(pages) > 1
            and pages != list(range(pages[0], pages[-1] + 1))
        ):
            errors.append(
                f"{topic['title']}: cross-reference consumed noncontiguous pages {pages}"
            )
        for related in topic["seeAlso"]:
            if re.search(r"\s[A-Z]$", related):
                errors.append(
                    f"{topic['title']}: See Also target consumed section heading {related!r}"
                )
        for field_name, value in (
            ("definition", topic["definition"]),
            ("additionalScripture", topic["additionalScripture"]),
            *((f"passage {passage['reference']}", passage["text"]) for passage in topic["passages"]),
        ):
            if re.search(r"(?:^|\s)[A-Z]$", value):
                errors.append(
                    f"{topic['title']}: {field_name} leaked standalone section heading"
                )
        for passage in topic["passages"]:
            if not REFERENCE_ONLY_RE.fullmatch(passage["reference"]):
                errors.append(
                    f"{topic['title']}: malformed reference {passage['reference']!r}"
                )
            if not passage["text"]:
                errors.append(f"{topic['title']}: empty passage {passage['reference']}")

    wrath = next((topic for topic in topics if topic["id"] == "wrath"), None)
    if not wrath or wrath["sourcePages"][-1] != 1121:
        errors.append("WRATH must end on physical page 1121")

    serialized = compact_json(topics)
    if HEADER_FRAGMENT in serialized:
        errors.append("running header leaked into structured output")
    if errors:
        raise ValueError("Corpus validation failed:\n- " + "\n- ".join(errors))

    return {
        "topicCount": len(topics),
        "crossReferenceCount": sum(t["recordType"] == "cross-reference" for t in topics),
        "passageCount": sum(len(t["passages"]) for t in topics),
        "additionalScriptureCount": sum(bool(t["additionalScripture"]) for t in topics),
        "seeAlsoLinkCount": sum(len(t["seeAlso"]) for t in topics),
        "sourceMarkerCount": sum(len(t["sourceMarkers"]) for t in topics),
    }


def write_outputs(topics: list[dict], source_sha256: str, counts: dict) -> dict:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for stale in OUTPUT.glob("topics-*.json"):
        stale.unlink()

    by_letter: dict[str, list[dict]] = {}
    for topic in topics:
        letter = topic["id"][0].upper()
        by_letter.setdefault(letter, []).append(topic)

    index_topics = []
    payload_sizes: dict[str, int] = {}
    for letter, letter_topics in by_letter.items():
        filename = f"topics-{letter.lower()}.json"
        path = OUTPUT / filename
        path.write_text(compact_json({"letter": letter, "topics": letter_topics}), encoding="utf-8")
        payload_sizes[letter] = path.stat().st_size
        for topic in letter_topics:
            index_topics.append(
                {
                    "id": topic["id"],
                    "title": topic["title"],
                    "letter": letter,
                    "sourcePages": topic["sourcePages"],
                    "recordType": topic["recordType"],
                    "passageCount": len(topic["passages"]),
                    "payload": filename,
                }
            )

    metadata = {
        "schemaVersion": 1,
        "source": SOURCE_TITLE,
        "sourceFile": PDF.name,
        "sourceSha256": source_sha256,
        "physicalPageRange": [FIRST_BODY_PAGE, LAST_BODY_PAGE],
        "printedPageOffset": PRINTED_PAGE_OFFSET,
        "counts": counts,
        "letterDistribution": {letter: len(values) for letter, values in by_letter.items()},
        "topics": index_topics,
    }
    index_path = OUTPUT / "index.json"
    index_path.write_text(compact_json(metadata), encoding="utf-8")

    ambiguities = []
    for topic in topics:
        searchable = " ".join(
            [
                topic["definition"],
                topic["additionalScripture"],
                *(passage["text"] for passage in topic["passages"]),
            ]
        )
        if "{{" in searchable or "y{our" in searchable:
            ambiguities.append(
                {
                    "topicId": topic["id"],
                    "type": "source-text-anomaly",
                    "detail": "Possible stray brace character preserved from the source text.",
                }
            )
    if "NON-IMPOSSIBILITATION OF THE LORD" in toc_titles(PDF):
        ambiguities.append(
            {
                "topicId": None,
                "type": "toc-body-mismatch",
                "detail": (
                    "NON-IMPOSSIBILITATION OF THE LORD appears in the Table of "
                    "Contents and related-topic lists but has no body heading."
                ),
            }
        )
    topic_labels = {topic["title"].upper() for topic in topics}
    unmatched_see_also = sorted(
        {
            related
            for topic in topics
            for related in topic["seeAlso"]
            if related.upper() not in topic_labels
        }
    )
    malformed_see_also = [
        related for related in unmatched_see_also if re.search(r"\s[A-Z]$", related)
    ]
    alias_or_source_mismatch = [
        related for related in unmatched_see_also if related not in malformed_see_also
    ]
    report = {
        "valid": True,
        "sourceSha256": source_sha256,
        "counts": counts,
        "letterDistribution": metadata["letterDistribution"],
        "pageCoverage": {
            "firstPhysicalPage": min(min(t["sourcePages"]) for t in topics),
            "lastPhysicalPage": max(max(t["sourcePages"]) for t in topics),
            "firstPrintedPage": min(min(t["sourcePages"]) for t in topics) - PRINTED_PAGE_OFFSET,
            "lastPrintedPage": max(max(t["sourcePages"]) for t in topics) - PRINTED_PAGE_OFFSET,
            "coveredPhysicalPages": len(
                {page for topic in topics for page in topic["sourcePages"]}
            ),
        },
        "ambiguityCount": len(ambiguities),
        "ambiguities": ambiguities,
        "seeAlsoResolution": {
            "resolvedExactCount": sum(
                related.upper() in topic_labels
                for topic in topics
                for related in topic["seeAlso"]
            ),
            "unmatchedUniqueCount": len(unmatched_see_also),
            "legitimateAliasOrSourceMismatch": alias_or_source_mismatch,
            "malformedExtraction": malformed_see_also,
        },
        "validation": {
            "minimumTopicCount": MINIMUM_TOPIC_COUNT,
            "tocTopicCount": len(toc_titles(PDF)),
            "checks": [
                "missing Table of Contents topics",
                "duplicate titles and ids",
                "alphabetical source order",
                "physical page range bounds and nonblank page-gap provenance",
                "cross-reference noncontiguous page jumps",
                "standalone section-letter leakage in every structured field",
                "See Also targets ending in standalone section letters",
                "WRATH end-page invariant",
                "empty accidental records and passages",
                "Bible reference grammar",
                "sample-sized output",
                "running header leakage",
            ],
        },
        "outputBytes": {
            "index": index_path.stat().st_size,
            "topicPayloads": payload_sizes,
            "topicPayloadsTotal": sum(payload_sizes.values()),
            "qualityReport": 0,
            "generatedTotal": 0,
        },
        "fidelityNotes": [
            "Discretionary line-wrap hyphens are removed; other source wording and punctuation are preserved.",
            "AMPC source markers are retained in definitions and exposed in sourceMarkers.",
            "Cross-reference-only headings omitted from the Table of Contents are retained.",
        ],
    }
    report_path = OUTPUT / "quality-report.json"
    while True:
        serialized_report = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
        report_size = len(serialized_report.encode("utf-8"))
        generated_total = (
            index_path.stat().st_size
            + sum(payload_sizes.values())
            + report_size
        )
        if (
            report["outputBytes"]["qualityReport"] == report_size
            and report["outputBytes"]["generatedTotal"] == generated_total
        ):
            break
        report["outputBytes"]["qualityReport"] = report_size
        report["outputBytes"]["generatedTotal"] = generated_total
    report_path.write_text(serialized_report, encoding="utf-8")
    return report


def validate_generated() -> dict:
    index_path = OUTPUT / "index.json"
    report_path = OUTPUT / "quality-report.json"
    if not index_path.exists() or not report_path.exists():
        raise ValueError("Generated index or quality report is missing")
    index = json.loads(index_path.read_text(encoding="utf-8"))
    topics: list[dict] = []
    seen_payloads = []
    for item in index["topics"]:
        payload = item["payload"]
        if payload not in seen_payloads:
            seen_payloads.append(payload)
            data = json.loads((OUTPUT / payload).read_text(encoding="utf-8"))
            topics.extend(data["topics"])
    actual_sha = hashlib.sha256(PDF.read_bytes()).hexdigest()
    if index["sourceSha256"] != actual_sha:
        raise ValueError("Generated corpus source SHA-256 does not match the current PDF")
    pages = extract_pages(PDF)
    blank_pages = {
        physical_page
        for physical_page, page_records in zip(
            range(FIRST_BODY_PAGE, LAST_BODY_PAGE + 1), pages
        )
        if not page_records
    }
    counts = validate_topics(topics, toc_titles(PDF), blank_pages)
    if counts != index["counts"]:
        raise ValueError("Generated index counts do not match topic payloads")
    return json.loads(report_path.read_text(encoding="utf-8"))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="validate the existing generated files without extracting the PDF",
    )
    arguments = parser.parse_args()
    if arguments.validate_only:
        report = validate_generated()
    else:
        if not PDF.exists():
            raise FileNotFoundError(PDF)
        pages = extract_pages(PDF)
        expected_toc = toc_titles(PDF)
        topics = parse_topics(flatten_pages(pages), expected_toc)
        blank_pages = {
            physical_page
            for physical_page, page_records in zip(
                range(FIRST_BODY_PAGE, LAST_BODY_PAGE + 1), pages
            )
            if not page_records
        }
        counts = validate_topics(topics, expected_toc, blank_pages)
        source_sha256 = hashlib.sha256(PDF.read_bytes()).hexdigest()
        report = write_outputs(topics, source_sha256, counts)
        validate_generated()
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()