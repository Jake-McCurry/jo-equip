import { books } from './books';
import type { Book } from './books';

export interface BookCategory {
  title: string;
  books: Book[];
}

export const bookCategories: BookCategory[] = [
  {
    title: "Identity-Centered Heart Transformation",
    books: [
      "adventure-of-living-with-jesus",
      "a-heart-after-god",
      "your-new-identity-in-christ",
      "beholding-the-majesty-of-god",
      "walking-in-the-spirit",
    ].map(id => {
      const b = books.find(b => b.id === id);
      if (!b) throw new Error(`Missing book ID: ${id}`);
      return b;
    }),
  },
  {
    title: "Evidence-Based Evangelism",
    books: [
      "who-is-the-real-jesus",
      "has-science-discovered-god",
      "extraordinary-evangelism",
      "extraordinary-evangelism-student-guide",
    ].map(id => {
      const b = books.find(b => b.id === id);
      if (!b) throw new Error(`Missing book ID: ${id}`);
      return b;
    }),
  },
  {
    title: "Devotional Studies",
    books: [
      "new-life-in-christ",
      "knowing-god",
      "hearing-the-voice-of-god",
      "the-abiding-room",
      "40-days-of-gods-love",
      "timeless-love-transforming-love",
    ].map(id => {
      const b = books.find(b => b.id === id);
      if (!b) throw new Error(`Missing book ID: ${id}`);
      return b;
    }),
  },
  {
    title: "Attitudes and Behavior",
    books: [
      "soul-prescription",
      "5-steps-to-break-destructive-behavior",
      "from-coping-to-cure",
      "i-want-happiness-now",
      "struggle-for-inner-peace",
    ].map(id => {
      const b = books.find(b => b.id === id);
      if (!b) throw new Error(`Missing book ID: ${id}`);
      return b;
    }),
  },
  {
    title: "Marriage",
    books: [
      "eight-great-ways-to-honor-your-husband",
      "eight-great-ways-to-honor-your-wife",
    ].map(id => {
      const b = books.find(b => b.id === id);
      if (!b) throw new Error(`Missing book ID: ${id}`);
      return b;
    }),
  },
];

const seenIds = new Set<string>();
for (const cat of bookCategories) {
  for (const book of cat.books) {
    if (seenIds.has(book.id)) {
      throw new Error(`Duplicate book ID in categories: ${book.id}`);
    }
    seenIds.add(book.id);
  }
}

import { listedBooks } from './books';
for (const book of listedBooks) {
  if (!seenIds.has(book.id)) {
    throw new Error(`Listed book missing from categories: ${book.id}`);
  }
}
