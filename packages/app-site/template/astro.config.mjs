import { seoAssets } from "@tomokichi/app-site/seo-assets";
import { appSiteUrl } from "@tomokichi/app-site/urls";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: appSiteUrl("__APP_SLUG__"),
  // Generates robots.txt and sitemap.xml from the pages this site actually builds.
  integrations: [seoAssets()],
  redirects: {
    "/en": "/",
    "/en/[page]": "/[page]",
  },
});
