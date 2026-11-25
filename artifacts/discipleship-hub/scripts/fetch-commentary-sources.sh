#!/usr/bin/env bash
# Downloads the public-domain commentary and cross-reference sources used by
# scripts/generate-commentaries.mjs. Maintenance only; normal builds never run it.
# Usage: bash scripts/fetch-commentary-sources.sh /tmp/commentary-sources
set -euo pipefail
dir="${1:?usage: fetch-commentary-sources.sh <directory>}"
mkdir -p "$dir"

# CrossWire SWORD modules (public domain, KJV versification).
for m in MHC JFB Barnes TSK; do
  curl -fsSL "https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/$m.zip" -o "$dir/$m.zip"
  rm -rf "${dir:?}/$m" && mkdir -p "$dir/$m" && (cd "$dir/$m" && unzip -q "../$m.zip")
done

# OpenBible.info cross references (CC BY), with community votes.
curl -fsSL "https://a.openbible.info/data/cross-references.zip" -o "$dir/cross-references.zip"
(cd "$dir" && unzip -oq cross-references.zip)
echo "done: $dir"
