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

# Bible maps and timeline sources

Pages: `/bible/maps`, `/bible/maps/<place>`, `/bible/timeline`, and the Places
tab in the Bible reader. Runtime data lives in `public/bible-data/maps/` (three
content-hashed files: place index, chapter→places index, base-map SVG);
build-time page data and the hash manifest live in `src/data/bible-maps/`.
Generated explicitly: `bash scripts/fetch-map-sources.sh /tmp/map-sources` then
`node scripts/generate-bible-maps.mjs /tmp/map-sources`. Every download URL is
pinned to a commit and the generator refuses inputs whose SHA-256 differs from
its pinned digests. Sources are not committed. `scripts/bible-maps-data.test.mjs`
(`pnpm run test:maps`, part of `pnpm run build`) validates the committed output
against KJV versification. The shaded-relief terrain images under the maps are
pre-rendered by a separate maintenance step (below) and hosted locally; no map
tiles, satellite imagery or map services are used at runtime.

- **OpenBible.info Bible Geocoding Data**, CC BY 4.0
  (<https://github.com/openbibleinfo/Bible-Geocoding-Data>, commit
  `7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f`): `data/ancient.jsonl` sha256
  `b8187aa4737e8517ccc090f765d2be11da4c548cd2a59d3cdcb62e952cb8c0f2`.
  Places, verses, coordinates and confidence. The confidence shown is the
  score (0–1000) of the best identification under current scholarship
  (`time_total`, adjusted by the resolution's `best_time_score`): 700+ high,
  300–699 moderate, below 300 low, none = location unknown. Up to five other
  identifications with a positive score are kept as "other proposed
  locations". 57 entries with no verses (deuterocanonical-only places) are
  skipped.
- **Theographic Bible Metadata** by Robert Rouse, CC BY-SA 4.0
  (<https://github.com/robertrouse/theographic-bible-metadata>, commit
  `a22047fe54aa5621f573d99222a82efb62741193`; the master branch changes, so the
  commit pin matters): `json/events.json` sha256
  `e21729678280c55455603a47df816656be9db75c5870c61fede0eb054f4c6c26`,
  `json/people.json` `09b0a77f89c08196f5326bdad70d4bcbb1b9c7b0a770d521de470d24c63b9d83`,
  `json/places.json` `cea8f1b960bc0d643b9e574cf888a3061c5e6cd628b29164770cbdf71ca304c6`,
  `json/verses.json` `f4dc7cadeabf72ffa83499394cdfb9058e274441ecf3b577c69c550f8cdc2c05`.
  Timeline events, participants, event locations (joined to OpenBible places by
  their OpenBible id). Dates are astronomical years in the traditional,
  largely Ussher chronology (Creation = −4003, i.e. 4004 BC); every page labels
  them approximate and traditional. The eras on the timeline page are our own
  grouping, anchored to Theographic events. Because of the share-alike
  license, pages using this data say the adapted data is shared under CC BY-SA.
- **Easton's Bible Dictionary** (M. G. Easton, 1897, public domain), as included
  in Theographic `places.json` (`dictText`). Its markdown scripture links are
  converted to reader links (KJV); unresolvable links stay as plain text.
- **Natural Earth** 1:10m physical vectors, public domain
  (<https://github.com/nvkelso/natural-earth-vector>, commit
  `ca96624a56bd078437bca8184e78163e5039ad19`): `ne_10m_land.geojson` sha256
  `1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416`,
  `ne_10m_lakes.geojson` `2d036f53dedec578001c5c30c2959ee7d4eebc1306900fa4367c49929ec8f2d9`,
  `ne_10m_rivers_lake_centerlines.geojson`
  `bb854a900ecbd3b408df46d5e16e3e0f974ba55993f9d8b5c26e855273c0905a`.
  Clipped to 10°W–70°E, 5°N–48°N, simplified (Douglas–Peucker, ~1 km) and drawn
  in an equirectangular projection scaled for 32°N; the same projection
  (`src/components/bible-maps/map-projection.ts`) places the markers. The map
  shows modern coastlines and rivers, not ancient ones.
- **Terrain Tiles on AWS** (<https://registry.opendata.aws/terrain-tiles/>,
  Mapzen "terrarium" elevation PNGs), built from public-domain SRTM (NASA/USGS),
  GMTED2010 (USGS) and ETOPO1 (NOAA) data, plus EU-DEM (Copernicus, attribution
  required: "produced using Copernicus data and information funded by the
  European Union"). Generated explicitly: `node scripts/fetch-terrain-tiles.mjs
  /tmp/terrain-tiles`, then `node scripts/generate-map-terrain.mjs
  /tmp/terrain-tiles /tmp/map-sources` (the Natural Earth land file is the
  land/sea mask). The tiles read (shared with the Bible Atlas below) are pinned by SHA-256 in
  `scripts/data/terrain-tiles.json`; after a reviewed re-download, `--pin`
  rewrites the pins. Output: three WebP images in
  `public/bible-data/maps-terrain/` (whole map at zoom-5 detail; eastern
  Mediterranean to Mesopotamia at zoom 7; the Holy Land at zoom 9), placed by
  `src/data/bible-maps/terrain.json`. Colors are classic Bible-atlas
  hypsometric tints (green lowlands to brown highlands) with north-west
  hill shading; the finer images load only once the map is zoomed in.
- **Bible Atlas** (`/bible/atlas`): 14 printable study-Bible-style maps defined
  in `scripts/data/bible-atlas-maps.mjs` (places by OpenBible.info slug, routes
  with the verse for each stop, region labels and notes). Rendered explicitly:
  `node scripts/fetch-terrain-tiles.mjs /tmp/terrain-tiles`, `bash
  scripts/fetch-map-sources.sh /tmp/map-sources`, `bash
  scripts/fetch-atlas-fonts.sh /tmp/atlas-fonts` (Source Sans 3 TTF, SIL Open
  Font License, release 3.052R, zip pinned by SHA-256), then `node
  scripts/generate-bible-atlas.mjs /tmp/terrain-tiles /tmp/map-sources
  /tmp/atlas-fonts`. Each map uses the same terrain tiles and relief colors as
  the interactive map, at up to zoom 12 (Sea of Galilee), with a flat sea
  color (some tiles lack bathymetry), corrupt tile rows re-interpolated, and the
  Sea of Galilee traced from its flat water surface in the elevation data on the
  close-up map. Coastlines, lakes and rivers are Natural Earth. Output:
  content-hashed full, half-size and thumbnail WebP plus a print JPEG per map in
  `public/bible-data/atlas/`, and page data in `src/data/bible-atlas/atlas.json`;
  `scripts/bible-atlas-data.test.mjs` (in `test:maps`) checks hashes, verse
  references and place links. Routes Scripture does not fix (the Exodus, the
  return from exile) are drawn dashed and labeled as one proposal; tribal and
  kingdom areas are labels only, with no borders.

# Classic sermon sources (Bible reader Sermons tab, /bible/sermons)

## C. H. Spurgeon

| Source | Use | License | Pinned |
| --- | --- | --- | --- |
| C. H. Spurgeon, *New Park Street Pulpit* (vols 1–6, 1855–1860) and *Metropolitan Tabernacle Pulpit* (vols 7–63) | Sermon text | Public domain | — |
| [lyteword/chspurgeon-sermons](https://github.com/lyteword/chspurgeon-sermons) | Markdown transcription (3,534 sermons) | CC0 1.0 | commit `eeec6efe01edb6b80ef43a2e90aee2b816e018a9`, tarball sha256 `6f45da64d5390c38083d55fd8f5adb7785cb887af33b2fdfca08cf71b1ed013b` |
| Internet Archive scans of 19th-century printings (64 items, listed in `scripts/data/sermon-scan-sources.json`) | OCR text used **only to verify wording**; never published | Scans of public-domain books | md5 of each `_djvu.txt` file |

**Why verification is needed.** The CC0 transcription descends from a modern commercial edition (the Ages Software "C. H. Spurgeon Collection"; its credit line is stripped). Many sermons in that edition, especially in later volumes, were modernized: pronouns for God capitalized, "ye"/"thee"/"hath" replaced, and King James quotations reworded. The ministry chose to publish **only sermons whose wording matches an original printing**.

**Method** (`scripts/verify-sermons.py`, standard library only, ~10 minutes):
1. Sampled, case-sensitive 5-word shingles find candidate scans for each sermon (≥ 50% of its sampled shingles).
2. Each sermon is aligned word by word with up to four candidate scans; differences are classified as case-only, archaic-word replacements, OCR noise or other.
3. Verified when, against the best scan, ≥ 75% of words align exactly, ≤ 4 case differences per 1,000 words and ≤ 1 archaic replacement per 1,000 words. Case differences are clearly bimodal (faithful sermons ≤ 4/1000, modernized ≥ 9/1000).
4. Preaching dates are read from the scan's heading ("Delivered on Lord's Day Morning, …"). `generate-sermons.mjs` keeps a date only when its weekday matches the printed service (or is a Sunday/Thursday when the service is unreadable); otherwise the page shows the volume's publication year.

Result (Nov 2026): 281 of 3,534 verified; 713 rejected as modernized; 2,538 had no matching scan among the institutional Internet Archive items (uploader-made PDFs of the modern edition were excluded). Remaining differences in verified sermons are OCR errors, running heads and some Americanized spellings ("honor"), which pages disclose.

**Text references.** The generator parses each sermon's reference line, applies four documented corrections (wrong verse numbers in the transcription, checked against the scans), and requires the quoted text to match the cited KJV verses (≥ 80% of words in order, against the site's own KJV files). The build test `scripts/sermons-data.test.mjs` repeats this check.

## John Wesley

| Source | Use | License | Pinned |
| --- | --- | --- | --- |
| John Wesley, *Sermons on Several Occasions* (Sermons I–LIII), in *The Works of the Rev. John Wesley, M.A.* (Bristol: William Pine, 1771), vols 1–4 | Sermon text | Public domain | — |
| Project Gutenberg eBooks #59743, #63452, #63909, #68320 (Distributed Proofreaders transcriptions of those four volumes) | Plain-text transcription | Public domain in the USA (Gutenberg licence covers only the trademark) | sha256 of each `-0.txt` in `scripts/data/wesley-sources.json` |
| Internet Archive scans of the same 1771 volumes, Duke University Libraries (`worksofrevjohnwe1wesl` … `4wesl`) | OCR text used **only to verify wording**; never published | Scans of public-domain books | md5 of each `_djvu.txt` file |

**Why this edition.** Moody's printed books are mostly addresses without a single text, and no clean public-domain transcription of Edwards' sermons with an institutional scan of the original printing was found. Wesley's 53 standard sermons have a careful transcription of the 1771 printing and scans of that printing. gutenberg.org often refuses scripted downloads, so the fetch script uses its official mirrors (pglaf.org, xmission), which serve byte-identical files.

**Method** (`scripts/verify-wesley-sermons.py`): each sermon (from its last "SERMON n." heading to the next) is aligned word by word with the OCR of the same volume, with lowercase "s" folded to "f" on both sides because OCR reads the long s as "f". Same criteria as Spurgeon (≥ 75% aligned, ≤ 4 case and ≤ 1 archaic differences per 1,000 words); differences at the very start and end of the alignment window are neighbouring text and are ignored. Result: 52 of 53 verified (91–95% aligned). Sermon XLIX ("The Cure of Evil-Speaking") is not published: the Duke copy of volume 4 lacks pages 35–39, and the only other scans are the 1760 printing (which capitalizes nouns, so it cannot confirm the 1771 wording) and a 20th-century reprint.

**Generation** (`scripts/lib/wesley-sermons.mjs`): titles are the printed headings, title-cased; five sermons printed without a title (III, VII, XLVII, LII, LIII) use the titles later editions give them, and the page says so. Sermon III was preached by Charles Wesley (noted on the page). The note printed with a sermon about where it was preached is shown as its occasion, and a date in it as the preaching date, as printed (Old Style before 1752). Footnotes are renumbered per sermon and listed under "Notes". The transcribers' correction notes (lines starting ♦/♠) are dropped; their corrections stay. Wesley's asterisks, marking passages he thought most important, are kept and explained on the page. One reference correction: Sermon XLI prints "2 Cor. x. 4" but quotes verse 5. Sermon LII quotes Psalm 94:16 from the Prayer Book Psalter, so its KJV agreement floor is 0.7 and the page names the Psalter. The generator refuses any sermon whose word count differs from the verified count.

**Regenerate:**
```
bash scripts/fetch-sermon-sources.sh /tmp/sermon-sources
python3 scripts/verify-sermons.py /tmp/sermon-sources          # writes scripts/data/sermon-verification.json
python3 scripts/verify-wesley-sermons.py /tmp/sermon-sources   # writes scripts/data/wesley-verification.json
node scripts/generate-sermons.mjs /tmp/sermon-sources          # writes src/data/sermons/ and public/bible-data/sermons/
```
To publish more Spurgeon sermons, add institutional scans of further volumes to `sermon-scan-sources.json` (id, file, md5 from the item's metadata) and re-run all the steps.
