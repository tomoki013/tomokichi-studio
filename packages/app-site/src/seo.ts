import { SITE_ORIGINS } from "./urls";

/**
 * Shared SEO / structured-data vocabulary for every Tomokichi site.
 *
 * Two rules hold everything here together:
 *
 * 1. Nothing in this file may claim something a visitor cannot also read on
 *    the page. No legal entity, no ratings, no availability the App Store
 *    does not back up.
 * 2. The studio is one entity across six hostnames. Every site references the
 *    same `@id`s, so a crawler that meets Yohaku and Colorvia separately can
 *    still tell they come from the same studio.
 */

/**
 * Brand naming.
 *
 * `Tomokichi Studio` is the formal name — it is what About, the journal and
 * structured data say. `Tomokichi` is the short display name kept in the site
 * chrome, the logo and page titles, and is registered as an `alternateName`
 * so the two never look like separate organisations.
 */
export const STUDIO = {
  name: "Tomokichi Studio",
  shortName: "Tomokichi",
  url: `${SITE_ORIGINS.main}/`,
  logo: `${SITE_ORIGINS.main}/assets/studio-logo.png`,
  /** Only URLs the studio or its creator actually controls. */
  sameAs: [SITE_ORIGINS.personal, SITE_ORIGINS.github],
  creator: {
    name: "Tomokichi",
    url: SITE_ORIGINS.personal,
    sameAs: [SITE_ORIGINS.personal, SITE_ORIGINS.github],
  },
} as const;

/** Stable node identifiers. Every site points at these, none of them redefine them. */
export const STUDIO_ID = {
  website: `${SITE_ORIGINS.main}/#website`,
  studio: `${SITE_ORIGINS.main}/#studio`,
  creator: `${SITE_ORIGINS.main}/#creator`,
} as const;

type JsonLdNode = Record<string, unknown>;

/**
 * The studio as an Organization. Product sites embed this shortened form so
 * the `@id` resolves for a crawler that never visits tmkch.io, while the full
 * node — founder, logo, sameAs — is only declared on tmkch.io itself.
 */
export function studioOrganization(full = false): JsonLdNode {
  const node: JsonLdNode = {
    "@type": "Organization",
    "@id": STUDIO_ID.studio,
    name: STUDIO.name,
    alternateName: STUDIO.shortName,
    url: STUDIO.url,
  };
  if (!full) return node;
  return {
    ...node,
    logo: {
      "@type": "ImageObject",
      "@id": `${SITE_ORIGINS.main}/#logo`,
      url: STUDIO.logo,
      contentUrl: STUDIO.logo,
    },
    image: { "@id": `${SITE_ORIGINS.main}/#logo` },
    founder: { "@id": STUDIO_ID.creator },
    sameAs: [...STUDIO.sameAs],
  };
}

export function studioCreator(full = false): JsonLdNode {
  const node: JsonLdNode = {
    "@type": "Person",
    "@id": STUDIO_ID.creator,
    name: STUDIO.creator.name,
    url: STUDIO.creator.url,
  };
  if (!full) return node;
  return { ...node, sameAs: [...STUDIO.creator.sameAs] };
}

/** A bare `{"@id": …}` reference, for author / publisher / provider slots. */
export const studioRef = (): JsonLdNode => ({ "@id": STUDIO_ID.studio });
export const creatorRef = (): JsonLdNode => ({ "@id": STUDIO_ID.creator });

/**
 * Serialise for `<script type="application/ld+json">`.
 *
 * `</script>` inside a string value would end the block early, so the closing
 * angle bracket is escaped — JSON parsers read `<` back as `<`.
 */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

