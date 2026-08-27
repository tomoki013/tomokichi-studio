import { seoAssets } from "@tomokichi/app-site/seo-assets";
import { appSiteUrl } from "@tomokichi/app-site/urls";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: appSiteUrl("rough-board"),
  integrations: [seoAssets()],
  redirects: {
    "/en": "/",
    "/en/[page]": "/[page]",
  },
});
