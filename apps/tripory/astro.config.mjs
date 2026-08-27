import tailwindcss from "@tailwindcss/vite";
import { seoAssets } from "@tomokichi/app-site/seo-assets";
import { appSiteUrl } from "@tomokichi/app-site/urls";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: appSiteUrl("tripory"),
  integrations: [seoAssets()],
  // English is now served from the root; the old /en/* URLs redirect to it.
  redirects: {
    "/en": "/",
    "/en/[page]": "/[page]",
  },
  vite: { plugins: [tailwindcss()] },
});
