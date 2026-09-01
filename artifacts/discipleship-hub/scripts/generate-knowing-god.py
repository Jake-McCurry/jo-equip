#!/usr/bin/env python3
"""Extract and validate the complete Knowing God topical concordance."""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import unicodedata
import zlib
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

# Editorial resolutions for printed See/See Also labels that are not exact
# catalog headings. Generated records keep each key verbatim as sourceLabel.
SEE_ALSO_ALIASES = {
    "ANGER, DAY, AND DISPLEASURE . . . OF THE LORD": ["ANGER OF THE LORD", "DAY OF THE LORD", "DISPLEASURE OF THE LORD"],
    "ANGER, DAY, DISPLEASURE AND VENGEANCE . . . OF THE LORD": ["ANGER OF THE LORD", "DAY OF THE LORD", "DISPLEASURE OF THE LORD", "VENGEANCE OF THE LORD"],
    "ANGER, DAY, DISPLEASURE, AND VENGEANCE . . . OF THE LORD": ["ANGER OF THE LORD", "DAY OF THE LORD", "DISPLEASURE OF THE LORD", "VENGEANCE OF THE LORD"],
    "ANGER, DISPLEASURE, AND WEARINESS . . . OF THE LORD": ["ANGER OF THE LORD", "DISPLEASURE OF THE LORD", "WEARINESS OF THE LORD"],
    "ASSURANCE: ATONEMENT": ["ASSURANCE", "ATONEMENT"],
    "ASSURANCE: CERTAIN": ["ASSURANCE", "CERTAIN"],
    "AWESOME, BOWING DOWN TO THE LORD IN WORSHIP": ["AWESOME", "BOWING DOWN TO THE LORD IN WORSHIP"],
    "BLESSEDNESSS": ["BLESSEDNESS"],
    "COVENANT, THE": ["COVENANT, NEW"],
    "CREATORSHIP OF THE LORD": ["CREATORSHIP"],
    "DISCIPLEMAKING": ["DISCIPLE-MAKING"],
    "ENRICHING": ["ENRICHING SPIRITUALLY", "ENRICHING MATERIALLY"],
    "ENRICHING MATERIALY": ["ENRICHING MATERIALLY"],
    "EVERY ATTRIBUTE, QUALITY, AND CHARACTERISTIC OF GOD LISTED IN THIS BOOK!": ["*"],
    "EXECUTING JUDGMENT, JUSTICE AND RIGHTEOUSNESS": ["EXECUTING JUDGMENT, JUSTICE, AND RIGHTEOUSNESS"],
    "EXTOLLING": ["EXTOLLING THE LORD"],
    "GLORIFYING": ["GLORIFYING THE LORD"],
    "GLORIOUS": ["GLORY OF THE LORD"],
    "GLORY OF GOD": ["GLORY OF THE LORD"],
    "GOD THE SPIRIT, INCARNATION OF CHRIST": ["GOD THE SPIRIT", "INCARNATION OF CHRIST"],
    "GOSPEL OF CHRIST": ["GOSPEL, THE"],
    "GRACE": ["GRACE OF THE LORD"],
    "HONORING, LIFTING UP HANDS TO": ["HONORING THE LORD", "LIFTING UP HANDS TO THE LORD"],
    "IMMANENCE OF THE LORD": ["IMMANENCE"],
    "IMPARTING GROWTH": ["GIVING GROWTH", "SPIRITUAL GROWTH"],
    "INCOMPRE-HENSIBLE": ["INCOMPREHENSIBLE"],
    "JOY": ["JOY."],
    "JOY OF THE LORD": ["JOY."],
    "KINDNESS OF THE LORD": ["KINDNESS"],
    "LAWGIVING": ["LAW-GIVING"],
    "LORD CHRIST": ["LORDSHIP OF CHRIST", "JESUS CHRIST"],
    "MARVELOUS, MIGHTY": ["MARVELOUS", "MIGHTY"],
    "MOCKING": ["DERIDING"],
    "NON-IMPOSSIBILITATION OF THE LORD": ["NONIMPOSSIBILITATION OF THE LORD"],
    "PLENTIFUL, PROPAGATION OF THE WORD OF THE LORD": ["PLENTIFUL", "PROPAGATION OF THE WORD OF THE LORD"],
    "PRAYERANSWERING": ["PRAYER-ANSWERING", "ANSWERING PRAYERS"],
    "PROVIDING: REPENTANCE": ["PROVIDING", "REPENTANCE"],
    "SPIRITUALLY": ["SPIRITUAL LIFE", "SPIRITUAL GROWTH"],
    "SPLENDOR OF THE LORD": ["SPLENDOR"],
    "SUPER-ABUNDANT": ["SUPERABUNDANT"],
    "WISDOM OF THE LORD": ["WISDOM"],
    "WRATH OF THE LORD": ["WRATH"],
    "‘I AM’ STATEMENTS": ["‘I AM’ DECLARATIONS"],
}

