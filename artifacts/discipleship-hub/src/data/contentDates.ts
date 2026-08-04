/**
 * Content modification dates for JSON-LD `dateModified` (SEO-010 follow-up).
 *
 * Previously article pages stamped `dateModified: new Date()` at build time,
 * which advanced on every deploy regardless of content changes (and defeated
 * the sitemap's content-hash lastmod tracking, since the date is baked into
 * the rendered HTML). Instead we use the last git commit date of the source
 * file that owns the article's content — durable across rebuilds, and it
 * only moves when the content actually changed.
 *
 * Runs at build time only (static output), memoized per file path.
 */
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const cache = new Map<string, string>();

/** Last git commit date (YYYY-MM-DD) of a file, relative to this package.
 *  Falls back to `fallback` for uncommitted/new files. */
export function gitDateOf(relPath: string, fallback: string): string {
  const key = relPath;
  const hit = cache.get(key);
  if (hit) return hit;
  let date = fallback;
  try {
    const abs = resolve(process.cwd(), relPath);
    const out = execSync(`git log -1 --format=%cs -- "${abs}"`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(out)) date = out;
  } catch {
    /* not a git checkout (e.g. CI tarball) — keep fallback */
  }
  cache.set(key, date);
  return date;
}
