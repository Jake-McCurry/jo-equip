export interface Book {
  id: string;
  title: string;
  author?: string;
  cover: string;
  pdf: string;
}

/* Display order matches the "JO EQUIP BOOKS" reference document (July 2026). */
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
    id: "beholding-the-majesty-of-god",
    title: "Beholding the Majesty of God",
    cover: "/books/covers/beholding-the-majesty-of-god.png",
    pdf: "/books/beholding-the-majesty-of-god.pdf",
  },
  {
    id: "your-new-identity-in-christ",
    title: "Your New Identity in Christ",
    cover: "/books/covers/your-new-identity-in-christ.png",
    pdf: "/books/your-new-identity-in-christ.pdf",
  },
  {
    id: "walking-in-the-spirit",
    title: "Walking in the Spirit",
    cover: "/books/covers/walking-in-the-spirit.png",
    pdf: "/books/walking-in-the-spirit.pdf",
  },
  {
    id: "the-abiding-room",
    title: "The Abiding Room",
    author: "Kevin Seacat",
    cover: "/books/covers/the-abiding-room.png",
    pdf: "/books/the-abiding-room.pdf",
  },
  {
    id: "extraordinary-evangelism",
    title: "Extraordinary Evangelism",
    author: "Dave R. Chapman",
    cover: "/books/covers/extraordinary-evangelism.png",
    pdf: "/books/extraordinary-evangelism.pdf",
  },
  {
    id: "extraordinary-evangelism-student-guide",
    title: "Extraordinary Evangelism: A Student Guide",
    author: "Dave R. Chapman",
    cover: "/books/covers/extraordinary-evangelism-student-guide.png",
    pdf: "/books/extraordinary-evangelism-student-guide.pdf",
  },
  {
    id: "soul-prescription",
    title: "Soul Prescription",
    author: "Bill Bright and Henry Brandt",
    cover: "/books/covers/soul-prescription.png",
    pdf: "/books/soul-prescription.pdf",
  },
  /* Condensed edition of Soul Prescription — same interior ("5 Steps to True
     Healing and Freedom") but published under the "5 Steps to Break
     Destructive Behavior" cover, per the JO EQUIP BOOKS reference. */
  {
    id: "5-steps-to-break-destructive-behavior",
    title: "5 Steps to Break Destructive Behavior",
    author: "Bill Bright and Henry Brandt",
    cover: "/books/covers/5-steps-to-break-destructive-behavior.png",
    pdf: "/books/5-steps-to-break-destructive-behavior.pdf",
  },
  {
    id: "from-coping-to-cure",
    title: "From Coping to Cure",
    author: "Dr. Henry Brandt",
    cover: "/books/covers/from-coping-to-cure.png",
    pdf: "/books/from-coping-to-cure.pdf",
  },
  {
    id: "struggle-for-inner-peace",
    title: "The Struggle for Inner Peace",
    author: "Dr. Henry Brandt with Phil Landrum",
    cover: "/books/covers/struggle-for-inner-peace.png",
    pdf: "/books/struggle-for-inner-peace.pdf",
  },
  {
    id: "i-want-happiness-now",
    title: "I Want Happiness NOW!",
    author: "Dr. Henry Brandt with Phil Landrum",
    cover: "/books/covers/i-want-happiness-now.png",
    pdf: "/books/i-want-happiness-now.pdf",
  },
  {
    id: "timeless-love-transforming-love",
    title: "Timeless Love, Transforming Love",
    author: "Mary and Friends",
    cover: "/books/covers/timeless-love-transforming-love.png",
    pdf: "/books/timeless-love-transforming-love.pdf",
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
];