ADDITIONAL_SCRIPTURE_ALIASES = {
    ("angels", "Luke12:8"): ["Luke 12:8"],
    ("imparting-faith", "Hebrew 4:2"): ["Hebrews 4:2"],
    ("submitting-to-god", "Philemon14"): ["Philemon 14"],
    ("destroying", "Luke 4:34, Acts 13:19"): ["Luke 4:34", "Acts 13:19"],
    ("giving-an-inheritance", "Galatians 3:26, Colossians 1:12"): ["Galatians 3:26", "Colossians 1:12"],
    ("joy", "1 John 1:4 2 John 12."): ["1 John 1:4", "2 John 12"],
    ("judging", "Ezekiel 5:8-10 3"): ["Ezekiel 5:8-10", "Ezekiel 3"],
    ("love-of-the-lord", "Luke 15:4, John 13:23"): ["Luke 15:4", "John 13:23"],
    ("providence", "Genesis 1:1 through Revelation 22:21—all 31, 173 verses of the Bible!"): [
        "Genesis 1:1",
        "Revelation 22:21",
    ],
    ("submitting-to-god", "2 Samuel 3:18:1-4"): ["2 Samuel 3:18", "2 Samuel 4:1-4"],
    ("sufferings-of-christ", "2: 1-9, 13"): ["Job 2:1-9, 13"],
    ("treading", "Amos 4:13 Micah 1:3"): ["Amos 4:13", "Micah 1:3"],
    ("breaking-in-pieces", "51, 58"): ["Jeremiah 51:58"],
    ("calling-of-the-lord", "51:2"): ["Isaiah 51:2"],
    ("charitable", "6:11"): ["1 Timothy 6:11"],
    ("commending", "2 Kings 22:19-25"): ["2 Kings 22:19-20"],
    ("cutting-off", "1 Chronicles 32:21"): ["2 Chronicles 32:21"],
    ("giving-blessings", "17:25"): ["Romans 16:25"],
    ("gold", "Ezekiel 2:8-11"): ["Ezekiel 2:8-3:1"],
    ("granting", "Nehemiah 1:12"): ["Nehemiah 2:1-8"],
    ("heralding", "6:20"): ["2 Corinthians 5:20"],
    ("infinite", "Job 40:28"): ["Job 40"],
    ("joy", "1 Thessalonians 1:16"): ["1 Thessalonians 1:6"],
    ("judging", "15:1,5-8"): ["Revelation 15:1, 5-8"],
    ("law-giving", "8:34-35"): ["Deuteronomy 4:34-35"],
    ("name-of-the-lord", "1 Thessalonians 1:12"): ["2 Thessalonians 1:12"],
    ("obedience-of-christ", "46"): ["John 6:46"],
    ("pure", "4:20"): ["1 Timothy 4:12"],
    ("quickening", "119:25,37,40,88,149"): ["Psalm 119:25, 37, 40, 88, 149"],
    ("slaying", "19:15"): ["Revelation 19:15"],
    ("strengthening", "1 Peter 14:11"): ["1 Peter 4:11"],
    ("testing", "Genesis 22:39"): ["Genesis 22:3-9"],
    ("unaccepting", "16:35"): ["Numbers 16:35"],
    ("warning", "52"): ["Luke 11:52"],
    ("warring", "37"): ["Numbers 26:37"],
    ("will-of-god", "13:21"): ["Colossians 3:13", "Colossians 3:21"],
    ("withholding-rain", "Jeremiah 14:1-3,5-9"): ["Jeremiah 14:1-3, 5-9"],
}

