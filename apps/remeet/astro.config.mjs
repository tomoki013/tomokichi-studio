import tailwindcss from "@tailwindcss/vite";
import { seoAssets } from "@tomokichi/app-site/seo-assets";
import { appSiteUrl } from "@tomokichi/app-site/urls";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: appSiteUrl("remeet"),
  integrations: [seoAssets()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  // English is now served from the root; the old /en/* URLs redirect to it.
  // The pricing page became Share Pass. The Worker answers these with a real
  // 301 in production; these static redirect pages cover `astro preview`.
  redirects: {
    "/en": "/",
    "/en/[page]": "/[page]",
    "/pricing": "/share-pass",
    "/ja/pricing": "/ja/share-pass",
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
