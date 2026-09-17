#!/usr/bin/env python3
"""Offline boundary and integration checks for primary and supplemental KJV citations."""

from __future__ import annotations

import copy
import importlib.util
import io
import json
import shutil
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("generate-knowing-god.py")
SPEC = importlib.util.spec_from_file_location("knowing_god_source", SCRIPT)
assert SPEC and SPEC.loader
GENERATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GENERATOR)


class PrimaryReferenceTests(unittest.TestCase):
    def test_every_canonical_chapter_boundary(self) -> None:
        counts = GENERATOR.BIBLE_VERSE_COUNTS
        self.assertEqual(len(counts), 66)
        self.assertEqual(sum(map(len, counts.values())), 1189)
        self.assertEqual(sum(sum(chapters) for chapters in counts.values()), 31102)
        for book, chapters in counts.items():
            for chapter, last in enumerate(chapters, 1):
                for verse, expected in ((0, False), (1, True), (last, True), (last + 1, False)):
                    reference = f"{book} {chapter}:{verse}"
                    with self.subTest(reference=reference):
                        self.assertEqual(GENERATOR.valid_primary_reference(reference), expected)
            for chapter in (0, len(chapters) + 1):
                with self.subTest(book=book, chapter=chapter):
                    self.assertFalse(GENERATOR.valid_primary_reference(f"{book} {chapter}:1"))

    def test_ranges_and_whole_chapters(self) -> None:
        for reference in (
            "Mark 4:21-24, 35-41", "Mark 4:21-24,35-41",
            "Mark 4:21-24,   35-41", "Daniel 6:25-28",
            "Psalm 150", "Psalms 149-150", "Psalm 119:1-176",
            "Genesis 1, 50", "Genesis 1:31, 2:1-3",
        ):
            with self.subTest(reference=reference):
                self.assertTrue(GENERATOR.valid_primary_reference(reference))
        for reference in (
            "Mark 4:35-43", "Mark 4:21-24, 35-43", "Daniel 6:25-29",
            "Mark 4:0-1", "Mark 4:42-43", "Mark 4:41-35",
            "Psalm 0", "Psalm 151", "Psalm 149-151", "Psalm 150-149",
            "Genesis 1:31, 2:26", "Genesis 1, 51", "Genesis 1, 2:3",
            "Mark 4:1 trailing text", "NotABook 1:1",
        ):
            with self.subTest(reference=reference):
                self.assertFalse(GENERATOR.valid_primary_reference(reference))

    def test_single_chapter_books_with_and_without_explicit_chapter(self) -> None:
        for book, last in (("Obadiah", 21), ("Philemon", 25), ("2 John", 13), ("3 John", 14), ("Jude", 25)):
            for reference in (f"{book} {last}", f"{book} 1-{last}", f"{book} 1:{last}", f"{book} 1, {last}"):
                with self.subTest(reference=reference):
                    self.assertTrue(GENERATOR.valid_primary_reference(reference))
            for reference in (f"{book} 0", f"{book} {last + 1}", f"{book} 1-{last + 1}", f"{book} 2:1"):
                with self.subTest(reference=reference):
                    self.assertFalse(GENERATOR.valid_primary_reference(reference))

    def test_source_book_aliases_use_kjv_bounds(self) -> None:
        for book, chapter, last in (
            ("I Samuel", 31, 13), ("II Samuel", 24, 25),
            ("I Kings", 22, 53), ("II Kings", 25, 30), ("Kings", 22, 53),
            ("I Chronicles", 29, 30), ("II Chronicles", 36, 23),
            ("Psalm", 150, 6), ("Psalms", 150, 6),
        ):
            with self.subTest(book=book):
                self.assertTrue(GENERATOR.valid_primary_reference(f"{book} {chapter}:{last}"))
                self.assertFalse(GENERATOR.valid_primary_reference(f"{book} {chapter}:{last + 1}"))

    def test_net_numbering_and_omissions_do_not_define_kjv_bounds(self) -> None:
        # KJV 2 Corinthians ends at 13:14; NET ends at 13:13.
        # NET's extra 3 John 15 is not a valid KJV source coordinate.
        for reference in ("2 Corinthians 13:11-14", "Matthew 17:21", "Acts 8:37"):
            with self.subTest(reference=reference):
                self.assertTrue(GENERATOR.valid_primary_reference(reference))
        for reference in ("2 Corinthians 13:15", "3 John 15", "3 John 1:15"):
            with self.subTest(reference=reference):
                self.assertFalse(GENERATOR.valid_primary_reference(reference))


class CorpusValidationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.topics = [
            topic
            for path in sorted(GENERATOR.OUTPUT.glob("topics-*.json"))
            for topic in json.loads(path.read_text(encoding="utf-8"))["topics"]
        ]

    def test_existing_corpus_passes_without_mutation(self) -> None:
        before = copy.deepcopy(self.topics)
        GENERATOR.validate_topics(self.topics, [], None)
        self.assertEqual(self.topics, before)

    def test_failures_include_topic_and_original_reference_without_mutation(self) -> None:
        for reference in ("Mark 4:21-24, 35-43", "Daniel 6:25-29", "II Chronicles 37:1", "Jude 26"):
            topics = copy.deepcopy(self.topics)
            topic = next(item for item in topics if item["passages"])
            topic["passages"][0]["reference"] = reference
            before = copy.deepcopy(topics)
            with self.subTest(reference=reference):
                with self.assertRaises(ValueError) as caught:
                    GENERATOR.validate_topics(topics, [], None)
                message = str(caught.exception)
                for detail in (topic["title"], topic["id"], reference, "canonical KJV", "editorial review"):
                    self.assertIn(detail, message)
                self.assertEqual(topics, before)

    def test_reviewed_supplemental_aliases_pass_without_mutation(self) -> None:
        stored_links = {
            (topic["id"], link["sourceLabel"]): link["queries"]
            for topic in self.topics
            for section in topic["additionalScripture"]
            for link in section["links"]
        }
        for key, queries in GENERATOR.ADDITIONAL_SCRIPTURE_ALIASES.items():
            with self.subTest(alias=key):
                self.assertEqual(stored_links[key], queries)
        before = copy.deepcopy(self.topics)
        GENERATOR.validate_topics(self.topics, [], None)
        self.assertEqual(self.topics, before)

    def test_validate_only_rejects_missing_supplemental_destinations_read_only(self) -> None:
        missing = object()
        cases = (
            ("empty links", "section", "links", [], "links destination list"),
            ("missing links", "section", "links", missing, "links destination list"),
            ("null links", "section", "links", None, "links destination list"),
            ("non-list links", "section", "links", {}, "links destination list"),
            ("invalid link", "section", "links", [None], "citation object"),
            ("empty queries", "link", "queries", [], "queries destination list"),
            ("missing queries", "link", "queries", missing, "queries destination list"),
            ("null queries", "link", "queries", None, "queries destination list"),
            ("non-list queries", "link", "queries", "Colossians 3:21", "queries destination list"),
            ("empty query", "link", "queries", [""], "nonempty query"),
            ("blank query", "link", "queries", [" \t\n"], "nonempty query"),
            ("null query", "link", "queries", [None], "nonempty query"),
            ("empty second query", "link", "queries", ["Colossians 3:21", ""], "nonempty query"),
            ("missing label", "link", "sourceLabel", missing, "sourceLabel"),
            ("empty label", "link", "sourceLabel", "", "sourceLabel"),
            ("blank label", "link", "sourceLabel", " \t\n", "sourceLabel"),
            ("null label", "link", "sourceLabel", None, "sourceLabel"),
        )
        aliases_before = copy.deepcopy(GENERATOR.ADDITIONAL_SCRIPTURE_ALIASES)
        for name, target, field, replacement, diagnostic in cases:
            with self.subTest(case=name), tempfile.TemporaryDirectory() as temporary:
                output = Path(temporary)
                for filename in ("index.json", "quality-report.json"):
                    shutil.copyfile(GENERATOR.OUTPUT / filename, output / filename)
                for path in GENERATOR.OUTPUT.glob("topics-*.json"):
                    shutil.copyfile(path, output / path.name)
                path = output / "topics-w.json"
                payload = json.loads(path.read_text(encoding="utf-8"))
                topic = next(t for t in payload["topics"] if t["id"] == "will-of-god")
                section, link = next(
                    (section, link)
                    for section in topic["additionalScripture"]
                    for link in section["links"]
                    if link["sourceLabel"] == "13:21"
                )
                original_label = link["sourceLabel"]
                record = section if target == "section" else link
                if replacement is missing:
                    del record[field]
                else:
                    record[field] = replacement
                path.write_text(json.dumps(payload), encoding="utf-8")
                before = {p.name: p.read_bytes() for p in output.iterdir()}
                with (
                    patch.object(GENERATOR, "OUTPUT", output),
                    patch.object(
                        GENERATOR, "resolve_additional_scripture",
                        side_effect=AssertionError("Validation must not regenerate aliases"),
                    ),
                    patch("sys.argv", [str(SCRIPT), "--validate-only"]),
                    redirect_stdout(io.StringIO()),
                    self.assertRaises(ValueError) as caught,
                ):
                    GENERATOR.main()
                for detail in (
                    topic["title"], topic["id"], section["sourceValue"],
                    original_label, "Additional Scripture", diagnostic, "editorial review",
                ):
                    self.assertIn(detail, str(caught.exception))
                self.assertEqual(
                    {p.name: p.read_bytes() for p in output.iterdir()}, before
                )
                self.assertEqual(GENERATOR.ADDITIONAL_SCRIPTURE_ALIASES, aliases_before)

    def test_validate_only_checks_saved_supplemental_queries_read_only(self) -> None:
        # Exercise the CLI dispatch on disk copies, including the second query
        # of a split reviewed alias. Never mutate the published corpus fixtures.
        for query in (None, "Colossians 5:1", "Colossians 3:26"):
            with self.subTest(query=query), tempfile.TemporaryDirectory() as temporary:
                output = Path(temporary)
                for filename in ("index.json", "quality-report.json"):
                    shutil.copyfile(GENERATOR.OUTPUT / filename, output / filename)
                for path in GENERATOR.OUTPUT.glob("topics-*.json"):
                    shutil.copyfile(path, output / path.name)
                path = output / "topics-w.json"
                payload = json.loads(path.read_text(encoding="utf-8"))
                topic = next(t for t in payload["topics"] if t["id"] == "will-of-god")
                link = next(
                    link
                    for section in topic["additionalScripture"]
                    for link in section["links"]
                    if link["sourceLabel"] == "13:21"
                )
                if query is not None:
                    link["queries"][1] = query
                    path.write_text(json.dumps(payload), encoding="utf-8")
                before = {p.name: p.read_bytes() for p in output.iterdir()}
                with (
                    patch.object(GENERATOR, "OUTPUT", output),
                    patch("sys.argv", [str(SCRIPT), "--validate-only"]),
                    redirect_stdout(io.StringIO()),
                ):
                    if query is None:
                        GENERATOR.main()
                    else:
                        with self.assertRaises(ValueError) as caught:
                            GENERATOR.main()
                        for detail in (
                            topic["title"], topic["id"], link["sourceLabel"],
                            query, "Additional Scripture", "canonical KJV",
                        ):
                            self.assertIn(detail, str(caught.exception))
                self.assertEqual(
                    {p.name: p.read_bytes() for p in output.iterdir()}, before
                )


if __name__ == "__main__":
    unittest.main()