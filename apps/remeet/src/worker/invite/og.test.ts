import { describe, expect, it } from "vitest";

import coverage from "./fonts/coverage.json";
import { inviteOGSVG, isDrawable, OG_EN, OG_JA, ogCopy } from "./og";

const COVERAGE = coverage.sans;

/**
 * What the picture beside an invitation is allowed to say.
 *
 * These are about disclosure as much as drawing. The invitation URL is a
 * bearer token that gets forwarded, quoted and pasted into group chats, so
 * every one of these checks the same thing from a different angle: nothing
 * reaches the image that the person sending it did not choose to put there.
 */
describe("the invitation preview image", () => {
  it("draws the countdown", () => {
    const svg = inviteOGSVG({ daysRemaining: 24 }, OG_JA, COVERAGE);
    expect(svg).toContain(">24 ");
    expect(svg).toContain("次に会えるまで");
  });

  it("says today rather than counting down to zero", () => {
    const svg = inviteOGSVG({ daysRemaining: 0 }, OG_JA, COVERAGE);
    expect(svg).toContain("今日");
    expect(svg).not.toContain(">0 ");
  });

  it("never draws a negative countdown", () => {
    const svg = inviteOGSVG({ daysRemaining: -5 }, OG_EN, COVERAGE);
    expect(svg).toContain("TODAY");
    expect(svg).not.toContain("-5");
  });

  it("omits the places when the invitation did not carry them", () => {
    const svg = inviteOGSVG({ daysRemaining: 24 }, OG_JA, COVERAGE);
    expect(svg).not.toContain("東京");
    // The route is drawn either way, so an invitation that keeps its places
    // private is not visibly a lesser one.
    expect(svg).toContain('<path d="M300 528');
  });

  it("draws the places when it did", () => {
    const svg = inviteOGSVG(
      { daysRemaining: 24, origin: "東京", destination: "大阪" },
      OG_JA,
      COVERAGE,
    );
    expect(svg).toContain("東京");
    expect(svg).toContain("大阪");
  });

  /**
   * Half a route is a stranger disclosure than the whole of it, and the layout
   * has nowhere to put one label. The API rejects the pairing too; this is the
   * second of the two locks.
   */
  it("draws neither place when only one survives", () => {
    const svg = inviteOGSVG({ daysRemaining: 24, origin: "東京" }, OG_JA, COVERAGE);
    expect(svg).not.toContain("東京");
  });

  /**
   * The font in the bundle is a subset, so an unusual place name can contain a
   * character there is no glyph for — and resvg draws those as nothing. A
   * preview short one label reads fine; one with a row of blank boxes looks
   * broken.
   */
  it("drops a label it has no glyphs for rather than drawing tofu", () => {
    const svg = inviteOGSVG(
      { daysRemaining: 24, origin: "東京", destination: "🏝️エモい町" },
      OG_JA,
      COVERAGE,
    );
    expect(svg).not.toContain("東京");
    expect(svg).toContain(">24 ");
  });

  it("knows what it can draw", () => {
    expect(isDrawable("東京", COVERAGE)).toBe(true);
    expect(isDrawable("Tokyo", COVERAGE)).toBe(true);
    expect(isDrawable("𠮷野", COVERAGE)).toBe(false);
  });

  /** A place name is markup by the time it is drawn. */
  it("escapes a label rather than letting it close a tag", () => {
    const svg = inviteOGSVG(
      { daysRemaining: 1, origin: "</text><script>x</script>", destination: "Osaka" },
      OG_EN,
      COVERAGE,
    );
    expect(svg).not.toContain("<script>");
  });

  it("caps a very long label", () => {
    const svg = inviteOGSVG(
      { daysRemaining: 1, origin: "a".repeat(200), destination: "Osaka" },
      OG_EN,
      COVERAGE,
    );
    expect(svg).not.toContain("a".repeat(19));
  });

  it("follows the reader's language, not the sender's", () => {
    expect(ogCopy("ja-JP,ja;q=0.9").lang).toBe("ja");
    expect(ogCopy("en-GB,en;q=0.9").lang).toBe("en");
    expect(ogCopy(null).lang).toBe("en");
  });

  it("uses the singular for one day", () => {
    expect(OG_EN.unit(1)).toBe("DAY");
    expect(OG_EN.unit(2)).toBe("DAYS");
  });

  /** Every character the fixed chrome needs has to be in the subset. */
  it("can draw all of its own copy", () => {
    for (const copy of [OG_JA, OG_EN]) {
      for (const line of [...copy.tagline, copy.caption, copy.today]) {
        expect(isDrawable(line, COVERAGE), line).toBe(true);
      }
    }
  });
});
