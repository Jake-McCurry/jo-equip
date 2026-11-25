# Full-Bible search sources

The full-Bible index is separate from Knowing God's curated source corpus.
Generate explicitly with `node scripts/generate-bible-search.mjs /path/to/en_kjv.json`.
Normal builds do not fetch or regenerate Scripture.

- **NET:** retained official whole-book responses from `https://labs.bible.org/api/`
  in `scripts/data/net-cache`. Hosting permission is confirmed for this project.
  Required publisher attribution is in the manifest and linked in the results.
- **KJV:** `https://github.com/thiagobodruk/bible/blob/master/json/en_kjv.json`.
  Public-domain translation. The generator preserves source wording.
- Every source book's SHA-256 digest is recorded in the manifest. Every output
  book filename includes a content hash. All 66 books and every expected
  coordinate are checked before publishing the manifest.
- NET contains 31,085 nonempty verses; KJV contains 31,102. The 17 reviewed
  differences are recorded in the manifest's omissions map. They are not filled
  with text from another translation. NET combines traditional 2 Corinthians
  13:12–13 and puts the benediction at 13:13; this source includes 3 John 1:15
  wording within 1:14.
- Luke 23:17 was confirmed absent from the official NET response for
  Luke 23:16–18 during this implementation.

The manifest records serialized UTF-8 bytes and the sum of individually gzip
compressed book payloads. These are payload measurements, not a guarantee that
the hosting server enables compression. The manifest and HTTP headers are
additional overhead. Search timing tests measure preloaded Node execution on
the development server; they do not measure mobile device performance or
network/loading/indexing time.

# Strong's word-study sources (Bible reader)

Word-study data lives in `public/bible-data/strongs/` and is generated explicitly:
`bash scripts/fetch-strongs-sources.sh /tmp/strongs-sources` then
`node scripts/generate-strongs.mjs /tmp/strongs-sources`. The ~110 MB source files
are not committed. The generator refuses inputs whose SHA-256 differs from the
pinned digests; review any new release before updating them. Nothing is fetched
at runtime, and normal builds only validate the committed output
(`scripts/strongs-data.test.mjs`, run by `pnpm run build`).

- **Strong's dictionaries:** James Strong (1890), public domain. Digital edition
  by Open Scriptures, `openscriptures/strongs` at commit `0acd2f25`, CC BY-SA.
  The lexicon files derived from it are shared under the same license.
- **Original-language words, transliterations, glosses, part of speech:**
  STEPBible.org TAHOT (Hebrew OT) and TAGNT (Greek NT), `STEPBible/STEPBible-Data`
  at commit `5de0a47f`, CC BY 4.0. LXX-reconstructed additions ("X" lines) and
  empty Qere placeholders are omitted. TAGNT words in neither NA28 nor the
  Textus Receptus are omitted; words in only one are labeled in the reader.
  STEP uses NRSV numbering; TAGNT's bracketed KJV coordinates are used where they
  differ. Psalm titles (STEP verse 0) are shown as a "Psalm title" group on verse 1.
  Hebrew cantillation accents are removed from displayed words; vowel points stay.
- **KJV Strong's tags:** eBible.org `eng-kjv2006` USFM (public domain; KJV 1769
  with Strong's numbers). Used only to make KJV words tappable and to count KJV
  renderings. The reader still displays its existing KJV text; tags are matched
  to it word by word and unmatched tags are skipped. The build requires at least
  99.5% of tags to match the repository's KJV text (currently 99.97%).
- NET text is never tagged or altered; NET readers use the verse-level word list.
- Numbers H9001 and above are STEPBible's grammatical numbers (prefixes and
  suffixes), not Strong's numbers; their entries show STEPBible's short gloss.
