import { defineMiddleware } from "astro:middleware";
import { canonicalArticlePath } from "./data/articleCanonicalPaths.mjs";
import { canonicalArticleHtml } from "./data/articleCanonicalHtml.mjs";

export const onRequest = defineMiddleware(async (context, next) => {
  const prefix = import.meta.env.BASE_URL.replace(/\/+$/, "");
  const path = prefix && context.url.pathname.startsWith(prefix + "/")
    ? context.url.pathname.slice(prefix.length) : context.url.pathname;
  const survivor = canonicalArticlePath(path.replace(/^\/channels(?=\/|$)/, "/categories"));
  if (survivor !== path) {
    return context.redirect(prefix + survivor + context.url.search, 301);
  }
  const response = await next();
  if (!response.headers.get("content-type")?.includes("text/html")) return response;
  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("etag");
  return new Response(canonicalArticleHtml(html, context.url.pathname, import.meta.env.BASE_URL), {
    status: response.status, statusText: response.statusText, headers,
  });
});