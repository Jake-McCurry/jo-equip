# Book library thumbnail rules

## Library card links

Center book titles and link each title directly to its PDF in a new tab. Place
a decorative download icon to the title's right inside the same link; the icon
also opens the PDF, rather than triggering a separate download. Use native
anchors with `target="_blank"` and `rel="noopener noreferrer"` so they work
without JavaScript. Retain PDF-open analytics, clickable covers, Details links,
and legacy `/books?download=<book-id>` deep links. Do not reintroduce separate
Open and Save buttons: the user requested a simpler card with the title as its
primary PDF action.

Knowing God is the sole library-card exception: display its title as
**Knowing God / Concordance**, retaining the PDF title link and trailing icon.
Replace its Details link with **View Digital Version**, pointing to
`/knowing-god` (the concordance start page, without a topic hash).
Keep the underlying book title and standalone book-details page unchanged.

All book thumbnails on `/books` must have the same displayed width **and**
height at a given viewport. Equal card heights alone do not meet this rule:
natural-aspect images inside `object-fit: contain` boxes still look uneven.

## Shared rendering rule

Every library carousel uses `BookThumbnail.astro`. It generates 3:4 thumbnails
(360 × 480 base pixels, responsive variants) and displays them at up to
180 × 240 CSS pixels. Mobile thumbnails scale together to the available card
width while retaining the same common ratio.

Resize the full cover into this common shape. This slightly adjusts the
proportions of covers whose originals are not 3:4; it intentionally avoids
cropping book titles, subtitles, authors, or attribution. Keep the original
assets and downloadable PDFs intact. Do not add per-book width or height
overrides or revert to natural-aspect thumbnails inside equal outer frames.

The chosen fit is for small library thumbnails, not the larger cover previews
on individual book pages or the source files used for social sharing.

Missing covers have a same-sized placeholder, but the production build fails
if a listed library book is missing its cover. Duplicate same-ID JPG/PNG files
also fail validation rather than choosing one unpredictably.

## Adding or replacing a book

1. Add the book to the catalog and its intended category.
2. Add exactly one readable source cover using the book ID as its filename in
   `src/assets/books/covers/`. Keep sufficient resolution for clear thumbnails.
3. Prefer an already-correct cover asset. If generating a cover from a PDF,
   `pnpm --filter @workspace/scripts run covers:build` extracts and trims page 1,
   then normalizes source height to 900px. That source normalization is **not**
   the thumbnail display rule: it does not normalize widths, and some curated
   covers intentionally bypass that generator.
4. Run `pnpm --filter @workspace/discipleship-hub run validate:books`.
5. Check the new book alongside existing covers on desktop and mobile.

The standard site `build` runs `validate:books` before Astro compilation.
The check verifies every categorized cover can generate the prescribed size,
checks shared component geometry and source usage, prevents duplicate vertical
spacing, and protects the approved Devotional Studies ordering.

## Carousel spacing

The `/books` stack owns spacing between carousels: 16px on mobile and 20px on
desktop, plus 8px track-bottom padding. Carousel sections must not add bottom
margins; combining those margins with the stack gap caused excessive scrolling.

## Devotional Studies

The approved opening order is:

1. New Life in Christ
2. Knowing God / Concordance
3. Hearing the Voice of God
4. The Abiding Room

Keep the remaining books in their existing positions unless the user asks for
another sequence.