#!/usr/bin/env python3
"""Acquire and validate the local NET corpus used by Knowing God.

The Bible.org HTTP API accepts a whole-book chapter range (for example,
``Genesis 1-50``).  The generator therefore makes one bounded request per
referenced book instead of one request per passage.  Completed whole-book
responses are retained in scripts/data/net-cache so an interrupted run can
resume without re-downloading earlier books.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "artifacts/discipleship-hub/public/knowing-god/data"
NET_DIR = ROOT / "artifacts/discipleship-hub/public/knowing-god/net"
CACHE_DIR = ROOT / "artifacts/discipleship-hub/scripts/data/net-cache"
MANIFEST = NET_DIR / "manifest.json"
API_URL = "https://labs.bible.org/api/"

# Canonical chapter totals let us use the API's documented whole-book range
# form while still checking that an apparently successful response is complete.
BOOK_CHAPTERS = {
    "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36,
    "Deuteronomy": 34, "Joshua": 24, "Judges": 21, "Ruth": 4,
    "1 Samuel": 31, "2 Samuel": 24, "1 Kings": 22, "2 Kings": 25,
    "1 Chronicles": 29, "2 Chronicles": 36, "Ezra": 10, "Nehemiah": 13,
    "Esther": 10, "Job": 42, "Psalms": 150, "Proverbs": 31,
    "Ecclesiastes": 12, "Song of Solomon": 8, "Isaiah": 66,
    "Jeremiah": 52, "Lamentations": 5, "Ezekiel": 48, "Daniel": 12,
    "Hosea": 14, "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4,
    "Micah": 7, "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3,
    "Haggai": 2, "Zechariah": 14, "Malachi": 4, "Matthew": 28,
    "Mark": 16, "Luke": 24, "John": 21, "Acts": 28, "Romans": 16,
    "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6,
    "Ephesians": 6, "Philippians": 4, "Colossians": 4,
    "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6,
    "2 Timothy": 4, "Titus": 3, "Philemon": 1, "Hebrews": 13,
    "James": 5, "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1,
    "3 John": 1, "Jude": 1, "Revelation": 22,
}

SINGLE_CHAPTER_BOOKS = {"Obadiah", "Philemon", "2 John", "3 John", "Jude"}
REFERENCE_RE = re.compile(
    r"^(.+?)\s+(\d+):(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)$"
)
SINGLE_REFERENCE_RE = re.compile(
    r"^(Obadiah|Philemon|2 John|3 John|Jude)\s+"
    r"(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)$"
)
FILENAME_RE = re.compile(r"^[a-z0-9.-]+\.json$")
BOOK_FILENAME_RE = re.compile(r"^[a-z0-9-]+\.([a-f0-9]{12})\.json$")

# These are the only source references currently known to need narrowly scoped
# handling (traditional numbering, textual omission, or an overlong citation).
# Keep this list exact: a newly missing verse must fail until reviewed.
EXCEPTION_NOTES = {
    "2 Corinthians 13:11-14": "Verse numbering differs here: the source's verse 14 is NET verse 13.",
    "2 Corinthians 13:14": "Verse numbering differs here: the source's verse 14 is NET verse 13.",
    "Acts 15:30-35": "NET omits verse 34 in this textual tradition.",
    "Acts 8:26-38": "NET omits verse 37 in this textual tradition.",
    "Acts 8:26-40": "NET omits verse 37 in this textual tradition.",
    "Acts 8:29-40": "NET omits verse 37 in this textual tradition.",
    "Acts 8:34-40": "NET omits verse 37 in this textual tradition.",
    "John 5:1-15": "NET omits verse 4 in this textual tradition.",
    "John 5:1-16": "NET omits verse 4 in this textual tradition.",
    "John 5:1-18": "NET omits verse 4 in this textual tradition.",
    "John 5:1-9": "NET omits verse 4 in this textual tradition.",
    "Luke 17:22-36": "NET omits verse 36 in this textual tradition.",
    "Luke 17:26-36": "NET omits verse 36 in this textual tradition.",
    "Mark 11:25-26": "NET omits verse 26 in this textual tradition.",
    "Mark 15:1-39": "NET omits verse 28 in this textual tradition.",
    "Mark 7:1-16": "NET omits verse 16 in this textual tradition.",
    "Mark 7:14-23": "NET omits verse 16 in this textual tradition.",
    "Mark 9:42-48": "NET omits verses 44 and 46 in this textual tradition.",
    "Mark 9:42-49": "NET omits verses 44 and 46 in this textual tradition.",
    "Mark 9:43-48": "NET omits verses 44 and 46 in this textual tradition.",
    "Matthew 17:14-21": "NET omits verse 21 in this textual tradition.",
    "Matthew 17:14-23": "NET omits verse 21 in this textual tradition.",
    "Matthew 18:10-14": "NET omits verse 11 in this textual tradition.",
    "Matthew 23:13-36": "NET omits verse 14 in this textual tradition.",
}

# Exact source coordinates permitted to be absent from Bible.org's NET
# response.  Coverage validation compares against this map, rather than
# treating an exception reference as a blanket permission to omit anything.
APPROVED_MISSING = {
    "2 Corinthians 13:11-14": {(13, 14)},
    "2 Corinthians 13:14": {(13, 14)},
    "Acts 15:30-35": {(15, 34)},
    "Acts 8:26-38": {(8, 37)},
    "Acts 8:26-40": {(8, 37)},
    "Acts 8:29-40": {(8, 37)},
    "Acts 8:34-40": {(8, 37)},
    "John 5:1-15": {(5, 4)},
    "John 5:1-16": {(5, 4)},
    "John 5:1-18": {(5, 4)},
    "John 5:1-9": {(5, 4)},
    "Luke 17:22-36": {(17, 36)},
    "Luke 17:26-36": {(17, 36)},
    "Mark 11:25-26": {(11, 26)},
    "Mark 15:1-39": {(15, 28)},
    "Mark 7:1-16": {(7, 16)},
    "Mark 7:14-23": {(7, 16)},
    "Mark 9:42-48": {(9, 44), (9, 46)},
    "Mark 9:42-49": {(9, 44), (9, 46)},
    "Mark 9:43-48": {(9, 44), (9, 46)},
    "Matthew 17:14-21": {(17, 21)},
    "Matthew 17:14-23": {(17, 21)},
    "Matthew 18:10-14": {(18, 11)},
    "Matthew 23:13-36": {(23, 14)},
}

if set(EXCEPTION_NOTES) != set(APPROVED_MISSING):
    raise RuntimeError("Exception notes and approved NET omission coordinates differ")


def compact_json(value: object) -> bytes:
    return (
        json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
        + "\n"
    ).encode("utf-8")


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def canonical_book(book: str) -> str:
    """Map source-PDF spelling quirks to Bible.org's accepted book names."""
    if book == "Kings":
        # The PDF extractor lost the leading 1 in two unambiguous source
        # citations; the accompanying KJV text identifies both as 1 Kings.
        return "1 Kings"
    if book.startswith("II "):
        return "2 " + book[3:]
    if book.startswith("I "):
        return "1 " + book[2:]
    if book == "Psalm":
        return "Psalms"
    return book


