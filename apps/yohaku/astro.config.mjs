import { seoAssets } from "@tomokichi/app-site/seo-assets";
import { appSiteUrl } from "@tomokichi/app-site/urls";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: appSiteUrl("yohaku"),
  integrations: [seoAssets()],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
  redirects: {
    "/en": "/",
    "/en/[page]": "/[page]",
  },
});
