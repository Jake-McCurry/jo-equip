// Preachers of the classic sermons. Kept apart from index.ts so the Bible reader
// can name preachers without bundling the sermon list.
export type PreacherId = "spurgeon" | "wesley" | "whitefield" | "maclaren";
export const PREACHERS: Record<PreacherId, { name: string; full: string; life: string; about: string }> = {
  spurgeon: {
    name: "C. H. Spurgeon",
    full: "Charles Haddon Spurgeon",
    life: "1834–1892",
    about: "Baptist pastor of the New Park Street Chapel and the Metropolitan Tabernacle in London. His sermons were printed every week and collected in the New Park Street Pulpit (1855–1860) and the Metropolitan Tabernacle Pulpit (1861–1917).",
  },
  wesley: {
    name: "John Wesley",
    full: "John Wesley",
    life: "1703–1791",
    about: "Anglican clergyman and leader of the Methodist revival. His 53 “Sermons on Several Occasions” set out the doctrines Methodist preachers were expected to teach; they are published here from the first four volumes of his collected Works (Bristol, 1771). His later sermons, most first printed in the Arminian Magazine, follow from volumes 5–8 of Sermons on Several Occasions (London, 1788).",
  },
  whitefield: {
    name: "George Whitefield",
    full: "George Whitefield",
    life: "1714–1770",
    about: "Anglican evangelist of the Great Awakening, who preached in the open air across Britain and the American colonies. His sermons are published here from volumes 5 and 6 of his collected Works (London, 1772), printed two years after his death.",
  },
  maclaren: {
    name: "Alexander Maclaren",
    full: "Alexander Maclaren",
    life: "1826–1910",
    about: "Baptist minister of Union Chapel, Manchester, for 45 years and one of the best-known expository preachers of his day. Late in life he revised his sermons into the Expositions of Holy Scripture (1904–1910); those on the Psalms are published here from the volume on Psalms I.–XLIX.",
  },
};