def identity_key(book: str) -> str:
    normalized = re.sub(r"[^a-z0-9]", "", book.lower())
    aliases = {
        "psalm": "psalms",
        "songofsolomon": "songofsongs",
        "thesongofsongs": "songofsongs",
        "i": "1",
        "ii": "2",
    }
    return aliases.get(normalized, normalized)


def parse_reference(reference: str) -> tuple[str, list[tuple[int, int, int]]]:
    text = reference.strip().replace("–", "-").replace("—", "-")
    match = REFERENCE_RE.fullmatch(text)
    single = SINGLE_REFERENCE_RE.fullmatch(text)
    if not match and not single:
        raise ValueError(f"Unsupported Scripture reference: {reference}")
    book = match.group(1) if match else single.group(1)
    chapter = int(match.group(2)) if match else 1
    parts = match.group(3) if match else single.group(2)
    ranges: list[tuple[int, int, int]] = []
    for part in parts.split(","):
        bounds = [int(item) for item in part.strip().split("-")]
        start = bounds[0]
        end = bounds[1] if len(bounds) == 2 else start
        if chapter < 1 or start < 1 or end < start:
            raise ValueError(f"Invalid Scripture range: {reference}")
        ranges.append((chapter, start, end))
    api_book = canonical_book(book)
    if api_book not in BOOK_CHAPTERS:
        raise ValueError(f"Unknown NET book in {reference}: {book}")
    if any(chapter_number > BOOK_CHAPTERS[api_book] for chapter_number, _, _ in ranges):
        raise ValueError(f"Chapter is outside {api_book} in {reference}")
    return api_book, ranges


