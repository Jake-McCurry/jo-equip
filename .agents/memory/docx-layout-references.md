---
name: Word layout references
description: Interpreting mixed screenshots and editable textboxes in supplied mobile page designs.
---

When a Word document is the visual specification for a page, inspect its drawing fills and run formatting as well as its embedded images. Deduplicate alternate/fallback textbox text.

**Why:** Plain-text extraction and an image contact sheet can omit the hero background and reverse the apparent heading hierarchy. Some reference sections are editable shapes, not screenshots.

**How to apply:** Confirm shape colors, heading emphasis, paragraph alignment, and image order before implementation. Render the result as accessible HTML; do not substitute generic site styling for the supplied reference.

## Leader Kit landing-page exception

Keep the five-minute-flow section in the site's brand typography, with moderate spacing rather than literal Word spacing.

**Why:** The user explicitly corrected the earlier request to copy the reference font and rejected the resulting cramped steps and oversized heading gaps.

**How to apply:** Treat the document as a content and emphasis reference for this section, not a requirement to reproduce Arial or its paragraph spacing. Keep both campaign variants visually consistent.

## Editable DOCX validation

Validate the XML inside generated Word files, not just the ZIP container or extracted text.

**Why:** A publication edit passed ZIP and text comparisons while a missing table-cell opening tag made the editable document invalid. Plain-text checks also failed to reveal lost section properties.

**How to apply:** Parse `word/document.xml` with an XML parser, resolve image/link relationships, preserve section properties, and compare unchanged manuscript text when replacing publication pages.

## Leader Kit mockup artwork

Preserve complete cover titles and subtitles when applying the shared book-mockup treatment; natural artwork proportions take precedence over identical mockup heights.

**Why:** Fixed-height, top-aligned cover crops cut off titles positioned lower in the Identity, Majesty, and Walking artwork. Heart's supplied image also includes its own header and cream band, which can duplicate the shared treatment.

**How to apply:** Inspect the rendered images, not only output dimensions. Remove only baked-in framing when reusing an already-composed cover, and keep the original document front cover distinct from the promotional mockup.

Adventure is an explicit exception: omit its lower photo montage and five-icon strip from the promotional mockup, while preserving the main scene and title.

**Why:** On 2026-09-17 the user clarified with a cropped screenshot that shortening this cover means removing that section, not scaling the full cover down, and explicitly approved the resulting crop.

**How to apply:** Retain this crop in shared mockups on the library and Go Further pages; it does not authorize altering the original book or kit front cover.