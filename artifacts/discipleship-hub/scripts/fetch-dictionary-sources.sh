#!/usr/bin/env bash
# Downloads the pinned source for Easton's Bible Dictionary (maintenance only;
# the build never fetches). Usage: bash scripts/fetch-dictionary-sources.sh /tmp/dictionary-sources
set -euo pipefail
out="${1:?Usage: fetch-dictionary-sources.sh <output directory>}"
mkdir -p "$out"
cd "$out"
fetch() { # url file sha256|md5:<digest>
  [ -f "$2" ] || curl -fsSL --retry 3 -o "$2" "$1"
  case "$3" in
    md5:*) echo "${3#md5:}  $2" | md5sum -c - ;;
    *) echo "$3  $2" | sha256sum -c - ;;
  esac
}
# CrossWire SWORD module "Easton" 2.0.1 (CCEL text, public domain).
fetch https://www.crosswire.org/ftpmirror/pub/sword/packages/rawzip/Easton.zip Easton.zip f6dd054554764e2e97d5d189a697eb26039054578a9ccf98ce668ab810341c6e
rm -rf Easton && mkdir Easton && (cd Easton && unzip -q ../Easton.zip)
# Internet Archive OCR of the 1893 first edition (Library of Congress copy), for the spot-check.
fetch https://archive.org/download/illustratedbible00east/illustratedbible00east_djvu.txt illustratedbible00east_djvu.txt md5:f6ba3e308d3295acbad4c22505860f92
