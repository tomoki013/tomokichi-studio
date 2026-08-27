import tailwindcss from "@tailwindcss/vite";
import { seoAssets } from "@tomokichi/app-site/seo-assets";
import { SITE_ORIGINS } from "@tomokichi/app-site/urls";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: SITE_ORIGINS.main,
  integrations: [seoAssets()],
  // English is served from the root; Japanese lives under /ja.
  // The old /en/* URLs, the retired Principles page, and /apps — which became
  // /products when the site stopped being an app list — redirect accordingly.
  redirects: {
    "/apps": "/products",
    "/ja/apps": "/ja/products",
    "/en/apps": "/products",
    "/principles": "/about#approach",
    "/philosophy": "/about#approach",
    "/ja/principles": "/ja/about#approach",
    "/ja/philosophy": "/ja/about#approach",
    "/en": "/",
    "/en/principles": "/about#approach",
    "/en/philosophy": "/about#approach",
    "/en/about": "/about",
    "/en/privacy": "/privacy",
    "/en/terms": "/terms",
    "/en/support": "/support",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
