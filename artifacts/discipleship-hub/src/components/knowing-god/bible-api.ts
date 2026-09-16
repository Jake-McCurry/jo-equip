import { formatNetPassage, netPassageQuery } from "./passage-format";

export const netCache = new Map<string, string>();

export async function fetchNetPassages(
  references: string[],
  concurrency = 3,
  signal?: AbortSignal,
): Promise<boolean> {
  const missing = [...new Set(references)].filter(ref => !netCache.has(ref));
  if (missing.length === 0) return true;

  let hasError = false;
  for (let i = 0; i < missing.length; i += concurrency) {
    if (signal?.aborted) break;
    const batch = missing.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (ref) => {
        try {
          const url = `https://labs.bible.org/api/?passage=${encodeURIComponent(netPassageQuery(ref))}&type=json&formatting=plain`;
          const res = await fetch(url, { signal });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          const text = formatNetPassage(ref, data);
          netCache.set(ref, text);
        } catch (err) {
          if (signal?.aborted) return;
          console.error("Failed to fetch NET text for", ref, err);
          hasError = true;
        }
      })
    );
  }
  return !hasError;
}