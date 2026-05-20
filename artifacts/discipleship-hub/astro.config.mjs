// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";
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
    sitemap({ lastmod: new Date() }),
    pagefind(),
    /* Partytown: runs <script type="text/partytown"> in a Web Worker
       instead of the main thread. We use it for GTM + GA4 (set up in
       Layout.astro) — biggest single mobile PSI win for this site.
       `forward` tells Partytown which window properties to proxy so
       dataLayer.push() calls still work transparently from main-thread code. */
    partytown({
      config: {
        forward: ["dataLayer.push", "gtag"],
      },
    }),
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
