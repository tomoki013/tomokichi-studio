import { describe, expect, it } from "vitest";

import {
  cleanUpExpiredInvites,
  createInvite,
  previewInvite,
  resolveInvite,
  revokeInvite,
  type InviteServiceContext,
} from "./invite-service";
import { InMemoryInviteStore } from "./invite-store.memory";

const CK_SHARE_URL = "https://www.icloud.com/share/0A1b2C3d4E5f6G7h8I9j0K1l2";

function makeContext(now = new Date("2026-08-19T00:00:00Z")): InviteServiceContext {
  return {
    store: new InMemoryInviteStore(),
    keys: {
      tokenSecret: "test-hmac-secret",
      // 32 bytes, base64.
      urlKey: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
    },
    baseURL: "https://remeet.tmkch.io",
    ttlDays: 7,
    now: () => now,
  };
}

async function mint(context: InviteServiceContext, ckShareUrl = CK_SHARE_URL) {
  const result = await createInvite(context, { ckShareUrl });
  if (!result.ok) throw new Error(`minting failed: ${result.error}`);
  return result.value;
}

function tokenOf(inviteUrl: string): string {
  return new URL(inviteUrl).pathname.replace("/i/", "");
}

describe("creating an invitation", () => {
  /// The URL a person sends is the site's, never this API's and never
  /// CloudKit's. That separation is the whole point of the public URL.
  it("returns a link on the site, not on the API and not on iCloud", async () => {
    const invite = await mint(makeContext());
    expect(invite.inviteUrl).toMatch(/^https:\/\/remeet\.tmkch\.io\/i\/[A-Za-z0-9_-]{27}$/);
    expect(JSON.stringify(invite)).not.toContain("icloud.com");
    expect(JSON.stringify(invite)).not.toContain("api.tmkch.io");
  });

  it("comes with a code a person can read out, and a seven-day life", async () => {
    const invite = await mint(makeContext());
    expect(invite.inviteCode).toMatch(/^[0-9A-HJKMNP-TV-Z]{5}-[0-9A-HJKMNP-TV-Z]{5}$/);
    expect(invite.expiresAt).toBe("2026-08-26T00:00:00.000Z");
  });

  /// A copy of the database has to be worth nothing on its own.
  it("stores no token, no code and no share URL in the clear", async () => {
    const context = makeContext();
    const invite = await mint(context);
    const stored = JSON.stringify([...(context.store as InMemoryInviteStore).records.values()]);
    expect(stored).not.toContain("icloud.com");
    expect(stored).not.toContain(tokenOf(invite.inviteUrl));
    expect(stored).not.toContain(invite.managementToken);
    expect(stored).not.toContain(invite.inviteCode.replace("-", ""));
  });

  it("takes iCloud share links and nothing else", async () => {
    const context = makeContext();
    for (const ckShareUrl of [
      "https://example.com/share/abc",
      "http://www.icloud.com/share/abc",
      "https://www.icloud.com/photos/abc",
      "https://icloud.com.attacker.test/share/abc",
      42,
    ]) {
      const result = await createInvite(context, { ckShareUrl });
      expect(result.ok).toBe(false);
    }
  });

  /// Re-inviting is ordinary, and the design says the previous link stops
  /// working when it happens.
  it("supersedes the invitations already out for the same share", async () => {
    const context = makeContext();
    const first = await mint(context);
    const second = await mint(context);

    expect((await resolveInvite(context, { token: tokenOf(first.inviteUrl) })).ok).toBe(false);
    expect((await resolveInvite(context, { code: first.inviteCode })).ok).toBe(false);
    expect((await resolveInvite(context, { token: tokenOf(second.inviteUrl) })).ok).toBe(true);
  });
});

describe("keeping the table from growing forever", () => {
  /// The only thing that makes flooding the create endpoint worth anything is
  /// rows that stay. The nightly sweep is what stops them.
  it("drops invitations that expired more than a day ago", async () => {
    const context = makeContext();
    await mint(context);

    await cleanUpExpiredInvites(context.store, new Date("2026-09-19T00:00:00Z"));
    expect((context.store as InMemoryInviteStore).records.size).toBe(0);
  });

  /// Deleting the instant an invitation lapses would make "expired" and
  /// "never existed" tell themselves apart by how long the answer took.
  it("keeps one just past its expiry", async () => {
    const context = makeContext();
    await mint(context);

    await cleanUpExpiredInvites(context.store, new Date("2026-08-26T06:00:00Z"));
    expect((context.store as InMemoryInviteStore).records.size).toBe(1);
  });
});

