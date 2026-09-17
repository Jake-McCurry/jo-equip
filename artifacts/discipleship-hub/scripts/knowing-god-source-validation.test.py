#!/usr/bin/env python3
"""Offline boundary and integration checks for primary source KJV citations."""

from __future__ import annotations

import copy
import importlib.util
import json
import unittest
from pathlib import Path


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


if __name__ == "__main__":
    unittest.main()