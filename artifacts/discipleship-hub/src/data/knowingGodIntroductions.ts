export type KnowingGodIntroduction = {
  slug: string;
  title: string;
  eyebrow: string;
  description: string;
  pdfPages: number[];
};

export const knowingGodIntroductions: KnowingGodIntroduction[] = [
  {
    slug: "about-this-edition",
    title: "About This Edition",
    eyebrow: "Title & Publication",
    description:
      "The original title page, publishing information, permissions, Scripture translation notes, and ISBN.",
    pdfPages: [3, 4],
  },
  {
    slug: "dedication",
    title: "Dedication",
    eyebrow: "O Worship the King",
    description:
      "Robert Grant’s hymn honoring the attributes, characteristics, and descriptions of God.",
    pdfPages: [5],
  },
  {
    slug: "foundational-scriptures",
    title: "Introductory Foundational Scriptures",
    eyebrow: "Scripture",
    description:
      "The biblical passages that establish the purpose and foundation of Knowing God.",
    pdfPages: [7, 8],
  },
  {
    slug: "devotional-guide",
    title: "Devotional Guide",
    eyebrow: "Directed Study",
    description:
      "A highlighted selection of attributes, characteristics, and qualities of God for Bible study, worship, and prayer.",
    pdfPages: [11, 12, 13, 14, 15, 16, 17, 18],
  },
  {
    slug: "notable-quotations",
    title: "Notable Quotations",
    eyebrow: "Reflections",
    description:
      "Selected reflections on Scripture, knowing God, and the nature and character of the Almighty.",
    pdfPages: [19, 20],
  },
];
