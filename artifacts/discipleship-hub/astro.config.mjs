// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
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
    /* Sitemaps: generated post-build by scripts/build-sitemaps.mjs (SEO-010) —
       logical content-grouped sitemaps + accurate per-page lastmod values.
       The former @astrojs/sitemap integration stamped every URL with the
       build date and produced a single monolithic file. */
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