/** Wrap nodes in a single `@graph` document. */
export function graph(nodes: JsonLdNode[]): JsonLdNode {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/* URLs ---------------------------------------------------------------------- */

/**
 * The one URL a page should be indexed under.
 *
 * Cloudflare serves these sites with `auto-trailing-slash`: `/features`
 * answers with a 307 to `/features/`, which is the address that returns 200.
 * Canonical links, hreflang, `og:url` and the sitemap therefore all have to
 * carry the slash — pointing them at the redirecting form would be pointing
 * search engines away from the page that exists.
 */
export function canonicalUrl(siteUrl: string, path?: string): string {
  // With no path, `siteUrl` is already the full address — passing a default
  // "/" here would silently discard a locale prefix like `/ja`.
  const url = path === undefined ? new URL(siteUrl) : new URL(path || "/", siteUrl);
  url.search = "";
  url.hash = "";
  url.pathname = `${url.pathname.replace(/\/index\.html$/, "").replace(/\/+$/, "")}/`;
  return url.toString();
}

/**
 * The identifier for an app itself, shared between the studio's Products page
 * and the app's own brand site. Both describe the same thing, so both have to
 * call it by the same name.
 */
export function appEntityId(siteUrl: string): string {
  return `${siteUrl.replace(/\/$/, "")}/#app`;
}

export interface AppEntityOptions {
  /** Origin of the app's own brand site. */
  siteUrl: string;
  name: string;
  description: string;
  /** A schema.org application category, e.g. `TravelApplication`. */
  applicationCategory: string;
  /** Device and minimum OS, worded as the site words it. */
  operatingSystem: string;
  /** Locale-specific path of the page being described, e.g. `/ja`. */
  path?: string;
  inLanguage?: string[];
  /** Site-relative or absolute. */
  image?: string;
  /**
   * The App Store listing — and the single switch for whether this app is
   * described as obtainable. An app that is not on the store yet gets no
   * `offers` and no `downloadUrl`, because a page that says "in development"
   * must not have structured data that says "available".
   */
  appStoreUrl?: string;
  /** Declared only alongside `appStoreUrl`. */
  offers?: readonly { name?: string; price: string; priceCurrency: string }[];
}

/**
 * An app, plus the studio that publishes it, as one `@graph`.
 *
 * The Organization travels with it so the `@id` shared with tmkch.io resolves
 * for a crawler that only ever sees this one brand site.
 */
export function appApplicationGraph(options: AppEntityOptions): JsonLdNode {
  const {
    siteUrl,
    name,
    description,
    applicationCategory,
    operatingSystem,
    path = "/",
    inLanguage,
    image,
    appStoreUrl,
    offers = [],
  } = options;

  const listed = Boolean(appStoreUrl);
  const app: JsonLdNode = {
    "@type": "SoftwareApplication",
    "@id": appEntityId(siteUrl),
    name,
    description,
    applicationCategory,
    operatingSystem,
    url: canonicalUrl(siteUrl, path),
    author: studioRef(),
    publisher: studioRef(),
    ...(inLanguage ? { inLanguage } : {}),
    ...(image ? { image: new URL(image, siteUrl).toString() } : {}),
    ...(listed
      ? {
          downloadUrl: appStoreUrl,
          sameAs: [appStoreUrl],
          offers: (offers.length > 0 ? offers : [{ price: "0", priceCurrency: "JPY" }]).map(
            (offer) => ({
              "@type": "Offer",
              ...(offer.name ? { name: offer.name } : {}),
              price: offer.price,
              priceCurrency: offer.priceCurrency,
              availability: "https://schema.org/InStock",
            }),
          ),
        }
      : {}),
  };

  return graph([app, studioOrganization()]);
}

/* robots.txt ---------------------------------------------------------------- */

/**
 * Search and AI-search crawlers, named explicitly.
 *
 * They are already covered by `User-agent: *`; naming them documents that the
 * open policy is deliberate, and makes an accidental future `Disallow` under
 * `*` visible rather than silent.
 */
export const SEARCH_CRAWLERS = [
  "Googlebot",
  "Bingbot",
  // ChatGPT Search, and Claude's search / user-directed fetch.
  "OAI-SearchBot",
  "Claude-SearchBot",
  "Claude-User",
] as const;

/**
 * Model-training crawlers. Deliberately a separate list from the one above:
 * search visibility never requires allowing these, and changing this policy
 * must not mean touching anything else in the SEO setup.
 */
export const TRAINING_CRAWLERS = ["GPTBot", "ClaudeBot", "Google-Extended"] as const;

export interface RobotsOptions {
  /** Absolute origin of this host, e.g. `https://yohaku.tmkch.io`. */
  siteUrl: string;
  /** Paths that really exist and should not be crawled. Usually empty. */
  disallow?: readonly string[];
  /**
   * `allow` keeps the sites' existing open policy — the studio has never
   * restricted training crawlers, and this file is not the place to decide
   * that silently. Switching to `disallow` is a one-value change here.
   */
  aiTraining?: "allow" | "disallow";
}

export function buildRobotsTxt({
  siteUrl,
  disallow = [],
  aiTraining = "allow",
}: RobotsOptions): string {
  const origin = siteUrl.replace(/\/$/, "");
  const lines: string[] = [
    "# Everything published here is meant to be found — by search engines and",
    "# by AI search assistants alike.",
    "",
    "User-agent: *",
    "Allow: /",
    ...disallow.map((path) => `Disallow: ${path}`),
    "",
    "# Search and AI-search crawlers. Same policy as above, stated explicitly so",
    "# it cannot be narrowed by accident.",
  ];

  for (const agent of SEARCH_CRAWLERS) {
    lines.push(
      "",
      `User-agent: ${agent}`,
      "Allow: /",
      ...disallow.map((path) => `Disallow: ${path}`),
    );
  }

  lines.push("", "# Model-training crawlers are a separate decision from search visibility.");
  if (aiTraining === "allow") {
    lines.push(
      `# ${TRAINING_CRAWLERS.join(", ")} are covered by the rule above.`,
      "# No restriction has been placed on them.",
    );
  } else {
    for (const agent of TRAINING_CRAWLERS) {
      lines.push("", `User-agent: ${agent}`, "Disallow: /");
    }
  }

  lines.push("", `Sitemap: ${origin}/sitemap.xml`, "");
  return lines.join("\n");
}

/* sitemap.xml --------------------------------------------------------------- */

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

/**
 * A sitemap of exactly the given URLs — deduplicated and sorted so the file
 * only changes when the site does.
 *
 * No `lastmod`: a build timestamp on every URL is worse than no timestamp at
 * all, and nothing in the build knows when a page's content genuinely changed.
 */
export function buildSitemapXml(urls: readonly string[]): string {
  const unique = [...new Set(urls)].sort();
  const body = unique.map((url) => `  <url><loc>${escapeXml(url)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}
