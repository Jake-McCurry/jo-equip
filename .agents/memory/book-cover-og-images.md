---
name: Book cover OG images
description: books.ts cover paths (/books/covers/*.png) are used for OG/JSON-LD but most files don't exist publicly
---

`Book.cover` in the discipleship-hub books data serves two roles: the Books-page thumbnail actually comes from `getBookCover()` (src/assets/books/covers/*.jpg|png, matched by book id), while the declared `/books/covers/<id>.png` path is emitted verbatim into the book detail page's Open Graph / Twitter / JSON-LD image URLs.

**Why it matters:** no `public/books/covers/` files existed historically, so every book's social-share image 404'd until Aug 2026, when all 20 were backfilled as JPEGs (~1200px tall, quality 85) and books.ts paths switched from .png to .jpg.

**How to apply:** when adding a book, add BOTH the `src/assets/books/covers/<id>.jpg` thumbnail AND a `public/books/covers/<id>.jpg` (declared in books.ts `cover`). Keep them JPEG — photographic PNG covers were 7× heavier.

Also: TOC/footer numbering in generated book PDFs is printed-interior convention (cover prepend offsets PDF index by +1) — intentional, consistent across all JO EQUIP books; don't "fix" it.
