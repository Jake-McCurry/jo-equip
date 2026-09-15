# JO EQUIP brand kit

The authoritative reference is the supplied **Follow Jesus Online Color
Standards · 2026**, retained in
`attached_assets/Color_Palette_1789490902647.pdf` at the workspace root.
Apply this kit to the JO EQUIP website, including Knowing God. Existing book
covers, source manuscripts, and downloadable PDFs are not redesigned by this
website styling work.

## Typography

- **Playfair Display 600–700:** large hero and page titles only.
- **Source Sans 3 400–700:** body text, navigation, buttons, form controls,
  captions, and ordinary section headings.
- Body text is at least 16px; captions and compact metadata are at least 12px.
- Both families are self-hosted WOFF2 assets. Source Sans 3 includes genuine
  italic faces. Their SIL Open Font License files accompany the font assets.
- Use `var(--font-sans)` and `var(--font-display)` rather than hardcoding
  alternate font stacks. Do not restyle original manuscript typography in
  downloadable publications.

## Colors and roles

The complete palette and semantic roles are in `src/styles/brand-tokens.css`.

| Role | Color |
| --- | --- |
| Brand/navigation signal | Blue 500, `#0095FF` |
| Hero fields and dependable actions | Blue 800, `#006BB3` |
| Structure and essential text | Navy, `#003A66` |
| Supporting text | Slate, `#2E5A7A` |
| Reading surface | Warm Paper, `#FFFDFB` |
| Soft panels and normal selected backgrounds | Blue 50, `#E6F5FF` |
| Control boundaries | Border Blue, `#5B9BC4` |
| Decorative orange | Warm 500, `#E87722` |
| Orange buttons with white text | Warm 700, `#C45100` |

Bright blue remains the navigation background. White desktop navigation labels
use 19px/700 Source Sans 3 to satisfy the kit's large-bold text contrast
threshold; the mobile white menu uses navy text. White icons remain appropriate
non-text controls. Focus indicators on the bright-blue header are white so they
remain visible; on light surfaces they use the standard Blue 500.

## Approved exceptions

**Knowing God headlines only:** Use **Georgia Bold (700)** for titles and
headlines within the reading area, matching the book's interior headings
(verified against the PDF's embedded Georgia-Bold text). This is the sole
approved font exception. Keep Source Sans 3 for body/interface text and preserve
the existing navigation fonts. Other JO EQUIP pages retain Playfair Display
for large titles. Georgia uses the reader's installed font, with a standard
serif fallback where unavailable; the PDF's subset fonts are not redistributed.

The Zinzendorf Mission copyright credit is prominent 18px semibold text linked
to `https://www.zmission.org/our-story.html`, on the Knowing God introduction
and the publication-information page.

Knowing God's reading pages feature a **Warm Reading Theme** to provide a quiet, comforting experience for reflective study. While the top navigation maintains the brand's blue and navy colors, the reading surfaces underneath override the default cold variables to warm paper (`#fffaf2`), softly tinted neutral sidebars (`#f3ede2`), and warm, less clinical text colors. 

Knowing God's Translation and Topic selection controls use **Warm 100
`#FFEADB`** for selected options, with navy text. The user explicitly preferred
light orange over gray and approved retaining that choice when adopting the
kit. Do not change these controls to blue simply to enforce the general
selected-state rule.

## Preservation rules

Brand updates change presentation, not content, routes, form destinations, or
Scripture data. The original `/leader-kits` library and the `/lp/leader-kits`
campaign page stay separate. Start Here on Knowing God uses the shared EQUIP
header; every topic reading view uses that same shared EQUIP header and
retains the mobile Topics & filters control. Do not restore a separate compact
topic header.

Zero-passage topics display the book's printed “See…” labels as links in the
main reading area, not merely in a sidebar or below a misleading 0-results
notice. Preserve compound source labels and expose all resolved destinations.