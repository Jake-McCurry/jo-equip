---
name: Public-domain commentary sources
description: Which digital sources to use for Matthew Henry, JFB, Barnes, TSK and OpenBible cross references, and their pitfalls.
---
Use CrossWire SWORD modules (MHC, JFB, Barnes, TSK) as the source of record, not helloao.org JSON copies.

**Why:** the helloao copies silently miss whole chapters (JFB Psalm 146 and Mark 15; Matthew Henry Isaiah). The SWORD modules cover every chapter in KJV versification.

**How to apply:**
- Barnes' SWORD module is NT only; no clean public-domain OT Barnes was found. Label it, do not hunt again without reason.
- SWORD zCom modules may be zCom or zCom4 and Barnes uses `.czs/.czv/.czz` names; linked verses (one comment for a range) are empty entries pointing at the previous one.
- Matthew Henry reprints the KJV chapter text as quote paragraphs; drop them.
- Commentary references are free text in many styles (Roman numerals, "Jud" = Judges vs "Jude"); a small number are unparseable, so cap invalid counts per source instead of requiring zero.
- OpenBible `cross_references.txt` is republished regularly, so its pinned digest drifts; update deliberately.
- SWORD index slots for chapter-1 introductions (books after the first in each testament) can point at the previous book's last stored comment (Barnes, TSK). Treat any non-adjacent repeat of the same stored record as borrowed and skip it; the build test rejects one comment appearing under two passages.
- Module reference tags are unreliable: MHC osisRef is often wrong while the printed reference ("Jas. iii. 7") is right; JFB's tagger swallows the next list item into a range ("Nu 15:4-7; 28" → Num.15.4-Num.7.28). Fall back to the printed text, and only when the tag is invalid (MHC) or disagrees with a multi-item display (JFB).
- Book-less refs (bare "28", MHC "ch. i. 14", "xxi. 13") take their book only from a reference they directly continue ("; " / ", " between); otherwise leave unlinked. **Why:** prose names the book ("Joshua, ch. xxiv. 15", "his gospel (ch. i. 14)") and inheriting the last-linked book produced wrong targets in review.
