/** Preserve page-authored directives; supply the default only when absent. */
export function defaultRobotsDirective(pageHead = "", development = false) {
  const tags = pageHead.replace(/<!--[\s\S]*?-->/g, "").match(/<meta\b[^>]*>/gi) ?? [];
  const robots = tags.filter(tag => /\bname\s*=\s*["']robots["']/i.test(tag));
  if (robots.length > 1) throw new Error("Multiple page-authored robots meta tags");
  if (robots.length) {
    if (!/\bcontent\s*=\s*["'][^"']+["']/i.test(robots[0])) {
      throw new Error("Page-authored robots meta tag has no directive");
    }
    return null;
  }
  return development ? "noindex, follow" : "index, follow";
}
