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
