#!/usr/bin/env bash
# Downloads Source Sans 3 (SIL Open Font License) as TTF for drawing the labels
# on the Bible Atlas images (scripts/generate-bible-atlas.mjs). The site itself
# uses the bundled web fonts; this copy is only needed when regenerating maps.
# Usage: bash scripts/fetch-atlas-fonts.sh /tmp/atlas-fonts
set -euo pipefail
dir="${1:?usage: fetch-atlas-fonts.sh <directory>}"
mkdir -p "$dir"
curl -fsSL -o "$dir/ss3.zip" https://github.com/adobe-fonts/source-sans/releases/download/3.052R/TTF-source-sans-3.052R.zip
echo "1b0dd1ec44b39f1dd98bbd153a1a3815f083639874ddee02c842bd601bad3d21  $dir/ss3.zip" | sha256sum -c -
unzip -o -q "$dir/ss3.zip" -d "$dir"
echo "done: $dir"
