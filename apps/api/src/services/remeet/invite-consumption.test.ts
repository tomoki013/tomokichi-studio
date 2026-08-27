import { beforeEach, describe, expect, it } from "vitest";

import { createInvite, type InviteServiceContext, resolveInvite } from "./invite-service";
import { InMemoryInviteStore } from "./invite-store.memory";

const SHARE_URL = "https://www.icloud.com/share/0abcdefghijklmnopqrstuvwxy";

/** A 32-byte AES key, in the Web APIs the Workers runtime actually has —
 *  `Buffer` is Node's, and pulling @types/node into the Worker's typecheck to
 *  get it would be a lot of surface for one line. */
function base64Key(fill: number): string {
  return btoa(String.fromCharCode(...new Uint8Array(32).fill(fill)));
}

/**
 * One invitation, one joiner — without breaking the ordinary case.
 *
 * The hole this closes: a forwarded Remeet link used to resolve to the CKShare
 * URL for anybody who presented it, as many times as they asked, for seven
 * days. The obvious repair (single-use) breaks retries, and a plain time window
 * does not tell a retry from a stranger because the server has no idea who is
 * asking. The attempt id is what makes that distinction possible.
 */
describe("invite consumption", () => {
  let store: InMemoryInviteStore;
  let now: Date;
  let context: InviteServiceContext;

  beforeEach(() => {
    store = new InMemoryInviteStore();
    now = new Date("2026-09-01T12:00:00Z");
    context = {
      store,
      keys: { tokenSecret: "secret", urlKey: base64Key(0) },
      baseURL: "https://remeet.tmkch.io",
      ttlDays: 7,
      now: () => now,
    };
  });

  async function mint(): Promise<string> {
    const created = await createInvite(context, { ckShareUrl: SHARE_URL });
    if (!created.ok) throw new Error("could not mint an invitation");
    return new URL(created.value.inviteUrl).pathname.split("/").pop() as string;
  }

  it("hands the share URL to the first attempt", async () => {
    const token = await mint();
    const result = await resolveInvite(context, { token, resolveAttemptId: "attempt-a" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.ckShareUrl).toBe(SHARE_URL);
  });

  /// The forwarded-link case, and the reason all of this exists.
  it("refuses a different attempt once the invitation is consumed", async () => {
    const token = await mint();
    await resolveInvite(context, { token, resolveAttemptId: "attempt-a" });
    const stranger = await resolveInvite(context, { token, resolveAttemptId: "attempt-b" });
    // Deliberately indistinguishable from unknown, expired or revoked: somebody
    // holding a forwarded link learns that it does not work, and nothing about
    // why.
    expect(stranger).toEqual({ ok: false, error: "INVITE_UNAVAILABLE" });
  });

  /// The ordinary case that a naive single-use rule would break: a dropped
  /// connection, a relaunch, or somebody tapping the link again.
  it("lets the same attempt ask again within the grace period", async () => {
    const token = await mint();
    await resolveInvite(context, { token, resolveAttemptId: "attempt-a" });
    now = new Date("2026-09-01T12:05:00Z");
    const retry = await resolveInvite(context, { token, resolveAttemptId: "attempt-a" });
    expect(retry.ok).toBe(true);
  });

  it("closes the grace period after ten minutes", async () => {
    const token = await mint();
    await resolveInvite(context, { token, resolveAttemptId: "attempt-a" });
    now = new Date("2026-09-01T12:11:00Z");
    expect(await resolveInvite(context, { token, resolveAttemptId: "attempt-a" })).toEqual({
      ok: false,
      error: "INVITE_UNAVAILABLE",
    });
  });

  /// An older build of the app sends no attempt id. It gets one resolve, which
  /// is all it ever needed; it must not be able to consume an invitation twice.
  it("gives a build with no attempt id exactly one resolve", async () => {
    const token = await mint();
    expect((await resolveInvite(context, { token })).ok).toBe(true);
    expect(await resolveInvite(context, { token })).toEqual({
      ok: false,
      error: "INVITE_UNAVAILABLE",
    });
  });

  it("rejects an attempt id that is not a plausible identifier", async () => {
    const token = await mint();
    // Garbage is treated as absent rather than accepted, so it cannot be used
    // to claim somebody else's consumption.
    await resolveInvite(context, { token, resolveAttemptId: "x" });
    expect(await resolveInvite(context, { token, resolveAttemptId: "x" })).toEqual({
      ok: false,
      error: "INVITE_UNAVAILABLE",
    });
  });

  it("does not consume an invitation that could not be decrypted", async () => {
    const token = await mint();
    const broken: InviteServiceContext = {
      ...context,
      keys: { tokenSecret: "secret", urlKey: base64Key(9) },
    };
    expect((await resolveInvite(broken, { token, resolveAttemptId: "attempt-a" })).ok).toBe(false);
    // The person never received anything, so their invitation must still work.
    expect((await resolveInvite(context, { token, resolveAttemptId: "attempt-a" })).ok).toBe(true);
  });
});
