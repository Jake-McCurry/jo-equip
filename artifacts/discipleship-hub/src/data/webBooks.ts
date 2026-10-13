/* Books that also have an online web-book edition. The PDF remains the primary
   download; this only adds a "Read online" entry point on cards and detail pages.
   Adventure keeps its dedicated pages; every other edition is generated from
   src/data/web-books/<id>.json (scripts/extract-web-books.py). */
import { webBooks } from "@/data/web-books";

export const webBookEditions: Record<string, string> = {
  "adventure-of-living-with-jesus": "/books/adventure-of-living-with-jesus/read",
  ...Object.fromEntries(webBooks.map(b => [b.id, b.readBase])),
};
export const getWebEdition = (bookId: string): string | undefined => webBookEditions[bookId];
