#!/usr/bin/env python3
"""Regression checks for the offline NET corpus validator."""

from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = Path(__file__).with_name("generate-knowing-god-net.py")
SPEC = importlib.util.spec_from_file_location("knowing_god_net", SCRIPT)
assert SPEC and SPEC.loader
GENERATOR = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GENERATOR)


class NetValidationRegressionTests(unittest.TestCase):
    def read_cache(self, book: str) -> list[dict]:
        return json.loads(GENERATOR.cache_path(book).read_text(encoding="utf-8"))

    def test_approved_exception_cannot_hide_an_extra_missing_verse(self) -> None:
        rows = [
            row
            for row in self.read_cache("2 Corinthians")
            if not (row["chapter"] == "13" and row["verse"] == "11")
        ]
        with self.assertRaisesRegex(ValueError, "coverage mismatch"):
            GENERATOR.validate_book_coverage(
                "2 Corinthians", rows, ["2 Corinthians 13:11-14"]
            )

    def test_ordinary_generated_text_mutation_fails_against_raw_corpus(self) -> None:
        reference = "Genesis 1:1"
        manifest = json.loads(
            (GENERATOR.NET_DIR / "manifest.json").read_text(encoding="utf-8")
        )
        filename = manifest["passages"][reference]
        payload = json.loads(
            (GENERATOR.NET_DIR / filename).read_text(encoding="utf-8")
        )
        indexed = GENERATOR.validate_book_coverage(
            "Genesis", self.read_cache("Genesis"), [reference]
        )
        with self.assertRaisesRegex(ValueError, "does not match raw corpus"):
            GENERATOR.validate_generated_passage(
                reference, payload[reference] + " ordinary mutation", indexed
            )

    def test_content_hash_mismatch_fails(self) -> None:
        manifest = json.loads(
            (GENERATOR.NET_DIR / "manifest.json").read_text(encoding="utf-8")
        )
        filename = manifest["passages"]["Genesis 1:1"]
        content = (GENERATOR.NET_DIR / filename).read_bytes()
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            GENERATOR.validate_hashed_payload(filename, content + b"mutation")


if __name__ == "__main__":
    unittest.main()