describe("the audit trail", () => {
  /// What it can answer is "is somebody working through the code space" —
  /// which is `code_failed` climbing away from `resolved`. What it cannot
  /// answer is anything about a particular invitation or person, and that is
  /// the point.
  it("counts outcomes by day and nothing else", async () => {
    const store = new InMemoryInviteStore();
    const context: InviteServiceContext = {
      ...makeContext(),
      store,
      record: (outcome) => store.countOutcome("2026-08-19", outcome),
    };

    const invite = await mint(context);
    await resolveInvite(context, { code: invite.inviteCode });
    await resolveInvite(context, { code: "7KM4P-Q2X8N" });

    expect(store.outcomes.get("2026-08-19/created")).toBe(1);
    expect(store.outcomes.get("2026-08-19/resolved")).toBe(1);
    expect(store.outcomes.get("2026-08-19/code_failed")).toBe(1);
    expect([...store.outcomes.keys()].join()).not.toContain(invite.inviteCode);
  });
});

describe("rotating the keys", () => {
  /// A rotation must cost nothing to the invitations already in people's
  /// messages: they were hashed and sealed with the old key, and they have to
  /// keep working until they expire.
  it("still resolves invitations minted with the previous keys", async () => {
    const old = makeContext();
    const invite = await mint(old);

    const rotated: InviteServiceContext = {
      ...old,
      keys: {
        tokenSecret: "rotated-hmac-secret",
        urlKey: "Hx4dHBsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQA=",
        previousTokenSecret: old.keys.tokenSecret,
        previousURLKey: old.keys.urlKey,
      },
    };

    // One attempt id for both, because this is one person joining: they tried
    // the link, then typed the code. Since 0006 an invitation is consumed by
    // the first successful resolve and only the attempt that consumed it may
    // ask again — see invite-consumption.test.ts.
    const attempt = { resolveAttemptId: "attempt-rotation" };
    const byLink = await resolveInvite(rotated, { token: tokenOf(invite.inviteUrl), ...attempt });
    const byCode = await resolveInvite(rotated, { code: invite.inviteCode, ...attempt });
    expect(byLink.ok && byLink.value.ckShareUrl).toBe(CK_SHARE_URL);
    expect(byCode.ok && byCode.value.ckShareUrl).toBe(CK_SHARE_URL);

    // And it can still be closed by the device that made it.
    const revoked = await revokeInvite(rotated, {
      token: tokenOf(invite.inviteUrl),
      managementToken: invite.managementToken,
    });
    expect(revoked.ok).toBe(true);
  });

  /// Once the old keys are dropped, so is everything written under them —
  /// which is why the retiring pair is kept for longer than an invitation
  /// lives.
  it("cannot read them once the previous keys are gone", async () => {
    const old = makeContext();
    const invite = await mint(old);

    const dropped: InviteServiceContext = {
      ...old,
      keys: {
        tokenSecret: "rotated-hmac-secret",
        urlKey: "Hx4dHBsaGRgXFhUUExIREA8ODQwLCgkIBwYFBAMCAQA=",
      },
    };
    expect((await resolveInvite(dropped, { token: tokenOf(invite.inviteUrl) })).ok).toBe(false);
  });
});