BIBLE_BOOK_NAMES = [
    "Song of Solomon", "1 Chronicles", "2 Chronicles", "1 Corinthians",
    "2 Corinthians", "1 Thessalonians", "2 Thessalonians", "Deuteronomy",
    "Ecclesiastes", "Lamentations", "Philippians", "Colossians", "Revelation",
    "1 Samuel", "2 Samuel", "1 Timothy", "2 Timothy", "1 Peter", "2 Peter",
    "1 John", "2 John", "3 John", "Leviticus", "Numbers", "Nehemiah",
    "Proverbs", "Jeremiah", "Ezekiel", "Zechariah", "Matthew", "Galatians",
    "Ephesians", "Hebrews", "Genesis", "Exodus", "Joshua", "Judges", "Ruth",
    "1 Kings", "2 Kings", "Ezra", "Esther", "Job", "Psalm", "Psalms",
    "Isaiah", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah",
    "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Malachi", "Mark", "Luke",
    "John", "Acts", "Romans", "Titus", "Philemon", "James", "Jude",
]

# Per-chapter KJV verse counts, derived from the MIT-licensed machine-readable
# corpus at https://github.com/aruljohn/Bible-kjv and embedded so corpus
# generation remains deterministic and offline.
BIBLE_VERSE_COUNTS = json.loads(
    zlib.decompress(
        base64.b85decode(
            "c-m!G%aYVa5d0N_vkvN))bfph4P%Tk0i1Af&@S?hVs}QwJiw3ezq>NCde?-*W1(%SyQ;FXvPyqH4Nso$j@x0qxnE9CfB3EBu9Pn3E~hRIT@79C`O96f#S!;*6UHu1d}qXcn7Z1f9{;A;rNE!v<SyDx|EYtS?YJJ!yLCRmj=d0uE+)JX>`Ehn=cR;=iR-pls=31xUTwRBZ4EtaN1h!6pZvTYZt1=4uv04z2zISq3EjXIx%+T7u9<NTI0unTT}eFc?Q&j@c3Lzb>=zMMkPGkU{bjkwGdrC-@i;Py5%=alAkog$6$3#x#0T~wpVFSaZ@Ai<IKi$#QPa|g-Eun3_m&v}hNy{<#TBbwS@+v{_b0sRai{?bOp8#7-zOGXs_tZ<8@Q>oIKdxmrEiRusmyd~q+!O0=qg^Gn5cmZ0jQeQ#O%c++uvn7k}<Gf300-FOly@JgAk4nN!BqfvDjB|Jn$k#B3Y2emWIF=CgdDsqTh+$8I5g4VUUaQF~iDV<>F&*N0N8)v?y2bIT5On{F%t5(VyDA3dW8rd>RW6{a+fRkkG@21R}mc*|8_-0R>?4?B+}i2b7;(&8SE;s4~s8$W=f$%TH#}g5JD0MDS-%CX$|syh~uov;9W5#Gc|Ms0zmwQ9R%7x6`Sml4Jo}5yOl5unIG?InfB=0ZXb|!=oZvzgR8?{C3#(2s$$s6z1d<QmRxLiNC<gg~iB6qG68}h3w@yVeg=q87!bc2F>c#4QgPWPv_<IfHn3FjoFja6Myz%;?<Yk@(^=!!|*9dj;>DUoj4R(J*6R*d4wp0_x{*EUrzoW-32_&`y_psu&0Ffl%x)-E`nlzCYD)HE=SiaAjqPU$k-J>qLBDPLXxijTJF}STF?<`Hr<UXOPYo)R=53XHy}`^ATvR9El<81U<|~O1qK(04dg^FR4<J@wX}*E>@IYct{rEjBy^+XKQ|qvzS>b4VE;JZ&*w)iflWq8%Xq#VELq-H+`<5la8l-VazY`+)w_ovhSvg-4Z&U*M)rro=D-XYl%@Fg6k0PGm__1MMjYZ@rFxTzqRU_&zMQY;ySvMslo(D-T)n-WSJfYd^W}1VT)vT|>|mhwz&!Oh76?_SOIDQt!k61=aSY)Hx3HIJV_-K5Orx#9>QAS6op%maWZ|%RCnsoRdkk1s9ZpVc(or%+;Rf$x>)>q3iLIgcJO&ml$Pl~gxH-wF=Ye%27v#RXI`WZ@&aKM^K6+4P@Z#0HXGzD=Nl0w*U^y;(1sT{SP-_}Xq>QvFaSu|d*xJb09H}s#G@0}agBw-bXyqJ>TuaEWNaa&|3k*B3(i!sz{YLH#SnvdHZr4(VkXkK`<Wz9px#|hCwh{)ffXE)5de4Z6k{sN`E+7gT0Je$J#g4!PA;%+~kT&#+fGg}ig|%cXFP!|wU;|QDCia&I#uuXEip2;3i8QS6oP$z8D&VKnPrJ+PLach{B%ma!No5w52!&3UxSPB&uO>7UQ8b}yUR^#foY!=JOHL$?mvALFEGUm<bQSd>t@oM^$?1`+ynk)vI-E^+wnNkJ$YC<7OTS*euIKgU(xxjGMq&Xb0W-Ls7<d)Hl{Val!CPe<J;=<=6-o}N@%nOym?}FNT6iXRCV*ayL6JGgIM!ufgZJnIL8c%fXM^V2Ura-9cB@MZK^VAvgeYZF3`)noQP`R>Kg&KHw3RV(2<f@;Y#s2M&&kO-m?fhkW+fSV9zr-U7jZ0rzbr%xH*?+6YBysc!aRSy5qSm|1F1#u$8YA{W$%+qlA69*b`M3*At9+Xb37Q6e-U7E<0!@X=gnn*y&V0^$NVXpV@T<$&LyEQUO|}<70RVIn8|TdO9!sSsRx#+d?FwfES!XXy`DeIRaV^F-Fm<5w?ktw{$9U)X&*~{69sI2d)&S*$7?=FO%+D(|2{iZr-MrYhw~(5P<C1yOT{~uk88DcM0#bDD=;1af3^RR1**;DeH6sDtaWNQg}7w&3x+><2T=E!T*6~+^9I|ztw^UrYQi77;^S}#YCf9yER7S*;hygWes|Hkpcc{l=cG6`bj52>^GMLV*MrC!=Pf@{?B)O~qo@gS0uj4|vk)$nu09HKCh2qXn48p1eyky-`EnpwR>IJNZs7mGRJ`nxPg2+igy<_ngHAE9=-{Gk-z{I4duo%UTQhSAt>qKQD1iPm-L}s!pMOLgr25^qcdo@YTNN>m1e*LKO&?ooGyLAe*2{VKI0sjW<NNJ!`(*q5$$R^D5U<^<;Gd~MDTLI0SkDqseSv`gAD5fmd~5~cXoT!6lYJ##W9+0TJ}zH&_C+EIsEn`w^v}N<S*q^"
        )
    )
)


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
            # Preserve Bible ranges split across a visual line (e.g. 38- / 45),
            # while still joining discretionary word hyphens (e.g. Deuter- /
            # onomy).
            result = (
                result + value
                if len(result) > 1 and result[-2].isdigit() and value[0].isdigit()
                else result[:-1] + value
            )
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


