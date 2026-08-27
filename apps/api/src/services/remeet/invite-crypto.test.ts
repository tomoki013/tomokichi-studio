import { describe, expect, it } from "vitest";

import { decryptSecret, encryptSecret, hashesMatch, lookupHash } from "./invite-crypto";
import { generateManagementToken, generateURLToken, isWellFormedToken } from "./invite-tokens";

const KEY = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
const OTHER_KEY = "Hx4dHBsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQA=";

describe("lookup hashes", () => {
  it("is stable for the same secret and value", async () => {
    expect(await lookupHash("secret", "token")).toBe(await lookupHash("secret", "token"));
  });

  /// The point of keying it: a stolen database is not a working invitation
  /// unless the Worker secret went with it.
  it("changes completely when the secret changes", async () => {
    expect(await lookupHash("secret", "token")).not.toBe(await lookupHash("other", "token"));
  });

  it("compares without leaking where two hashes diverge", () => {
    expect(hashesMatch("abcdef", "abcdef")).toBe(true);
    expect(hashesMatch("abcdef", "abcdeg")).toBe(false);
    expect(hashesMatch("abcdef", "abcde")).toBe(false);
  });
});

describe("the stored share URL", () => {
  const shareURL = "https://www.icloud.com/share/0A1b2C3d4E5f6G7h8I9j0K1l2";

  it("comes back out unchanged", async () => {
    const sealed = await encryptSecret(KEY, "invite-id", shareURL);
    expect(sealed).not.toContain("icloud");
    expect(await decryptSecret({ tokenSecret: "s", urlKey: KEY }, "invite-id", sealed)).toBe(
      shareURL,
    );
  });

  it("cannot be read with the wrong key", async () => {
    const sealed = await encryptSecret(KEY, "invite-id", shareURL);
    await expect(
      decryptSecret({ tokenSecret: "s", urlKey: OTHER_KEY }, "invite-id", sealed),
    ).rejects.toThrow();
  });

  /// The invite id is the additional authenticated data, so a ciphertext
  /// cannot be lifted from one row into another.
  it("cannot be moved to a different invitation", async () => {
    const sealed = await encryptSecret(KEY, "invite-id", shareURL);
    await expect(
      decryptSecret({ tokenSecret: "s", urlKey: KEY }, "another-invite-id", sealed),
    ).rejects.toThrow();
  });

  it("is different every time, even for the same URL", async () => {
    const first = await encryptSecret(KEY, "invite-id", shareURL);
    const second = await encryptSecret(KEY, "invite-id", shareURL);
    expect(first).not.toBe(second);
  });
});

describe("tokens", () => {
  it("are long, URL-safe and unpredictable", () => {
    const tokens = new Set(Array.from({ length: 64 }, () => generateURLToken()));
    expect(tokens.size).toBe(64);
    for (const token of tokens) {
      expect(token).toMatch(/^[A-Za-z0-9_-]{27}$/);
      expect(isWellFormedToken(token)).toBe(true);
    }
    expect(generateManagementToken().length).toBeGreaterThan(40);
  });

  it("rejects anything that could not have been issued", () => {
    expect(isWellFormedToken("short")).toBe(false);
    expect(isWellFormedToken("has spaces in it and is long enough")).toBe(false);
    expect(isWellFormedToken("../../secrets")).toBe(false);
    expect(isWellFormedToken(undefined)).toBe(false);
  });
});
