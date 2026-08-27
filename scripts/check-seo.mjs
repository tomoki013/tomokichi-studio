import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Checks the SEO surface of every built site.
 *
 * This runs against `dist`, not against source, because that is what a crawler
 * gets: the sitemap has to agree with the pages that actually shipped, and a
 * canonical is only correct if the URL it names is a file someone can fetch.
 *
 * Run after `pnpm build`.
 */

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * The sites that are actually published. A brand site still waiting for its
 * subdomain is held to the same structural rules, but is only warned about a
 * missing share image — inventing artwork for it is not this script's job.
 */
const PUBLISHED = new Set(["main", "colorvia", "remeet", "tripory", "yohaku", "quiet-solitaire"]);
const warnings = [];
const appsRoot = join(workspaceRoot, "apps");
const failures = [];

const walk = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const attribute = (tag, name) => tag.match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] ?? "";

const isAbsolute = (url) => {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
};

for (const entry of readdirSync(appsRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const app = entry.name;
  const distRoot = join(appsRoot, app, "dist");
  if (!existsSync(join(distRoot, "index.html"))) continue;

  const fail = (message) => failures.push(`${app}: ${message}`);
  const published = PUBLISHED.has(app);

  /* robots.txt ------------------------------------------------------------ */

  const robotsPath = join(distRoot, "robots.txt");
  if (!existsSync(robotsPath)) {
    fail("robots.txt is missing");
    continue;
  }
  const robots = readFileSync(robotsPath, "utf8");
  const sitemapLine = robots.match(/^Sitemap:\s*(\S+)$/m)?.[1];
  if (!sitemapLine) fail("robots.txt does not point at a sitemap");
  const origin = sitemapLine ? new URL(sitemapLine).origin : undefined;
  if (sitemapLine && sitemapLine !== `${origin}/sitemap.xml`) {
    fail(`robots.txt points at ${sitemapLine}, not this host's /sitemap.xml`);
  }

  // Crawlers that have to be able to reach the site. `robots.txt` groups are
  // not additive: a named group replaces `*`, so each one is checked alone.
  for (const agent of ["Googlebot", "OAI-SearchBot", "Claude-SearchBot", "Claude-User"]) {
    const index = robots.indexOf(`User-agent: ${agent}`);
    const group = index === -1 ? robots : robots.slice(index).split("\n\n")[0];
    if (/^Disallow:\s*\/\s*$/m.test(group)) fail(`robots.txt blocks ${agent}`);
  }

  /* Pages ----------------------------------------------------------------- */

  const pages = new Map(); // canonical URL -> page path
  const files = walk(distRoot).filter((path) => path.endsWith(".html"));

  for (const file of files) {
    const where = `${relative(distRoot, file)}`;
    const html = readFileSync(file, "utf8");
    // Astro's redirect stubs have no </head> at all, so fall back to the
    // whole document rather than silently checking an empty string.
    const headEnd = html.indexOf("</head>");
    const head = headEnd === -1 ? html : html.slice(0, headEnd + 7);

    for (const script of head.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    )) {
      try {
        JSON.parse(script[1]);
      } catch (error) {
        fail(`${where}: JSON-LD is not valid JSON (${error.message})`);
      }
    }

    // A redirect stub is not a page; it has no metadata to check.
    if (/<meta[^>]+http-equiv=["']refresh["']/i.test(head)) continue;

    const robotsMeta = attribute(
      head.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] ?? "",
      "content",
    );
    if (!robotsMeta) fail(`${where}: no robots meta`);
    if (/noindex/i.test(robotsMeta)) continue;

    const title = head.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim();
    if (!title) fail(`${where}: no title`);

    const description = attribute(
      head.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] ?? "",
      "content",
    );
    if (!description.trim()) fail(`${where}: no meta description`);

    const canonicalTag = head.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0];
    const canonical = canonicalTag ? attribute(canonicalTag, "href") : "";
    if (!canonical) {
      fail(`${where}: no canonical`);
      continue;
    }
    if (!isAbsolute(canonical)) fail(`${where}: canonical "${canonical}" is not an absolute URL`);
    if (origin && new URL(canonical).origin !== origin) {
      fail(`${where}: canonical points at another host (${canonical})`);
    }
    if (pages.has(canonical)) {
      fail(`${where}: shares canonical ${canonical} with ${pages.get(canonical)}`);
    }
    pages.set(canonical, where);

    for (const tag of head.matchAll(/<link[^>]+rel=["']alternate["'][^>]*>/gi)) {
      const href = attribute(tag[0], "href");
      const hreflang = attribute(tag[0], "hreflang");
      if (!hreflang) continue;
      if (!isAbsolute(href))
        fail(`${where}: hreflang="${hreflang}" href "${href}" is not absolute`);
    }

    for (const property of ["og:title", "og:description", "og:url", "og:image", "og:type"]) {
      const tag = head.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]*>`, "i"))?.[0];
      const content = tag ? attribute(tag, "content") : "";
      if (!content) {
        if (property === "og:image" && !published) warnings.push(`${app}: ${where}: no og:image`);
        else fail(`${where}: no ${property}`);
      } else if (property.endsWith("url") || property.endsWith("image")) {
        if (!isAbsolute(content)) fail(`${where}: ${property} "${content}" is not absolute`);
      }
    }

    const ogUrl = attribute(
      head.match(/<meta[^>]+property=["']og:url["'][^>]*>/i)?.[0] ?? "",
      "content",
    );
    if (ogUrl && ogUrl !== canonical) fail(`${where}: og:url ${ogUrl} disagrees with canonical`);
  }

  /* Sitemap --------------------------------------------------------------- */

  const sitemapPath = join(distRoot, "sitemap.xml");
  if (!existsSync(sitemapPath)) {
    fail("sitemap.xml is missing");
    continue;
  }
  const sitemap = readFileSync(sitemapPath, "utf8");
  if (!sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    fail("sitemap.xml has no XML declaration");
  }
  if (!/<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/.test(sitemap)) {
    fail("sitemap.xml has no sitemaps.org urlset");
  }

  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  if (locs.length === 0) fail("sitemap.xml lists no URLs");
  if (new Set(locs).size !== locs.length) fail("sitemap.xml repeats a URL");

  for (const loc of locs) {
    if (!isAbsolute(loc)) {
      fail(`sitemap.xml lists "${loc}", which is not an absolute URL`);
      continue;
    }
    if (origin && new URL(loc).origin !== origin) {
      fail(`sitemap.xml lists ${loc}, which is on another host`);
      continue;
    }
    if (!pages.has(loc)) {
      fail(`sitemap.xml lists ${loc}, which is not an indexable page of this build`);
    }
    // A listed URL has to answer 200, not redirect: these sites serve the
    // trailing-slash form, so the file behind it must exist.
    const target = join(distRoot, decodeURIComponent(new URL(loc).pathname), "index.html");
    if (!existsSync(target) || !statSync(target).isFile()) {
      fail(`sitemap.xml lists ${loc}, which has no page in dist`);
    }
  }

  for (const [canonical, where] of pages) {
    if (!locs.includes(canonical)) fail(`${where}: indexable but missing from sitemap.xml`);
  }

  console.log(`${app}: ${locs.length} indexable URLs, robots.txt and sitemap.xml OK`);
}

if (warnings.length > 0) {
  console.warn(`\n${warnings.length} warning(s) on sites that are not published yet:`);
  for (const warning of warnings) console.warn(`  - ${warning}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} SEO problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("\nSEO checks passed.");
