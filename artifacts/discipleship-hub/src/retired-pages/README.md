# Retired pages (not published)

Files here are kept for possible future reuse but are OUTSIDE src/pages, so
Astro does not build or publish them.

- `books-sign-up.astro` + `books-thank-you.astro` — the book-download email
  capture (Mailchimp signup gate), removed from the live site in Aug 2026 so
  books download freely. To restore: move both files back into `src/pages/`
  and re-add the consent gate in `src/pages/books.astro` (see git history of
  that file's inline script).
