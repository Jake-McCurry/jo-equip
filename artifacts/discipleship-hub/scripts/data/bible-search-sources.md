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

# Commentary and cross-reference sources (Bible reader)

Data lives in `public/bible-data/commentary/` (about 76 MB, ~3,950 content-hashed
files) and is generated explicitly:
`bash scripts/fetch-commentary-sources.sh /tmp/commentary-sources` then
`node scripts/generate-commentaries.mjs /tmp/commentary-sources`. Sources are not
committed. The generator refuses inputs whose SHA-256 differs from the pinned
digests below, and fails on missing chapters/verses or on more invalid
references than its per-source limit (unparseable source references stay as
plain text). Normal builds validate the committed output with
`scripts/commentary-data.test.mjs` (`pnpm run test:commentary`, part of
`pnpm run build`). Nothing is fetched at runtime.

All CrossWire modules are KJV versification and public domain; downloaded from
`https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/`.

- **Matthew Henry's Commentary on the Whole Bible** (1706–1721): CrossWire `MHC`,
  `MHC.zip` sha256 `6bcb936873ca144e317805e5c1677940fd86e2403f7c14517752e44f25c8882b`.
  Henry's reprinted KJV chapter text is dropped (the reader already shows it).
- **Jamieson-Fausset-Brown** (1871): CrossWire `JFB`,
  `JFB.zip` sha256 `f1e31fdf3281d7e69956341c8a3aa28f65dca77deb6853038f27c3a8e1085d9e`.
- **Barnes' Notes on the New Testament** (1832–1851): CrossWire `Barnes`,
  `Barnes.zip` sha256 `9e8edc0333875c214124371b3862df118ad3a76ade7753cb2faeed3484615baf`.
  **New Testament only**: no clean public-domain digital text of Barnes on the
  Old Testament was found; the reader says so for OT books.
- **Treasury of Scripture Knowledge** (c. 1836): CrossWire `TSK`,
  `TSK.zip` sha256 `6784c7099465995a8e66f02ead82b0bca66603c1bdeaf8332949774b7bfd4293`.
- **OpenBible.info cross references**, CC BY
  (<https://www.openbible.info/labs/cross-references/>), `cross_references.txt`
  sha256 `d548f9ca1c66008f88bc3f175d1a403cd1c9b528fe8fe8460d0ef4592ba5e471`
  (downloaded November 2026). OpenBible republishes this file regularly, so a
  fresh download will not match the pin; review the new file and update the
  digest deliberately. Rows with negative votes are excluded.
- Cross references are merged and de-duplicated: passages in both sources come
  first, then by OpenBible votes, then in TSK order. A range that crosses into
  another book links to its first verse. Previews come from this repository's
  NET/KJV search text (`public/knowing-god/bible-search/`).
- Earlier candidates (helloao.org JSON copies) were rejected because they are
  missing chapters (e.g. JFB Psalm 146, Mark 15; Matthew Henry Isaiah).
