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
  /* July 2026 additions (user eBooks zip). The Student Guide PDF ships with
     its color front cover prepended as page 1 (source PDF began at a plain
     title page). "Soul Prescription: 5 Steps" is the condensed edition —
     distinct from the full "Soul Prescription" above; its cover is rendered
     from the PDF's own title page (no separate cover art supplied). */
  {
    id: "extraordinary-evangelism-student-guide",
    title: "Extraordinary Evangelism: A Student Guide",
    author: "Dave R. Chapman",
    cover: "/books/covers/extraordinary-evangelism-student-guide.png",
    pdf: "/books/extraordinary-evangelism-student-guide.pdf",
  },
  {
    id: "eight-great-ways-to-honor-your-husband",
    title: "Eight Great Ways to Honor Your Husband",
    author: "Marilynn Chadwick",
    cover: "/books/covers/eight-great-ways-to-honor-your-husband.png",
    pdf: "/books/eight-great-ways-to-honor-your-husband.pdf",
  },
  {
    id: "eight-great-ways-to-honor-your-wife",
    title: "Eight Great Ways to Honor Your Wife",
    author: "David Chadwick",
    cover: "/books/covers/eight-great-ways-to-honor-your-wife.png",
    pdf: "/books/eight-great-ways-to-honor-your-wife.pdf",
  },
  {
    id: "soul-prescription-5-steps",
    title: "Soul Prescription: 5 Steps to True Healing and Freedom",
    author: "Bill Bright and Henry Brandt",
    cover: "/books/covers/soul-prescription-5-steps.png",
    pdf: "/books/soul-prescription-5-steps.pdf",
  },
];
