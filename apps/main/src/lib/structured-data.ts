import {
  appEntityId,
  canonicalUrl,
  creatorRef,
  graph,
  jsonLd,
  STUDIO,
  STUDIO_ID,
  studioCreator,
  studioOrganization,
  studioRef,
} from "@tomokichi/app-site/seo";
import { mainSiteUrl } from "@tomokichi/app-site/urls";
import { type AppItem, type Locale, orderedApps } from "../data/apps";
import { about, appsPage, home, journal } from "./copy";
import { entrySlug, type JournalEntry } from "./journal";

/**
 * JSON-LD for tmkch.io.
 *
 * Every value here is also on the page in words a person can read: the studio
 * is one person, the apps are the ones listed on Products, and an entry's date
 * is the date printed above it. Nothing describes the studio as a company,
 * because it isn't one, and nothing carries a rating, because there is no
 * rating to report.
 */

const inLanguage = (lang: Locale) => (lang === "ja" ? "ja-JP" : "en-US");
const flatten = (text: string) => text.replaceAll("\n", " ");

/** The studio's own three nodes, declared in full — only here, on its own site. */
function studioNodes(lang: Locale) {
  return [
    {
      "@type": "WebSite",
      "@id": STUDIO_ID.website,
      url: STUDIO.url,
      name: STUDIO.name,
      alternateName: STUDIO.shortName,
      description: flatten(home.hero.body[lang]),
      inLanguage: inLanguage(lang),
      publisher: studioRef(),
    },
    studioOrganization(true),
    studioCreator(true),
  ];
}

const pageNode = (lang: Locale, path: string, type = "WebPage") => ({
  "@type": type,
  "@id": `${canonicalUrl(mainSiteUrl(lang, path))}#page`,
  url: canonicalUrl(mainSiteUrl(lang, path)),
  inLanguage: inLanguage(lang),
  isPartOf: { "@id": STUDIO_ID.website },
});

export function homeJsonLd(lang: Locale): string {
  return jsonLd(graph([...studioNodes(lang), pageNode(lang, "/")]));
}

export function aboutJsonLd(lang: Locale): string {
  return jsonLd(
    graph([
      {
        ...pageNode(lang, "/about", "AboutPage"),
        name: about.metaTitle[lang],
        description: about.metaDescription[lang],
        about: studioRef(),
        mainEntity: creatorRef(),
      },
      studioOrganization(),
      studioCreator(),
    ]),
  );
}

/**
 * An app as an entity, identified by its brand site so the studio's Products
 * page and the app's own site are talking about the same app.
 *
 * `offers` and `downloadUrl` appear only for apps that are actually on the App
 * Store. For everything else the page says "in development", and so does this.
 */
function appNode(app: AppItem, lang: Locale) {
  const listed = app.status === "released" && Boolean(app.appStoreUrl);
  return {
    "@type": "SoftwareApplication",
    "@id": app.url
      ? appEntityId(app.url)
      : `${canonicalUrl(mainSiteUrl("en", "/products"))}#${app.slug}`,
    name: app.name,
    description: flatten(app.description[lang]),
    applicationCategory: "LifestyleApplication",
    operatingSystem: app.detail?.requirements[lang] ?? app.platform.join(", "),
    ...(app.url ? { url: app.url } : {}),
    author: studioRef(),
    publisher: studioRef(),
    ...(listed ? { downloadUrl: app.appStoreUrl, sameAs: [app.appStoreUrl] } : {}),
  };
}

export function productsJsonLd(lang: Locale): string {
  const path = "/products";
  return jsonLd(
    graph([
      {
        ...pageNode(lang, path, "CollectionPage"),
        name: appsPage.metaTitle[lang],
        description: appsPage.metaDescription[lang],
        mainEntity: {
          "@type": "ItemList",
          itemListElement: orderedApps.map((app, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: appNode(app, lang),
          })),
        },
      },
      studioOrganization(),
    ]),
  );
}

export function journalIndexJsonLd(lang: Locale, entries: JournalEntry[]): string {
  const path = "/journal";
  return jsonLd(
    graph([
      {
        ...pageNode(lang, path, "CollectionPage"),
        name: journal.metaTitle[lang],
        description: journal.metaDescription[lang],
        mainEntity: {
          "@type": "ItemList",
          itemListElement: entries.map((entry, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: canonicalUrl(mainSiteUrl(lang, `/journal/${entrySlug(entry)}`)),
            name: entry.data.title,
          })),
        },
      },
      studioOrganization(),
    ]),
  );
}

export function journalEntryJsonLd(entry: JournalEntry, lang: Locale): string {
  const path = `/journal/${entrySlug(entry)}`;
  const url = canonicalUrl(mainSiteUrl(lang, path));
  const { title, date, summary, updated } = entry.data;
  return jsonLd(
    graph([
      {
        "@type": "BlogPosting",
        "@id": `${url}#article`,
        headline: title,
        description: summary,
        url,
        mainEntityOfPage: { "@id": `${url}#page` },
        datePublished: date.toISOString().slice(0, 10),
        // Only when the entry says it was revised. A build date here would be
        // a claim the page cannot back up.
        ...(updated ? { dateModified: updated.toISOString().slice(0, 10) } : {}),
        inLanguage: inLanguage(lang),
        author: creatorRef(),
        publisher: studioRef(),
        image: new URL("/assets/og.jpg", STUDIO.url).toString(),
      },
      pageNode(lang, path),
      studioOrganization(),
      studioCreator(),
    ]),
  );
}