def resolve_see_also(topics: list[dict]) -> list[dict]:
    """Attach canonical targets without replacing the source's printed label."""
    by_title = {topic["title"].upper(): topic["id"] for topic in topics}
    worship_terms = {
        title.removesuffix(" THE LORD"): identifier
        for title, identifier in by_title.items()
        if title.endswith(" THE LORD")
    }
    unresolved: set[str] = set()
    for topic in topics:
        resolved = []
        for source_label in topic["seeAlso"]:
            upper = source_label.upper()
            target_titles = SEE_ALSO_ALIASES.get(upper)
            if target_titles is None and upper in by_title:
                target_titles = [upper]
            if target_titles is None and (
                "THE LORD" in upper
                or any(term in upper for term in ("ADORING", "BLESSING", "EXALTING"))
            ):
                target_titles = [
                    title
                    for title in by_title
                    if title.removesuffix(" THE LORD") in worship_terms
                    and re.search(
                        rf"\b{re.escape(title.removesuffix(' THE LORD'))}\b",
                        upper,
                    )
                ]
            target_ids = [
                "*" if title == "*" else by_title[title]
                for title in (target_titles or [])
                if title == "*" or title in by_title
            ]
            target_ids = list(dict.fromkeys(target_ids))
            if not target_ids:
                unresolved.add(source_label)
            resolved.append({"sourceLabel": source_label, "targetIds": target_ids})
        topic["seeAlso"] = resolved
    if unresolved:
        raise ValueError(
            "Unresolved See Also labels after editorial mapping:\n- "
            + "\n- ".join(sorted(unresolved))
        )
    return topics


