#!/usr/bin/env bash
# Downloads the openly licensed map and timeline sources used by
# scripts/generate-bible-maps.mjs. Maintenance only; normal builds never run it.
# All URLs are pinned to commits so the digests in the generator stay valid.
# Usage: bash scripts/fetch-map-sources.sh /tmp/map-sources
set -euo pipefail
dir="${1:?usage: fetch-map-sources.sh <directory>}"
mkdir -p "$dir"

# OpenBible.info Bible Geocoding Data (CC BY 4.0).
OB=https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/7eb18a5ee62f27b9b93bd6689ea272d76dd23b8f
curl -fsSL "$OB/data/ancient.jsonl" -o "$dir/ob-ancient.jsonl"

# Theographic Bible Metadata (CC BY-SA 4.0).
TG=https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/a22047fe54aa5621f573d99222a82efb62741193/json
for f in places events people verses; do curl -fsSL "$TG/$f.json" -o "$dir/tg-$f.json"; done

# Natural Earth 1:10m physical vectors (public domain).
NE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/ca96624a56bd078437bca8184e78163e5039ad19/geojson
for f in ne_10m_land ne_10m_lakes ne_10m_rivers_lake_centerlines; do curl -fsSL "$NE/$f.geojson" -o "$dir/$f.geojson"; done
echo "done: $dir"
