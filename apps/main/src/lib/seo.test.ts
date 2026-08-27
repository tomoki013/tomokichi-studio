import {
  appApplicationGraph,
  appEntityId,
  buildRobotsTxt,
  buildSitemapXml,
  canonicalUrl,
  jsonLd,
  STUDIO,
  STUDIO_ID,
  studioOrganization,
} from "@tomokichi/app-site/seo";
import { mainSiteUrl } from "@tomokichi/app-site/urls";
import { describe, expect, it } from "vitest";
import { orderedApps } from "../data/apps";
import { homeJsonLd, journalEntryJsonLd, productsJsonLd } from "./structured-data";

describe("canonicalUrl", () => {
  it("gives every page the trailing-slash form Cloudflare answers with", () => {
    expect(canonicalUrl("https://tmkch.io", "/about")).toBe("https://tmkch.io/about/");
    expect(canonicalUrl("https://tmkch.io", "/about/")).toBe("https://tmkch.io/about/");
    expect(canonicalUrl("https://tmkch.io", "/")).toBe("https://tmkch.io/");
  });

  it("keeps the locale prefix when given a full URL", () => {
    expect(canonicalUrl(mainSiteUrl("ja", "/journal/x"))).toBe("https://tmkch.io/ja/journal/x/");
    expect(canonicalUrl(mainSiteUrl("en", "/journal/x"))).toBe("https://tmkch.io/journal/x/");
  });

  it("drops query and fragment, which never belong in a canonical", () => {
    expect(canonicalUrl("https://tmkch.io", "/support?app=yohaku#form")).toBe(
      "https://tmkch.io/support/",
    );
  });
});

describe("buildRobotsTxt", () => {
  const robots = buildRobotsTxt({ siteUrl: "https://yohaku.tmkch.io" });

  it("points at this host's own sitemap", () => {
    expect(robots).toContain("Sitemap: https://yohaku.tmkch.io/sitemap.xml");
  });

  it("lets search and AI-search crawlers through", () => {
    for (const agent of ["Googlebot", "OAI-SearchBot", "Claude-SearchBot", "Claude-User"]) {
      const group = robots.slice(robots.indexOf(`User-agent: ${agent}`));
      expect(group.slice(0, group.indexOf("\n\n"))).toContain("Allow: /");
    }
  });

  it("never disallows the whole site", () => {
    expect(robots).not.toContain("Disallow: /\n");
  });

  it("keeps training crawlers a separate decision, and search open either way", () => {
    const closed = buildRobotsTxt({ siteUrl: "https://yohaku.tmkch.io", aiTraining: "disallow" });
    for (const agent of ["GPTBot", "ClaudeBot", "Google-Extended"]) {
      expect(closed).toContain(`User-agent: ${agent}\nDisallow: /`);
    }
    expect(closed).toContain("User-agent: OAI-SearchBot\nAllow: /");
    expect(closed).toContain("User-agent: Claude-SearchBot\nAllow: /");
  });
});

describe("buildSitemapXml", () => {
  it("deduplicates, sorts and escapes", () => {
    const xml = buildSitemapXml([
      "https://tmkch.io/b/",
      "https://tmkch.io/a/",
      "https://tmkch.io/b/",
      "https://tmkch.io/c/?a=1&b=2",
    ]);
    expect(xml.match(/<loc>/g)).toHaveLength(3);
    expect(xml.indexOf("/a/")).toBeLessThan(xml.indexOf("/b/"));
    expect(xml).toContain("&amp;");
  });
});

