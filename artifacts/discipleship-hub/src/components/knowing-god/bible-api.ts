export const netCache = new Map<string, string>();

export async function fetchNetPassages(references: string[], concurrency = 3): Promise<boolean> {
  const missing = references.filter(ref => !netCache.has(ref));
  if (missing.length === 0) return true;

  let hasError = false;
  for (let i = 0; i < missing.length; i += concurrency) {
    const batch = missing.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (ref) => {
        try {
          const url = `https://labs.bible.org/api/?passage=${encodeURIComponent(ref)}&type=json&formatting=plain`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // The API returns an array of objects. We concatenate the text.
          // For multi-verse passages, we include the verse number for clarity,
          // though for the first verse it's often omitted in the sample formatting, 
          // we'll just include it if it's > 1 verse to match KJV sample style, or always include.
          // Let's just include the text exactly.
          const text = data.map((d: any, idx: number) => (idx === 0 ? d.text.trim() : `${d.verse} ${d.text.trim()}`)).join(" ");
          netCache.set(ref, text);
        } catch (err) {
          console.error("Failed to fetch NET text for", ref, err);
          hasError = true;
        }
      })
    );
  }
  return !hasError;
}