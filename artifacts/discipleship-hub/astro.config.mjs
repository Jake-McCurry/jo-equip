// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import pagefind from "astro-pagefind";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 4321;
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// BASE_PATH: "/" for Cloudflare Pages, "/artifacts/discipleship-hub" for Replit dev
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  site: "https://equip.jesusonline.com",
  base,
  trailingSlash: "ignore",
  output: "static",
  /* Prefetch in-viewport links so visitor navigation feels instant.
     Adds ~1KB of JS but eliminates next-page wait. */
  prefetch: { defaultStrategy: "viewport" },
  integrations: [
    react(),
    /* Stamp every sitemap entry with the build date so Google sees fresh
       `lastmod` values after each deploy and recrawls accordingly. */
    sitemap({
      lastmod: new Date(),
      /* Keep utility pages out of the sitemap: /thank-you is noindex (listing a
         noindex page sends Google mixed signals) and /search is an internal
         results page Google discourages indexing. /lp/* are noindex paid-ad
         landing pages (duplicate content on multiple campaign URLs). */
      filter: (page) => !/\/(thank-you|search)\/?$/.test(page) && !/\/lp\//.test(page),
      /* Emit URLs WITHOUT a trailing slash so they match our self-referencing
         canonical tags (Layout.astro strips the trailing slash on every path
         except the root). When the sitemap URL ("/about/") and the page's
         canonical ("/about") disagree, Google files the sitemap URL under
         "Alternate page with proper canonical tag" and won't index it. The
         site root is the one exception — its canonical keeps the trailing
         slash, so we leave it untouched. */
      serialize: (item) => {
        if (item.url !== "https://equip.jesusonline.com/") {
          item.url = item.url.replace(/\/$/, "");
        }
        return item;
      },
    }),
    pagefind(),
    /* NOTE: Partytown was removed (July 2026). It ran GTM in a Web Worker for
       a mobile PSI win, but made the container undetectable by Tag Assistant,
       GTM Preview mode, and third-party scanners. GTM now uses the standard
       main-thread snippet in Layout.astro. */
  ],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@assets": path.resolve(__dirname, "..", "..", "attached_assets"),
      },
    },
    server: {
      allowedHosts: true,
    },
  },
  server: {
    port,
    host: "0.0.0.0",
  },
});