def collect_references() -> tuple[set[str], dict[str, str]]:
    """Return exact source passage references and their canonical book names."""
    references: set[str] = set()
    books: dict[str, str] = {}
    for path in sorted(DATA_DIR.glob("topics-*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for topic in payload.get("topics", []):
            for passage in topic.get("passages", []):
                reference = passage["reference"]
                book, _ = parse_reference(reference)
                references.add(reference)
                books[reference] = book
    if not references:
        raise ValueError(f"No source passages found under {DATA_DIR}")
    return references, books


def request_json(url: str) -> list[dict]:
    request = Request(url, headers={"User-Agent": "JesusOnline-KnowingGod-NET/1.0"})
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            with urlopen(request, timeout=45) as response:
                payload = json.loads(response.read().decode("utf-8"))
            if not isinstance(payload, list) or not payload:
                raise ValueError("Bible.org returned an empty/non-list response")
            return payload
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, ValueError) as error:
            last_error = error
            if attempt < 3:
                time.sleep(0.5 * (2 ** (attempt - 1)))
    raise RuntimeError(f"NET request failed after 3 attempts: {url}: {last_error}")


def validate_book_rows(book: str, rows: list[dict]) -> dict[tuple[str, int, int], str]:
    expected_identity = identity_key(book)
    indexed: dict[tuple[str, int, int], str] = {}
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError(f"{book}: NET row is not an object")
        for key in ("bookname", "chapter", "verse"):
            if not isinstance(row.get(key), str) or not row[key].strip():
                raise ValueError(f"{book}: NET row has invalid {key}")
        if not isinstance(row.get("text"), str):
            raise ValueError(f"{book}: NET row has invalid text")
        row_identity = identity_key(row["bookname"])
        if row_identity != expected_identity:
            raise ValueError(
                f"{book}: NET returned {row['bookname']} instead of the requested book"
            )
        chapter = int(row["chapter"])
        verse = int(row["verse"])
        key = (expected_identity, chapter, verse)
        if key in indexed:
            raise ValueError(f"{book}: NET returned duplicate {chapter}:{verse}")
        indexed[key] = row["text"].strip()
    return indexed


def cache_path(book: str) -> Path:
    return CACHE_DIR / f"{slug(book)}.json"


def get_book_rows(book: str, references: list[str], refresh: bool = False) -> list[dict]:
    path = cache_path(book)
    if path.exists() and not refresh:
        rows = json.loads(path.read_text(encoding="utf-8"))
        validate_book_coverage(book, rows, references)
        return rows
    last_chapter = BOOK_CHAPTERS[book]
    query = f"{book} 1-{last_chapter}"
    url = f"{API_URL}?passage={quote(query)}&type=json&formatting=plain"
    print(f"Fetching NET {query}", flush=True)
    rows = request_json(url)
    # Check referenced coordinates before writing a newly fetched cache file.
    validate_book_coverage(book, rows, references)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(compact_json(rows))
    # Be polite even when a future run requests many uncached books.
    time.sleep(0.2)
    return rows


def missing_coordinates(
    reference: str, indexed: dict[tuple[str, int, int], str]
) -> set[tuple[int, int]]:
    book, ranges = parse_reference(reference)
    identity = identity_key(book)
    missing: set[tuple[int, int]] = set()
    for chapter, start, end in ranges:
        for verse in range(start, end + 1):
            if not indexed.get((identity, chapter, verse), "").strip():
                missing.add((chapter, verse))
    return missing


def validate_book_coverage(
    book: str, rows: list[dict], references: list[str]
) -> dict[tuple[str, int, int], str]:
    """Require every referenced coordinate, except its exact approved set."""
    indexed = validate_book_rows(book, rows)
    for reference in references:
        missing = missing_coordinates(reference, indexed)
        approved = APPROVED_MISSING.get(reference, set())
        if missing != approved:
            raise ValueError(
                f"NET coverage mismatch for {reference}: "
                f"missing={sorted(missing)} approved={sorted(approved)}"
            )
    return indexed


def format_passage(
    reference: str, indexed: dict[tuple[str, int, int], str]
) -> tuple[str, list[int], list[tuple[int, int]]]:
    """Format all present NET verses, returning omitted source verse numbers."""
    book, ranges = parse_reference(reference)
    identity = identity_key(book)
    paragraphs: list[str] = []
    present: list[int] = []
    omitted: list[tuple[int, int]] = []
    first = True
    for range_index, (chapter, start, end) in enumerate(ranges):
        verses: list[str] = []
        for verse in range(start, end + 1):
            key = (identity, chapter, verse)
            if key not in indexed or not indexed[key].strip():
                omitted.append((chapter, verse))
                continue
            text = indexed[key]
            present.append(verse)
            verses.append(text if first else f"{verse} {text}")
            first = False
        if verses:
            paragraphs.append(" ".join(verses))
    return "\n\n".join(paragraphs), present, omitted


def format_alias_passage(
    reference: str, indexed: dict[tuple[str, int, int], str]
) -> tuple[str, list[int], list[tuple[int, int]]]:
    """Apply the one demonstrated NET traditional-verse mapping."""
    if reference != "2 Corinthians 13:14":
        return format_passage(reference, indexed)
    text = indexed.get((identity_key("2 Corinthians"), 13, 13), "").strip()
    if not text:
        return "", [], [(13, 14)]
    return text, [13], [(13, 14)]


def validate_generated_passage(
    reference: str,
    text: str,
    indexed: dict[tuple[str, int, int], str],
) -> tuple[list[int], list[tuple[int, int]]]:
    expected, present, omitted = format_alias_passage(reference, indexed)
    approved = APPROVED_MISSING.get(reference, set())
    if set(omitted) != approved:
        raise ValueError(
            f"NET omission mismatch for {reference}: "
            f"missing={sorted(set(omitted))} approved={sorted(approved)}"
        )
    if text != expected:
        raise ValueError(f"Generated NET text does not match raw corpus for {reference}")
    return present, omitted


def validate_hashed_payload(filename: str, content: bytes) -> None:
    match = BOOK_FILENAME_RE.fullmatch(filename)
    if not match:
        raise ValueError(f"Invalid content-hashed NET filename: {filename}")
    digest = hashlib.sha256(content).hexdigest()[:12]
    if digest != match.group(1):
        raise ValueError(
            f"NET file hash mismatch for {filename}: expected {match.group(1)}, got {digest}"
        )


def expected_issues(
    references: set[str],
    reference_books: dict[str, str],
    book_rows: dict[str, dict[tuple[str, int, int], str]],
) -> list[dict[str, object]]:
    issues: list[dict[str, object]] = []
    for reference in sorted(references):
        text, present, omitted = format_alias_passage(
            reference, book_rows[reference_books[reference]]
        )
        if omitted or not text:
            issues.append({
                "exactReference": reference,
                "presentNetVerses": present,
                "omittedSourceVerses": [verse for _, verse in omitted],
                "note": EXCEPTION_NOTES[reference],
            })
    return issues


def build(refresh: bool = False) -> tuple[int, int]:
    references, reference_books = collect_references()
    books = sorted(set(reference_books.values()), key=lambda value: list(BOOK_CHAPTERS).index(value))
    references_by_book = {
        book: sorted(reference for reference, value in reference_books.items() if value == book)
        for book in books
    }
    book_rows = {
        book: validate_book_coverage(
            book, get_book_rows(book, references_by_book[book], refresh), references_by_book[book]
        )
        for book in books
    }
    files: dict[str, dict[str, str]] = {book: {} for book in books}
    issues: list[dict[str, object]] = []
    for reference in sorted(references):
        book = reference_books[reference]
        text, present, omitted = format_alias_passage(reference, book_rows[book])
        if omitted and reference not in EXCEPTION_NOTES:
            raise ValueError(
                f"NET omitted undocumented verse(s) for {reference}: {omitted}"
            )
        if not text and reference not in EXCEPTION_NOTES:
            raise ValueError(f"NET has no usable text for {reference}")
        files[book][reference] = text
        if omitted or not text:
            issues.append({
                "exactReference": reference,
                "presentNetVerses": present,
                "omittedSourceVerses": [verse for _, verse in omitted],
                "note": EXCEPTION_NOTES[reference],
            })

    generated: dict[str, str] = {}
    for book, passages in files.items():
        content = compact_json(passages)
        digest = hashlib.sha256(content).hexdigest()[:12]
        filename = f"{slug(book)}.{digest}.json"
        generated[book] = filename

    manifest = {
        "schemaVersion": 1,
        "passages": {
            reference: generated[reference_books[reference]]
            for reference in sorted(references)
        },
        "source": {
            "translation": "NET",
            "provider": "Bible.org",
            "url": API_URL,
            "endpoint": "https://labs.bible.org/api/",
            "provenance": "Official NET Bible HTTP API; one whole-book chapter-range response per referenced book",
            "queryFormat": "Book 1-lastChapter&type=json&formatting=plain",
            "cache": "scripts/data/net-cache contains resumable raw whole-book responses",
            "verification": "Verse omissions were cross-checked against the official NET reader chapter resource.",
            "verificationEndpoint": "https://netbible.org/resource/netTexts/{book} {chapter}?bible1Translation=net_strongs2",
            "issueReport": "issues.json",
        },
        "notes": {
            issue["exactReference"]: issue["note"]
            for issue in issues
        },
    }

    temporary = NET_DIR.with_name(f"{NET_DIR.name}.tmp")
    if temporary.exists():
        shutil.rmtree(temporary)
    temporary.mkdir(parents=True)
    for book, passages in files.items():
        temporary.joinpath(generated[book]).write_bytes(compact_json(passages))
    temporary.joinpath("manifest.json").write_bytes(compact_json(manifest))
    temporary.joinpath("issues.json").write_bytes(compact_json({
        "schemaVersion": 1,
        "translation": "NET",
        "issues": issues,
    }))
    NET_DIR.mkdir(parents=True, exist_ok=True)
    for old in NET_DIR.glob("*.json"):
        old.unlink()
    for path in temporary.iterdir():
        path.replace(NET_DIR / path.name)
    temporary.rmdir()
    validate_only()
    return len(references), len(books)


def validate_only() -> tuple[int, int]:
    references, reference_books = collect_references()
    if not MANIFEST.exists():
        raise ValueError(f"Missing NET manifest: {MANIFEST}")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != 1:
        raise ValueError("NET manifest schemaVersion must be 1")
    mapping = manifest.get("passages")
    if not isinstance(mapping, dict) or set(mapping) != references:
        missing = sorted(references - set(mapping or {}))
        extra = sorted(set(mapping or {}) - references)
        raise ValueError(f"NET manifest reference mismatch; missing={missing[:5]} extra={extra[:5]}")
    books = sorted(set(reference_books.values()), key=lambda value: list(BOOK_CHAPTERS).index(value))
    references_by_book = {
        book: sorted(reference for reference, value in reference_books.items() if value == book)
        for book in books
    }
    book_rows = {
        book: validate_book_coverage(
            book,
            json.loads(cache_path(book).read_text(encoding="utf-8"))
            if cache_path(book).exists()
            else [],
            references_by_book[book],
        )
        for book in books
    }

    expected_files = set(mapping.values())
    actual_files = {
        path.name
        for path in NET_DIR.glob("*.json")
        if path.name not in {"manifest.json", "issues.json"}
    }
    if actual_files != expected_files:
        raise ValueError(
            f"NET book file mismatch; missing={sorted(expected_files - actual_files)[:5]} "
            f"extra={sorted(actual_files - expected_files)[:5]}"
        )

    loaded: dict[str, dict] = {}
    expected_refs_by_file: dict[str, set[str]] = {}
    for reference, filename in mapping.items():
        if not isinstance(filename, str) or not FILENAME_RE.fullmatch(filename):
            raise ValueError(f"Invalid NET filename for {reference}: {filename!r}")
        path = NET_DIR / filename
        if not path.exists():
            raise ValueError(f"NET file missing for {reference}: {filename}")
        if filename not in loaded:
            content = path.read_bytes()
            validate_hashed_payload(filename, content)
            payload = json.loads(content.decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError(f"NET book file is not a plain object: {filename}")
            loaded[filename] = payload
        expected_refs_by_file.setdefault(filename, set()).add(reference)
    for filename, payload in loaded.items():
        if set(payload) != expected_refs_by_file[filename]:
            raise ValueError(f"NET book payload reference mismatch: {filename}")

    expected_notes: dict[str, str] = {}
    for reference, filename in mapping.items():
        text = loaded[filename].get(reference)
        if not isinstance(text, str):
            raise ValueError(f"NET text missing for {reference}")
        if not text.strip() and reference not in EXCEPTION_NOTES:
            raise ValueError(f"NET text empty without a manifest note for {reference}")
        book = reference_books[reference]
        _, omitted = validate_generated_passage(reference, text, book_rows[book])
        if omitted or not text:
            expected_notes[reference] = EXCEPTION_NOTES[reference]
    notes = manifest.get("notes") or {}
    if not isinstance(notes, dict):
        raise ValueError("NET manifest notes must be an object")
    if notes != expected_notes:
        raise ValueError("NET manifest notes do not match the approved issue set")

    expected_issue_list = expected_issues(references, reference_books, book_rows)
    issue_path = NET_DIR / "issues.json"
    if not issue_path.exists():
        raise ValueError(f"Missing NET issue report: {issue_path}")
    issue_report = json.loads(issue_path.read_text(encoding="utf-8"))
    if (
        issue_report.get("schemaVersion") != 1
        or issue_report.get("translation") != "NET"
        or issue_report.get("issues") != expected_issue_list
    ):
        raise ValueError("NET issue report does not match raw-corpus validation")
    return len(references), len(loaded)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--refresh", action="store_true", help="Re-fetch cached whole-book responses")
    args = parser.parse_args()
    counts = validate_only() if args.validate_only else build(args.refresh)
    print(f"Validated {counts[0]} NET passages across {counts[1]} book files.")


if __name__ == "__main__":
    main()