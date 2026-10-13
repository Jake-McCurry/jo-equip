/* Books that also have an online web-book edition (pilot). The PDF remains
   the primary download; this only adds a "Read online" entry point. */
export const webBookEditions: Record<string, string> = {
  "adventure-of-living-with-jesus": "/books/adventure-of-living-with-jesus/read",
};
export const getWebEdition = (bookId: string): string | undefined => webBookEditions[bookId];
