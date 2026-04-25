export interface Book {
  id: string;
  title: string;
  author?: string;
  cover: string;
  pdf: string;
}

/* Display order matches the screenshot reference. */
export const books: Book[] = [
  {
    id: "adventure-of-living-with-jesus",
    title: "The Adventure of Living with Jesus",
    cover: "/books/covers/adventure-of-living-with-jesus.png",
    pdf: "/books/adventure-of-living-with-jesus.pdf",
  },
  {
    id: "who-is-the-real-jesus",
    title: "Who Is the Real Jesus?",
    cover: "/books/covers/who-is-the-real-jesus.png",
    pdf: "/books/who-is-the-real-jesus.pdf",
  },
  {
    id: "has-science-discovered-god",
    title: "Has Science Discovered God?",
    cover: "/books/covers/has-science-discovered-god.png",
    pdf: "/books/has-science-discovered-god.pdf",
  },
  {
    id: "extraordinary-evangelism",
    title: "Extraordinary Evangelism",
    author: "Dave R. Chapman",
    cover: "/books/covers/extraordinary-evangelism.png",
    pdf: "/books/extraordinary-evangelism.pdf",
  },
  {
    id: "soul-prescription",
    title: "Soul Prescription",
    author: "Bill Bright and Henry Brandt",
    cover: "/books/covers/soul-prescription.png",
    pdf: "/books/soul-prescription.pdf",
  },
  {
    id: "from-coping-to-cure",
    title: "From Coping to Cure",
    author: "Dr. Henry Brandt",
    cover: "/books/covers/from-coping-to-cure.png",
    pdf: "/books/from-coping-to-cure.pdf",
  },
  {
    id: "40-days-of-gods-love",
    title: "40 Days of God's Love",
    cover: "/books/covers/40-days-of-gods-love.png",
    pdf: "/books/40-days-of-gods-love.pdf",
  },
  {
    id: "hearing-the-voice-of-god",
    title: "Hearing the Voice of God",
    author: "David Chadwick",
    cover: "/books/covers/hearing-the-voice-of-god.png",
    pdf: "/books/hearing-the-voice-of-god.pdf",
  },
  {
    id: "struggle-for-inner-peace",
    title: "The Struggle for Inner Peace",
    author: "Dr. Henry Brandt with Phil Landrum",
    cover: "/books/covers/struggle-for-inner-peace.png",
    pdf: "/books/struggle-for-inner-peace.pdf",
  },
];
