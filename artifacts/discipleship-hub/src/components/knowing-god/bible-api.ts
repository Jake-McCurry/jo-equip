/** NET text is published with this site; readers never contact Bible.org. */
type Manifest = {
  schemaVersion: number;
  passages: Record<string, string>;
  notes?: Record<string, string>;
};

export function createNetLoader(baseUrl: string, fetcher: typeof fetch = fetch) {
  const root = `${baseUrl.replace(/\/$/, "")}/knowing-god/net/`;
  const cache = new Map<string, string>();
  const notes = new Map<string, string>();
  let manifestPromise: Promise<Manifest> | undefined;
  const books = new Map<string, Promise<Record<string, string>>>();

  async function json(path: string, revalidate = false): Promise<unknown> {
    const response = await fetcher(`${root}${path}`, {
      signal: AbortSignal.timeout(15000),
      ...(revalidate ? { cache: "no-cache" as const } : {}),
    });
    if (!response.ok) throw new Error(`Local NET asset ${path}: HTTP ${response.status}`);
    return response.json();
  }

  function manifest(): Promise<Manifest> {
    if (!manifestPromise) {
      manifestPromise = json("manifest.json", true).then(value => {
        const data = value as Manifest;
        if (data?.schemaVersion !== 1 || !data.passages || typeof data.passages !== "object") {
          throw new Error("Invalid local NET manifest");
        }
        return data;
      }).catch(error => {
        manifestPromise = undefined;
        throw error;
      });
    }
    return manifestPromise;
  }

  function book(file: string): Promise<Record<string, string>> {
    if (!/^[a-z0-9][a-z0-9.-]*\.json$/.test(file)) throw new Error("Invalid NET asset filename");
    let pending = books.get(file);
    if (!pending) {
      pending = json(file).then(value => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          throw new Error(`Invalid NET asset: ${file}`);
        }
        return value as Record<string, string>;
      }).catch(error => {
        books.delete(file);
        throw error;
      });
      books.set(file, pending);
    }
    return pending;
  }

  async function load(references: string[], concurrency = 3, signal?: AbortSignal): Promise<boolean> {
    const missing = [...new Set(references)].filter(ref => !cache.has(ref));
    if (!missing.length) return true;
    try {
      const index = await manifest();
      const files = [...new Set(missing.map(ref => {
        const file = index.passages[ref];
        if (!file) throw new Error(`NET reference missing from local corpus: ${ref}`);
        return file;
      }))];
      let failed = false;
      const width = Math.max(1, Math.floor(concurrency) || 1);
      for (let i = 0; i < files.length && !signal?.aborted; i += width) {
        await Promise.all(files.slice(i, i + width).map(async file => {
          try {
            const data = await book(file);
            for (const ref of missing.filter(ref => index.passages[ref] === file)) {
              const text = data[ref];
              const note = index.notes?.[ref];
              if (typeof text !== "string" || (!text.trim() && !note)) {
                throw new Error(`Invalid local NET passage: ${ref}`);
              }
              cache.set(ref, text);
              if (note) notes.set(ref, note);
            }
          } catch (error) {
            console.error("Unable to load local NET book", file, error);
            failed = true;
          }
        }));
      }
      return !failed && !signal?.aborted;
    } catch (error) {
      if (!signal?.aborted) console.error("Unable to load local NET passages", error);
      return false;
    }
  }
  return { cache, notes, load };
}

const loader = createNetLoader(import.meta.env?.BASE_URL ?? "/");
export const netCache = loader.cache;
export const netNotes = loader.notes;
export const fetchNetPassages = loader.load;