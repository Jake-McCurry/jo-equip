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
  integrations: [react(), sitemap(), pagefind()],
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