def valid_scripture_query(query: str, grammar: re.Pattern[str]) -> bool:
    """Validate complete syntax plus canonical KJV chapter and verse bounds."""
    if not grammar.fullmatch(query):
        return False
    book = next(
        (name for name in BIBLE_BOOK_NAMES if query.startswith(f"{name} ")),
        None,
    )
    if not book:
        return False
    counts = BIBLE_VERSE_COUNTS.get("Psalm" if book == "Psalms" else book)
    if not counts:
        return False
    rest = query[len(book) + 1 :]
    verse_context = ":" in rest or len(counts) == 1
    current_chapter = 1 if len(counts) == 1 else None

    def valid_point(chapter: int, verse: int | None = None) -> bool:
        return (
            1 <= chapter <= len(counts)
            and (verse is None or 1 <= verse <= counts[chapter - 1])
        )

    for token in rest.split(", "):
        match = re.fullmatch(r"(\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?", token)
        if not match:
            return False
        first, verse, last, last_verse = (
            int(value) if value is not None else None
            for value in match.groups()
        )
        if verse is not None:
            current_chapter = first
            start = (first, verse)
            if last is None:
                end = start
            elif last_verse is None:
                end = (first, last)
            else:
                end = (last, last_verse)
            if not valid_point(*start) or not valid_point(*end) or end < start:
                return False
        elif verse_context:
            assert current_chapter is not None
            start = (current_chapter, first)
            end = (current_chapter, last if last is not None else first)
            if not valid_point(*start) or not valid_point(*end) or end < start:
                return False
        else:
            end_chapter = last if last is not None else first
            if not valid_point(first) or not valid_point(end_chapter) or end_chapter < first:
                return False
    return True