describe("jsonLd", () => {
  it("escapes a closing script tag out of the payload", () => {
    const encoded = jsonLd({ name: "</script><script>alert(1)</script>" });
    expect(encoded).not.toContain("</script>");
    expect(JSON.parse(encoded).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("the studio as one entity", () => {
  it("is the same organisation everywhere it is referenced", () => {
    const onProduct = studioOrganization();
    expect(onProduct["@id"]).toBe(STUDIO_ID.studio);
    expect(onProduct.name).toBe("Tomokichi Studio");
    expect(onProduct.alternateName).toBe(STUDIO.shortName);
  });

  it("never claims to be a legal entity", () => {
    const serialised = `${homeJsonLd("en")}${productsJsonLd("en")}`;
    for (const property of ["legalName", "taxID", "vatID", "duns"]) {
      expect(serialised).not.toContain(property);
    }
  });

  it("carries no ratings or reviews, because there are none to report", () => {
    const serialised = `${homeJsonLd("en")}${productsJsonLd("ja")}`;
    for (const property of ["aggregateRating", "ratingValue", "ratingCount", '"review"']) {
      expect(serialised).not.toContain(property);
    }
  });
});

describe("app entities", () => {
  it("only describes an app as obtainable once it is on the App Store", () => {
    const unreleased = appApplicationGraph({
      siteUrl: "https://tripory.tmkch.io",
      name: "Tripory",
      description: "…",
      applicationCategory: "TravelApplication",
      operatingSystem: "iOS 26 or later",
    });
    const app = (unreleased["@graph"] as Record<string, unknown>[])[0];
    expect(app.offers).toBeUndefined();
    expect(app.downloadUrl).toBeUndefined();
    expect(app["@id"]).toBe(appEntityId("https://tripory.tmkch.io"));

    const released = appApplicationGraph({
      siteUrl: "https://yohaku.tmkch.io",
      name: "Yohaku",
      description: "…",
      applicationCategory: "LifestyleApplication",
      operatingSystem: "iOS 17.0 or later",
      appStoreUrl: "https://apps.apple.com/app/id6798718923",
    });
    const listed = (released["@graph"] as Record<string, unknown>[])[0];
    expect(listed.downloadUrl).toBe("https://apps.apple.com/app/id6798718923");
    expect((listed.offers as Record<string, unknown>[])[0].availability).toBe(
      "https://schema.org/InStock",
    );
  });

  it("matches what the Products page says about each app's status", () => {
    const parsed = JSON.parse(productsJsonLd("en"));
    const items = parsed["@graph"][0].mainEntity.itemListElement as {
      item: Record<string, unknown>;
    }[];
    expect(items).toHaveLength(orderedApps.length);

    for (const { item } of items) {
      const app = orderedApps.find((candidate) => candidate.name === item.name);
      expect(app).toBeDefined();
      const downloadable = app?.status === "released" && Boolean(app.appStoreUrl);
      expect(Boolean(item.downloadUrl)).toBe(downloadable);
    }
  });
});

describe("journal structured data", () => {
  const entry = {
    id: "en/example",
    data: {
      title: "Example",
      summary: "One line.",
      date: new Date("2026-08-01T00:00:00Z"),
      category: "thought",
      products: [],
      related: [],
      current: false,
      draft: false,
    },
  };

  it("reports the publication date and nothing it cannot back up", () => {
    const parsed = JSON.parse(journalEntryJsonLd(entry as never, "en"));
    const article = parsed["@graph"][0];
    expect(article["@type"]).toBe("BlogPosting");
    expect(article.datePublished).toBe("2026-08-01");
    expect(article.dateModified).toBeUndefined();
    expect(article.author["@id"]).toBe(STUDIO_ID.creator);
    expect(article.publisher["@id"]).toBe(STUDIO_ID.studio);
  });

  it("reports dateModified only when the entry was genuinely revised", () => {
    const revised = {
      ...entry,
      data: { ...entry.data, updated: new Date("2026-08-20T00:00:00Z") },
    };
    const parsed = JSON.parse(journalEntryJsonLd(revised as never, "ja"));
    expect(parsed["@graph"][0].dateModified).toBe("2026-08-20");
    expect(parsed["@graph"][0].url).toBe("https://tmkch.io/ja/journal/example/");
  });
});
