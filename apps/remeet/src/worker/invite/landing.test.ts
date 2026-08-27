import { describe, expect, it } from "vitest";

import { landingCopy, landingPage } from "./landing";

const page = (
  lang: string | null,
  inviteCode: string | null = null,
  appStoreURL: string | null = null,
) =>
  landingPage({
    copy: landingCopy(lang),
    appStoreURL,
    siteURL: "https://remeet.tmkch.io",
    inviteCode,
    pageURL: "https://remeet.tmkch.io/i/tok0123456789abcdef",
  });

describe("the invitation landing page", () => {
  it("speaks Japanese to a Japanese phone and English to everyone else", () => {
    expect(landingCopy("ja-JP,ja;q=0.9").lang).toBe("ja");
    expect(landingCopy("en-GB,en;q=0.9").lang).toBe("en");
    expect(landingCopy(null).lang).toBe("en");
  });

  /// The landing page is the one surface an invitation reaches that is not the
  /// app. Nothing about the share may be on it.
  it("carries no share URL and no validity verdict", () => {
    const html = page("ja", null, "https://apps.apple.com/app/id123456789");
    expect(html).not.toContain("icloud.com");
    expect(html).toContain("apps.apple.com");
    expect(html).toContain("noindex");
  });

  /// The preview is drawn by somebody else's software, often in a group chat.
  /// It is Remeet's own picture, and it says nothing about the invitation.
  it("points link previews at Remeet's own image", () => {
    const html = page("ja", "7KM4P-Q2X8N");
    expect(html).toMatch(
      /property="og:image" content="https:\/\/remeet\.tmkch\.io\/assets\/invite-preview\.png\?v=\d+"/,
    );
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    // The code is on the page for the person who opened it — never in the
    // preview a chat window would draw for everyone else.
    const head = html.slice(0, html.indexOf("</head>"));
    expect(head).not.toContain("7KM4P-Q2X8N");
  });

  it("shows the invitation code when the API had one to give", () => {
    expect(page("ja", "7KM4P-Q2X8N")).toContain("7KM4P-Q2X8N");
    expect(page("ja", "7KM4P-Q2X8N")).toContain('class="code-label"');
    // An expired or already-used invitation still explains where to get the
    // app; it simply has no code block to show.
    expect(page("ja", null)).not.toContain('class="code-label"');
  });

  /// Typing ten characters off one phone into another is the moment the code
  /// exists for, so the page saves it where it can — and still works where it
  /// cannot, because the clipboard API needs a secure context and a willing
  /// browser and neither is somebody's problem to know about.
  it("offers to copy the code, and carries no script when there is none", () => {
    const withCode = page("ja", "7KM4P-Q2X8N");
    expect(withCode).toContain('id="copy"');
    expect(withCode).toContain("navigator.clipboard");
    expect(withCode).toContain("user-select: all");
    expect(page("ja", null)).not.toContain("<script");
  });

  /// The picture is cached for a year by the site and for as long as they
  /// like by the apps that draw previews, so redrawing it has to change the
  /// URL — otherwise the old one is what everybody keeps seeing.
  it("versions every reference to the preview picture, identically", () => {
    const html = page("ja");
    const versioned = html.match(/invite-preview\.png\?v=\d+/g) ?? [];
    const unversioned = html.match(/invite-preview\.png(?!\?)/g) ?? [];

    // One missed reference is all it takes: that one keeps serving the old
    // picture for a year, from a cache nobody can reach.
    expect(unversioned).toHaveLength(0);
    expect(versioned.length).toBeGreaterThanOrEqual(3);
    expect(new Set(versioned).size).toBe(1);
  });

  it("tells link previews which page they are previewing", () => {
    expect(page("ja", "7KM4P-Q2X8N")).toContain(
      'property="og:url" content="https://remeet.tmkch.io/i/tok0123456789abcdef"',
    );
  });

  it("falls back to the site when no App Store link is configured yet", () => {
    expect(page("en")).toContain('href="https://remeet.tmkch.io"');
  });
});
