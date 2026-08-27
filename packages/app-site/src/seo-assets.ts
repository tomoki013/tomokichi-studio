import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { buildRobotsTxt, buildSitemapXml, type RobotsOptions } from "./seo";

/**
 * Writes `robots.txt` and `sitemap.xml` for a site, after it is built.
 *
 * The sitemap is read back out of the generated HTML rather than assembled
 * from a hand-kept list: a page is in the sitemap when, and only when, it
 * shipped a self-referencing canonical and did not ask to be left out. That is
 * what keeps the two from drifting apart as pages are added — there is no
 * second place to remember to update.
 *
 * Skipped automatically, because none of them carry an indexable canonical:
 * redirect stubs, 404, and anything marked `noindex`.
 */

const CANONICAL = [
  /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
  /<link[^>]+href=["']([^"']+)["'][^>]*rel=["']canonical["']/i,
];
const ROBOTS_META = /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i;
const META_REFRESH = /<meta[^>]+http-equiv=["']refresh["']/i;

async function htmlFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const found = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return htmlFiles(path);
      return entry.name.endsWith(".html") ? [path] : [];
    }),
  );
  return found.flat();
}

/** The canonical URL a built page asks to be indexed under, if it does. */
function indexableUrl(html: string, origin: string): string | undefined {
  if (META_REFRESH.test(html)) return undefined;

  const robots = html.match(ROBOTS_META)?.[1] ?? "";
  if (/\bnoindex\b/i.test(robots)) return undefined;

  const href = CANONICAL.reduce<string | undefined>(
    (found, pattern) => found ?? html.match(pattern)?.[1],
    undefined,
  );
  if (!href) return undefined;

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return undefined;
  }
  // A canonical pointing somewhere else — another host, or a fragment on a
  // page that is listed on its own — is not this page's entry to contribute.
  if (url.origin !== origin) return undefined;
  url.hash = "";
  return url.toString();
}

export function seoAssets(options: Omit<RobotsOptions, "siteUrl"> = {}): AstroIntegration {
  let site: string | undefined;

  return {
    name: "@tomokichi/app-site:seo-assets",
    hooks: {
      "astro:config:done": ({ config }) => {
        site = config.site;
      },
      "astro:build:done": async ({ dir, logger }) => {
        if (!site) {
          logger.warn("`site` is not set; skipping robots.txt and sitemap.xml.");
          return;
        }
        const origin = new URL(site).origin;
        const root = fileURLToPath(dir);

        const files = await htmlFiles(root);
        const urls = (
          await Promise.all(
            files.map(async (file) => indexableUrl(await readFile(file, "utf8"), origin)),
          )
        ).filter((url): url is string => Boolean(url));

        await writeFile(join(root, "sitemap.xml"), buildSitemapXml(urls), "utf8");
        await writeFile(
          join(root, "robots.txt"),
          buildRobotsTxt({ siteUrl: origin, ...options }),
          "utf8",
        );
        logger.info(`robots.txt, and sitemap.xml with ${new Set(urls).size} URLs.`);
      },
    },
  };
}
