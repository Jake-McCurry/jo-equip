---
name: Easton dictionary source quirks
description: CrossWire Easton zLD module format and its unreliable scripture links; scan edition used for the spot-check.
---
- The CrossWire "Easton" module (zLD driver, TEI) is read directly by a small zLD reader; no SWORD library is needed.
- Its `osisRef` links are wrong for many bare continuation numbers ("Rev. 1:8, 11" -> Gen.1.11). Rule: trust links whose text names a book (and agrees with it); re-read bare numbers from the previous reference, but keep the module's link when it is in the same book (it handles chapter lists like "12:38; 22; 23-26").
- `<ref target="Easton:KEY">` are "(See X.)" cross-refs; ~9 targets are missing from the module.
- KJV text spells "Ænon" with Æ: word regexes must include Æ/æ or the name silently fails to match.
- No institutional scan of the 1897 3rd edition exists online; the spot-check uses the 1893 1st edition (IA illustratedbible00east). Some entries differ by edition (e.g. Codex Vaticanus absent in 1893).
**Why:** these cost several passes to discover; links looked valid but pointed to Genesis.
**How to apply:** any regeneration or another SWORD lexicon module (e.g. Smith's) should reuse these rules.
