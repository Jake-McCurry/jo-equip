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
