import {
  notificationNumberText,
  pendingLabel,
  TELECOM,
  telecommunicationsRows,
} from "@tomokichi/app-site/telecommunications";
import { describe, expect, it } from "vitest";

describe("telecommunications notification number", () => {
  it("says the number is still awaited when none has been issued", () => {
    expect(notificationNumberText(null, pendingLabel("ja"))).toBe("通知待ち");
    expect(notificationNumberText(undefined, pendingLabel("en"))).toBe("Awaiting notification");
  });

  it("treats a blank value as no number, so no row is ever empty", () => {
    expect(notificationNumberText("   ", pendingLabel("ja"))).toBe("通知待ち");
  });

  it("shows the number itself once one is set", () => {
    expect(notificationNumberText("A-01-23456", pendingLabel("ja"))).toBe("A-01-23456");
  });
});

describe("telecommunications rows", () => {
  it("names the app, the operator and the bureau", () => {
    const rows = telecommunicationsRows("ja", "Remeet");
    expect(rows.map((row) => row.body)).toEqual([
      "Remeet",
      "髙木 友喜",
      "通知待ち",
      "関東総合通信局",
      TELECOM.email,
    ]);
  });

  it("does not call the operator a registered carrier in English", () => {
    const terms = telecommunicationsRows("en", "Remeet")
      .map((row) => row.term)
      .join(" ");
    expect(terms.toLowerCase()).not.toContain("registered");
  });
});