describe("resolving an invitation", () => {
  it("hands the app the share URL, by link or by code", async () => {
    const context = makeContext();
    const invite = await mint(context);

    // Both routes, one joiner: the same attempt id, because this is somebody
    // trying the link and then the code, not two different people.
    const attempt = { resolveAttemptId: "attempt-both-routes" };
    const byLink = await resolveInvite(context, { token: tokenOf(invite.inviteUrl), ...attempt });
    const byCode = await resolveInvite(context, { code: invite.inviteCode, ...attempt });
    expect(byLink.ok && byLink.value.ckShareUrl).toBe(CK_SHARE_URL);
    expect(byCode.ok && byCode.value.ckShareUrl).toBe(CK_SHARE_URL);
  });

  /// Somebody reading a code off another phone types what they see.
  it("accepts a code however it was typed", async () => {
    const context = makeContext();
    const invite = await mint(context);
    const typed = invite.inviteCode.replace("-", " ").toLowerCase();
    expect((await resolveInvite(context, { code: typed })).ok).toBe(true);
  });

  it("says the same thing about unknown, expired, revoked and superseded", async () => {
    const context = makeContext();
    const invite = await mint(context);
    const token = tokenOf(invite.inviteUrl);

    const unknown = await resolveInvite(context, { token: "Zm9yZ2VkLXRva2VuLXZhbHVl" });
    expect(unknown).toEqual({ ok: false, error: "INVITE_UNAVAILABLE" });

    const later = { ...context, now: () => new Date("2026-09-19T00:00:00Z") };
    expect(await resolveInvite(later, { token })).toEqual({ ok: false, error: "INVITE_UNAVAILABLE" });

    await revokeInvite(context, { token, managementToken: invite.managementToken });
    expect(await resolveInvite(context, { token })).toEqual({ ok: false, error: "INVITE_UNAVAILABLE" });
    expect(await resolveInvite(context, { code: invite.inviteCode })).toEqual({
      ok: false,
      error: "INVITE_UNAVAILABLE",
    });
  });

  it("rejects a malformed token or code before touching storage", async () => {
    const context = makeContext();
    expect((await resolveInvite(context, { token: "../../etc/passwd" })).ok).toBe(false);
    expect((await resolveInvite(context, { code: "nope" })).ok).toBe(false);
    expect((await resolveInvite(context, {})).ok).toBe(false);
  });

  /// A wrong code is the attempt worth making expensive; a wrong link is not
  /// worth making at all, so only the first is reported for charging.
  it("reports a wrong code, and only a wrong code, so it can be charged for", async () => {
    const context = makeContext();
    await mint(context);
    let charged = 0;
    const charge = async () => {
      charged += 1;
    };

    await resolveInvite(context, { code: "7KM4P-Q2X8N" }, charge);
    expect(charged).toBe(1);

    await resolveInvite(context, { token: "Zm9yZ2VkLXRva2VuLXZhbHVl" }, charge);
    expect(charged).toBe(1);
  });
});

describe("what the landing page may ask", () => {
  it("gets the code, and never the share URL", async () => {
    const context = makeContext();
    const invite = await mint(context);
    const preview = await previewInvite(context, { token: tokenOf(invite.inviteUrl) });

    expect(preview.ok && preview.value.inviteCode).toBe(invite.inviteCode);
    expect(JSON.stringify(preview)).not.toContain("icloud.com");
  });

  it("gets nothing once the invitation is no longer usable", async () => {
    const context = makeContext();
    const invite = await mint(context);
    const token = tokenOf(invite.inviteUrl);
    await revokeInvite(context, { token, managementToken: invite.managementToken });

    expect(await previewInvite(context, { token })).toEqual({ ok: false, error: "INVITE_UNAVAILABLE" });
  });

  /// The preview endpoint takes a token, so it cannot be used to check codes.
  it("cannot be asked about a code", async () => {
    const context = makeContext();
    const invite = await mint(context);
    expect(await previewInvite(context, { code: invite.inviteCode })).toEqual({
      ok: false,
      error: "INVALID_REQUEST",
    });
  });
});

describe("revoking an invitation", () => {
  it("needs the management token, not just the link", async () => {
    const context = makeContext();
    const invite = await mint(context);
    const token = tokenOf(invite.inviteUrl);

    const withoutOwnership = await revokeInvite(context, {
      token,
      managementToken: "c29tZWJvZHktZWxzZXMtdG9rZW4",
    });
    expect(withoutOwnership).toEqual({ ok: false, error: "INVITE_UNAVAILABLE" });
    expect((await resolveInvite(context, { token })).ok).toBe(true);

    const owner = await revokeInvite(context, { token, managementToken: invite.managementToken });
    expect(owner.ok).toBe(true);
    expect((await resolveInvite(context, { token })).ok).toBe(false);
  });

  it("is safe to repeat", async () => {
    const context = makeContext();
    const invite = await mint(context);
    const payload = { token: tokenOf(invite.inviteUrl), managementToken: invite.managementToken };
    expect((await revokeInvite(context, payload)).ok).toBe(true);
    expect((await revokeInvite(context, payload)).ok).toBe(true);
  });
});
