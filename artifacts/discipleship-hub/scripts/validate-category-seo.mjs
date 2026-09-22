import { channels, subTopics } from "../src/data/channels.ts";
import { categorySeoRows } from "../src/data/categorySeo.ts";

const routes = new Map([["/categories", "category root"]]);
for (const channel of channels) routes.set(`/categories/${channel.id}`, "channel");
for (const sub of subTopics) {
  routes.set(`/categories/${sub.channelId}/${sub.id}`, "sub-topic");
  for (const item of sub.items ?? []) {
    if (item.articleId) {
      routes.set(`/categories/${sub.channelId}/${sub.id}/${item.articleId}`, "article");
    }
  }
}

const unmatched = categorySeoRows.filter((row) => !routes.has(row.path));
const workbookPaths = new Set(categorySeoRows.map((row) => row.path));
const routesNotInWorkbook = [...routes].filter(([path]) => !workbookPaths.has(path));
const duplicatePaths = categorySeoRows.filter(
  (row, index) => categorySeoRows.findIndex((candidate) => candidate.path === row.path) !== index,
);

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(categorySeoRows, null, 2));
} else {
  console.log(JSON.stringify({
    checkedInMetadataRows: categorySeoRows.length,
    matchedRoutes: categorySeoRows.length - unmatched.length,
    unmatchedWorkbookRows: unmatched.length,
    duplicateWorkbookPaths: duplicatePaths.length,
    existingRoutesNotInWorkbook: routesNotInWorkbook.length,
    matchedByType: Object.fromEntries(
      ["category root", "channel", "sub-topic", "article"].map((type) => [
        type,
        categorySeoRows.filter((row) => routes.get(row.path) === type).length,
      ]),
    ),
  }, null, 2));
}

if (unmatched.length || duplicatePaths.length) {
  console.error(JSON.stringify({ unmatched, duplicatePaths }, null, 2));
  process.exitCode = 1;
}