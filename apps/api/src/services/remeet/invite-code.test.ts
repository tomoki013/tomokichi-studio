import { describe, expect, it } from "vitest";

import { formatInviteCode, generateInviteCode, normalizeInviteCode } from "./invite-code";

describe("invite codes", () => {
  it("avoids the characters people mistype", () => {
    const codes = Array.from({ length: 200 }, () => generateInviteCode());
    for (const code of codes) {
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{10}$/);
      expect(code).not.toMatch(/[ILOU]/);
    }
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("is shown in two halves and stored in one", () => {
    expect(formatInviteCode("7KM4PQ2X8N")).toBe("7KM4P-Q2X8N");
    expect(normalizeInviteCode("7KM4P-Q2X8N")).toBe("7KM4PQ2X8N");
  });

  /// Somebody reading a code off another phone will type what they see, not
  /// what we meant: lower case, spaces, and the letters that look like digits.
  it("accepts what a person actually types", () => {
    const expected = "7KM4PQ2X8N";
    for (const typed of [
      "7km4p-q2x8n",
      "7KM4P Q2X8N",
      " 7km4pq2x8n ",
      "7KM4P—Q2X8N",
      "7KM4P_Q2X8N",
    ]) {
      expect(normalizeInviteCode(typed)).toBe(expected);
    }
    expect(normalizeInviteCode("0123456789")).toBe("0123456789");
    expect(normalizeInviteCode("o123456789")).toBe("0123456789");
    expect(normalizeInviteCode("il23456789")).toBe("1123456789");
  });

  it("rejects anything that is not a code at all", () => {
    for (const invalid of ["", "7KM4P", "7KM4PQ2X8N7KM4P", "7KM4P-Q2X8!", undefined, 12345]) {
      expect(normalizeInviteCode(invalid)).toBeNull();
    }
  });
});
