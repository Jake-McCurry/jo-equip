/**
 * Scoped verification build. Keep generated verification churn out of source
 * metadata; publishing builds still use the normal build command. Retired
 * lastmod keys are removed, but source datasets and assets are never deleted.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { ARTICLE_REDIRECTS } from "../src/data/articleCanonicalPaths.mjs";

const root = resolve(import.meta.dirname, "..");
const metadata = ["sitemap-lastmod.json", "video-validation-cache.json", "sitemap-video-exclusions.json"];
const snapshots = new Map(metadata.map(name => [name, readFileSync(
  name === "sitemap-lastmod.json" && process.env.CONSOLIDATION_LASTMOD_BASELINE
    ? process.env.CONSOLIDATION_LASTMOD_BASELINE : resolve(root, name), "utf8",
)]));
let status = 1;
try {
  const result = spawnSync("pnpm", ["build"], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  status = result.status ?? 1;
} finally {
  for (const [name, snapshot] of snapshots) {
    if (name === "sitemap-lastmod.json") {
      const manifest = JSON.parse(snapshot);
      for (const retired of Object.keys(ARTICLE_REDIRECTS)) delete manifest[`https://equip.jesusonline.com${retired}`];
      writeFileSync(resolve(root, name), JSON.stringify(manifest, null, 2) + "\n");
    } else {
      writeFileSync(resolve(root, name), snapshot);
    }
  }
}
process.exitCode = status;