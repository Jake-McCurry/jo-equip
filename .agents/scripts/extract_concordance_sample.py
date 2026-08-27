import json
import re
from pathlib import Path

import pymupdf


PDF_PATH = Path(
    "attached_assets/ZMission-IngramSpark_03-30-26_260826_1787868242072.pdf"
)
OUTPUT_PATH = Path(
    "artifacts/mockup-sandbox/src/components/mockups/knowing-god/sample-data.json"
)
FIRST_PAGE = 29
LAST_PAGE = 50

BOOK = (
    r"(?:Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|"
    r"(?:1|2)\s+Samuel|(?:1|2)\s+Kings|(?:1|2)\s+Chronicles|Ezra|Nehemiah|"
    r"Esther|Job|Psalms?|Proverbs|Ecclesiastes|Song of (?:Songs|Solomon)|"
    r"Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|"
    r"Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|"
    r"Matthew|Mark|Luke|John|Acts|Romans|(?:1|2)\s+Corinthians|Galatians|"
    r"Ephesians|Philippians|Colossians|(?:1|2)\s+Thessalonians|"
    r"(?:1|2)\s+Timothy|Titus|Philemon|Hebrews|James|(?:1|2)\s+Peter|"
    r"(?:1|2|3)\s+John|Jude|Revelation)"
)
REFERENCE_RE = re.compile(
    rf"^(?P<reference>{BOOK}\s+\d{{1,3}}:\d{{1,3}}(?:-\d{{1,3}})?"
    rf"(?:,\s*\d{{1,3}}(?:-\d{{1,3}})?)*)\s+(?P<text>.*)$"
)


def clean_fragment(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def join_fragments(parts: list[str]) -> str:
    result = ""
    for raw in parts:
        part = clean_fragment(raw)
        if not part:
            continue
        if result.endswith("-") and part[0].isalpha():
            result = result[:-1] + part
        elif result.endswith("-") and part[0].isdigit():
            result = result + part
        else:
            result = f"{result} {part}".strip()
    return result


def page_lines(page: pymupdf.Page) -> list[dict]:
    lines = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            spans = [span for span in line.get("spans", []) if span["text"].strip()]
            if not spans:
                continue
            x0, y0, x1, y1 = line["bbox"]
            if y0 < 46 or y1 > 752:
                continue
            text = clean_fragment("".join(span["text"] for span in spans))
            if not text or re.fullmatch(r"[A-Z]?\s*\d+", text):
                continue
            lines.append(
                {
                    "text": text,
                    "x0": x0,
                    "y0": y0,
                    "size": max(span["size"] for span in spans),
                    "font": " ".join(span["font"] for span in spans),
                    "bold_start": "Bold" in spans[0]["font"],
                }
            )

    # Read the left column top-to-bottom, followed by the right column.
    return sorted(lines, key=lambda line: (0 if line["x0"] < 306 else 1, line["y0"], line["x0"]))


def is_topic_heading(line: dict) -> bool:
    text = line["text"]
    return (
        12.5 <= line["size"] <= 24
        and "Bold" in line["font"]
        and text.upper() == text
        and bool(re.search(r"[A-Z]", text))
        and len(text) <= 80
    )


def finalize_topic(topic: dict | None) -> dict | None:
    if not topic:
        return None
    definition = join_fragments(topic.pop("_definition"))
    if not topic["passages"] and re.match(r"^See\s*", definition, re.IGNORECASE):
        topic["_see_also"].append(re.sub(r"^See\s*", "", definition, flags=re.IGNORECASE))
        definition = ""
    topic["definition"] = definition
    for passage in topic["passages"]:
        passage["text"] = join_fragments(passage.pop("_text"))
    topic["additionalScripture"] = join_fragments(topic.pop("_additional"))
    see_also = join_fragments(topic.pop("_see_also"))
    topic["seeAlso"] = [
        value.strip().title()
        for value in re.split(r";", see_also.rstrip("."))
        if value.strip()
    ]
    return topic


def extract() -> list[dict]:
    document = pymupdf.open(PDF_PATH)
    topics = []
    current = None
    state = "definition"

    for page_number in range(FIRST_PAGE, LAST_PAGE + 1):
        lines = page_lines(document[page_number - 1])
        index = 0
        while index < len(lines):
            line = lines[index]
            text = line["text"]

            if is_topic_heading(line):
                heading_parts = [text]
                while index + 1 < len(lines) and is_topic_heading(lines[index + 1]):
                    next_line = lines[index + 1]
                    same_column = (next_line["x0"] < 306) == (line["x0"] < 306)
                    if not same_column or not 0 < next_line["y0"] - line["y0"] < 35:
                        break
                    heading_parts.append(next_line["text"])
                    line = next_line
                    index += 1

                finished = finalize_topic(current)
                if finished:
                    topics.append(finished)
                current = {
                    "title": " ".join(heading_parts).title(),
                    "sourcePages": [page_number],
                    "_definition": [],
                    "passages": [],
                    "_additional": [],
                    "_see_also": [],
                }
                state = "definition"
                index += 1
                continue

            if current is None:
                index += 1
                continue

            if page_number not in current["sourcePages"]:
                current["sourcePages"].append(page_number)

            if text.startswith("Additional Scripture:"):
                state = "additional"
                current["_additional"].append(text.removeprefix("Additional Scripture:"))
            elif text.startswith("See Also:"):
                state = "see_also"
                current["_see_also"].append(text.removeprefix("See Also:"))
            else:
                match = REFERENCE_RE.match(text)
                if match and line["bold_start"]:
                    state = "passage"
                    current["passages"].append(
                        {
                            "reference": match.group("reference"),
                            "_text": [match.group("text")],
                        }
                    )
                elif state == "definition":
                    current["_definition"].append(text)
                elif state == "passage" and current["passages"]:
                    current["passages"][-1]["_text"].append(text)
                elif state == "additional":
                    current["_additional"].append(text)
                elif state == "see_also":
                    current["_see_also"].append(text)
            index += 1

    finished = finalize_topic(current)
    if finished:
        topics.append(finished)
    return topics


def main() -> None:
    topics = extract()
    payload = {
        "source": "Knowing God: Topical Bible Verses on the Nature and Character of the Almighty",
        "samplePages": {"first": FIRST_PAGE, "last": LAST_PAGE},
        "topics": topics,
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
    print(
        f"Wrote {len(topics)} topics and "
        f"{sum(len(topic['passages']) for topic in topics)} primary passages "
        f"to {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()