def resolve_additional_scripture(topics: list[dict]) -> list[dict]:
    """Resolve every printed supplemental citation to a canonical search query."""
    book_pattern = "|".join(re.escape(book) for book in BIBLE_BOOK_NAMES)
    reference_token = r"\d+(?::\d+)?(?:-\d+(?::\d+)?)?"
    valid_query = re.compile(
        rf"^(?:{book_pattern})\s+{reference_token}(?:,\s*{reference_token})*$"
    )
    unresolved: list[str] = []
    for topic in topics:
        sections = []
        for source_value in topic["additionalScripture"]:
            current_book = ""
            links = []
            for raw_part in source_value.split(";"):
                source_label = raw_part.strip()
                if not source_label:
                    continue
                source_book = next(
                    (
                        book
                        for book in BIBLE_BOOK_NAMES
                        if source_label.startswith(f"{book} ")
                    ),
                    None,
                )
                if source_book:
                    current_book = source_book
                aliases = ADDITIONAL_SCRIPTURE_ALIASES.get(
                    (topic["id"], source_label)
                )
                if aliases:
                    queries = aliases
                    if re.search(r"[A-Za-z]", source_label):
                        corrected_context = next(
                            (
                                book
                                for book in BIBLE_BOOK_NAMES
                                if queries[-1].startswith(f"{book} ")
                            ),
                            None,
                        )
                        if corrected_context:
                            current_book = corrected_context
                else:
                    canonical = source_label.removesuffix(".")
                    queries = [
                        canonical
                        if source_book or not current_book
                        else f"{current_book} {canonical}"
                    ]
                for query in queries:
                    if not valid_scripture_query(query, valid_query):
                        unresolved.append(
                            f"{topic['title']}: {source_label!r} -> {query!r}"
                        )
                links.append({"sourceLabel": source_label, "queries": queries})
            sections.append({"sourceValue": source_value, "links": links})
        topic["additionalScripture"] = sections
    if unresolved:
        raise ValueError(
            "Unresolved Additional Scripture references:\n- "
            + "\n- ".join(unresolved)
        )
    return topics


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
            "additionalScripture": [],
            "seeAlso": see_also,
            "sourceMarkers": [],
            "recordType": "cross-reference",
        }

    additional_positions = [
        index
        for index, value in enumerate(values)
        if value.startswith("Additional Scripture:")
    ]
    additional_at = additional_positions[0] if additional_positions else None
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
    passage_values: list[str] = []
    additional: list[str] = []
    if first_reference is not None and additional_positions:
        segment_start = first_reference
        for position, additional_index in enumerate(additional_positions):
            passage_values.extend(values[segment_start:additional_index])
            next_limit = (
                additional_positions[position + 1]
                if position + 1 < len(additional_positions)
                else see_at
            )
            restart = next(
                (
                    index
                    for index in range(additional_index + 1, next_limit - 1)
                    if values[index].startswith("His ")
                    and (
                        REFERENCE_RE.match(values[index + 1])
                        or REFERENCE_ONLY_RE.match(values[index + 1])
                    )
                ),
                None,
            )
            additional_end = restart if restart is not None else next_limit
            source_value = join_wrapped(values[additional_index:additional_end]).removeprefix(
                "Additional Scripture:"
            ).strip()
            if source_value:
                additional.append(source_value)
            segment_start = restart + 1 if restart is not None else next_limit
        passage_values.extend(values[segment_start:see_at])
    elif first_reference is not None:
        passage_values = values[first_reference:passage_stop]

    passages: list[dict[str, str]] = []
    current: dict[str, object] | None = None
    if first_reference is not None:
        for value in passage_values:
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
            if re.search(r"\s[A-Z]$", related["sourceLabel"]):
                errors.append(
                    f"{topic['title']}: See Also target consumed section heading {related['sourceLabel']!r}"
                )
            if not related["targetIds"]:
                errors.append(
                    f"{topic['title']}: unresolved See Also target {related['sourceLabel']!r}"
                )
        for field_name, value in (
            ("definition", topic["definition"]),
            *(
                (f"additionalScripture {index + 1}", section["sourceValue"])
                for index, section in enumerate(topic["additionalScripture"])
            ),
            *((f"passage {passage['reference']}", passage["text"]) for passage in topic["passages"]),
        ):
            if re.search(r"(?:^|\s)[A-Z]$", value):
                errors.append(
                    f"{topic['title']}: {field_name} leaked standalone section heading"
                )
        for additional in (
            section["sourceValue"] for section in topic["additionalScripture"]
        ):
            if (
                len(additional) > 1000
                or "Additional Scripture:" in additional
                or re.search(r"\bHis (?:Teachings|Recorded|Practice)\b", additional)
            ):
                errors.append(
                    f"{topic['title']}: malformed Additional Scripture field"
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
                *(section["sourceValue"] for section in topic["additionalScripture"]),
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
    editorial_resolutions = sorted(
        (
            {
                "sourceLabel": related["sourceLabel"],
                "targetIds": related["targetIds"],
            }
            for topic in topics
            for related in topic["seeAlso"]
            if related["sourceLabel"].upper() not in topic_labels
        ),
        key=lambda item: item["sourceLabel"],
    )
    editorial_resolutions = list(
        {item["sourceLabel"]: item for item in editorial_resolutions}.values()
    )
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
            "resolvedLinkCount": sum(
                len(related["targetIds"])
                for topic in topics
                for related in topic["seeAlso"]
            ),
            "unresolvedCount": 0,
            "editorialResolutions": editorial_resolutions,
        },
        "additionalScriptureResolution": {
            "sourceFieldCount": sum(
                len(topic["additionalScripture"]) for topic in topics
            ),
            "resolvedLinkCount": sum(
                sum(len(link["queries"]) for link in section["links"])
                for topic in topics
                for section in topic["additionalScripture"]
            ),
            "unresolvedCount": 0,
            "editorialResolutions": [
                {"topicId": topic_id, "sourceLabel": source, "queries": targets}
                for (topic_id, source), targets in ADDITIONAL_SCRIPTURE_ALIASES.items()
            ],
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
                "Additional Scripture complete reference grammar and KJV chapter/verse bounds",
                "Additional Scripture field boundaries and embedded headings",
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
        topics = resolve_additional_scripture(
            resolve_see_also(parse_topics(flatten_pages(pages), expected_toc))
        )
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