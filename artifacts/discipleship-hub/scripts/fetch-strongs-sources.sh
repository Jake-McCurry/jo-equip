#!/usr/bin/env bash
# Downloads the pinned Strong's word-study sources into a scratch directory.
# Usage: bash scripts/fetch-strongs-sources.sh /tmp/strongs-sources
# Then:  node scripts/generate-strongs.mjs /tmp/strongs-sources
# These files are large (about 110 MB) and are intentionally not committed.
set -euo pipefail
dir="${1:?Usage: fetch-strongs-sources.sh <directory>}"
mkdir -p "$dir"
cd "$dir"
OS=https://raw.githubusercontent.com/openscriptures/strongs/0acd2f251c2d35ff8db2dece4e0593979d3ac223
STEP=https://raw.githubusercontent.com/STEPBible/STEPBible-Data/5de0a47f35f0fc13dfe1430d104e5db8a4285f9c/Translators%20Amalgamated%20OT%2BNT
curl -fsSL -o strongs-hebrew-dictionary.js "$OS/hebrew/strongs-hebrew-dictionary.js"
curl -fsSL -o strongs-greek-dictionary.js "$OS/greek/strongs-greek-dictionary.js"
curl -fsSL -o eng-kjv2006_usfm.zip https://ebible.org/Scriptures/eng-kjv2006_usfm.zip
rm -rf kjv && mkdir kjv && unzip -q eng-kjv2006_usfm.zip -d kjv
for name in "TAHOT Gen-Deu" "TAHOT Jos-Est" "TAHOT Job-Sng" "TAHOT Isa-Mal"; do
  curl -fsSL -o "$name.txt" "$STEP/${name// /%20}%20-%20Translators%20Amalgamated%20Hebrew%20OT%20-%20STEPBible.org%20CC%20BY.txt"
done
for name in "TAGNT Mat-Jhn" "TAGNT Act-Rev"; do
  curl -fsSL -o "$name.txt" "$STEP/${name// /%20}%20-%20Translators%20Amalgamated%20Greek%20NT%20-%20STEPBible.org%20CC-BY.txt"
done
sha256sum strongs-*.js eng-kjv2006_usfm.zip ./*.txt
