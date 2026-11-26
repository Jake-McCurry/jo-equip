---
name: Bible map sources
description: Source choices and pitfalls for the Bible maps/timeline data generator.
---
- Places/confidence: OpenBible Bible-Geocoding-Data (CC BY 4.0); timeline/events/Easton: Theographic (CC BY-SA 4.0, pin a commit — master moves); base map: Natural Earth (PD). All pinned by commit + SHA-256 in the generator.
- Theographic dates are astronomical years (0 = 1 BC), traditional Ussher chronology; always label "c." and approximate.
- OpenBible `types` contains an internal catch-all "special" — filter it out. Same-name places get slugs like `bethel-1`; never assume the bare name is the slug.
- Base map is referenced via `<use href="basemap.<hash>.svg#bm-base">` with non-scaling strokes; an `<image>` embed scales strokes and looks crude when zoomed.
**Why:** each of these caused a visible bug or test failure during the first build.
**How to apply:** when regenerating map data or changing map rendering.
- Terrain (Nov 2026, user chose "what most Bibles use in their appendices"): hypsometric tints + hillshade rasters from AWS Terrain Tiles, in three zoom tiers; the vector basemap is lines-only on top. Keep the land/sea colors in the rasters, not the SVG.
- The Douglas–Peucker simplifier must handle closed rings (first point = last point); before this was fixed, every lake and island ring silently collapsed and the Dead Sea and Sea of Galilee were missing.
