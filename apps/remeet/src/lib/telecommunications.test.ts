import {
  notificationNumberText,
  pendingLabel,
  TELECOM,
  telecommunicationsRows,
} from "@tomokichi/app-site/telecommunications";
import { describe, expect, it } from "vitest";
import { remeetTelecommunicationsSections } from "./telecommunications-content";

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
      "インターネット接続環境のある地域（App Storeの提供地域に準じます）",
      "髙木 友喜",
      "〒171-0044 東京都豊島区千早2丁目6-11",
      "080-6648-1475",
      "通知待ち",
      "関東総合通信局",
      TELECOM.email,
    ]);
    expect(rows.find((row) => row.term === "電話番号")?.kind).toBe("telephone");
  });

  it("does not call the operator a registered carrier in English", () => {
    const terms = telecommunicationsRows("en", "Remeet")
      .map((row) => row.term)
      .join(" ");
    expect(terms.toLowerCase()).not.toContain("registered");
  });
});

describe("Remeet important matters", () => {
  it("covers service, charges, privacy, and external transmissions", () => {
    const headings = remeetTelecommunicationsSections.map((section) => section.heading[0]);
    expect(headings).toEqual([
      "このページについて",
      "サービスの内容",
      "利用条件・料金",
      "通信の秘密・利用者情報",
      "外部サービスと送信情報",
    ]);
    expect(remeetTelecommunicationsSections[0].body[0]).toContain("正本");
    expect(remeetTelecommunicationsSections[4].body[0]).toContain("Apple iCloud / CloudKit");
  });
});
