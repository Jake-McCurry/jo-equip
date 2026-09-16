type Range = { book: string; chapter: number; start: number; end: number };

export function passageRanges(reference: string): Range[] {
  const text = reference.trim().replace(/[–—]/g, "-");
  const match = text.match(/^(.+?)\s+(\d+):(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)$/);
  const single = text.match(/^(Obadiah|Philemon|2 John|3 John|Jude)\s+(\d+(?:-\d+)?(?:,\s*\d+(?:-\d+)?)*)$/);
  if (!match && !single) throw new Error(`Unsupported Scripture reference: ${reference}`);
  const book = match ? match[1] : single![1];
  const chapter = match ? Number(match[2]) : 1;
  return (match ? match[3] : single![2]).split(",").map(part => {
    const [start, end = start] = part.trim().split("-").map(Number);
    if (chapter < 1 || start < 1 || end < start) throw new Error(`Invalid Scripture range: ${reference}`);
    return { book, chapter, start, end };
  });
}

export function netPassageQuery(reference: string): string {
  return passageRanges(reference).map(({ book, chapter, start, end }) =>
    `${book} ${chapter}:${start}${end === start ? "" : `-${end}`}`,
  ).join("; ");
}

const bookKey = (book: string) => book.toLowerCase().replace(/[^a-z0-9]/g, "")
  .replace(/^psalms?$/, "psalms").replace(/^songofsolomon$/, "songofsongs");

/** Reject missing, duplicate, or unrelated verses rather than mislabel Scripture. */
export function formatNetPassage(reference: string, data: unknown): string {
  const ranges = passageRanges(reference);
  const expected = ranges.flatMap(range => Array.from(
    { length: range.end - range.start + 1 },
    (_, index) => `${bookKey(range.book)}:${range.chapter}:${range.start + index}`,
  ));
  if (!Array.isArray(data) || data.length !== expected.length) {
    throw new Error(`NET returned an unexpected verse count for ${reference}`);
  }
  const verses = new Map<string, string>();
  for (const row of data) {
    if (!row || typeof row.bookname !== "string" || typeof row.text !== "string" || !row.text.trim()) {
      throw new Error(`NET returned an invalid verse for ${reference}`);
    }
    const key = `${bookKey(row.bookname)}:${Number(row.chapter)}:${Number(row.verse)}`;
    if (!expected.includes(key) || verses.has(key)) {
      throw new Error(`NET returned an unexpected or duplicate verse for ${reference}`);
    }
    verses.set(key, row.text.trim());
  }
  return ranges.map((range, rangeIndex) => Array.from(
    { length: range.end - range.start + 1 },
    (_, index) => {
      const verse = range.start + index;
      const text = verses.get(`${bookKey(range.book)}:${range.chapter}:${verse}`)!;
      return rangeIndex === 0 && index === 0 ? text : `${verse} ${text}`;
    },
  ).join(" ")).join("\n\n");
}

// These source excerpts omit the verse number at the range boundary.
// Match their actual opening words without adding or rewriting Scripture.
const unnumberedRangeStarts: Record<string, string> = {
  "Leviticus 19:32": "Thou shalt rise up before the hoary head",
  "Proverbs 8:32": "Now therefore hearken unto me",
};

/** Retain the book's KJV wording, separating only explicitly disjoint ranges. */
export function formatSourcePassage(reference: string, text: string): string {
  const ranges = passageRanges(reference);
  const parts: string[] = [];
  let remaining = text;
  for (const range of ranges.slice(1)) {
    const boundary = new RegExp(`(?:\\s+|(?<=[.!?;:,]))${range.start}(?=\\s)`).exec(remaining);
    const anchor = unnumberedRangeStarts[`${range.book} ${range.chapter}:${range.start}`];
    const boundaryIndex = boundary?.index ?? (anchor ? remaining.indexOf(anchor) : -1);
    if (boundaryIndex < 0) continue;
    parts.push(remaining.slice(0, boundaryIndex).trimEnd());
    remaining = remaining.slice(boundaryIndex).trimStart();
  }
  parts.push(remaining);
  return parts.join("\n\n");
}