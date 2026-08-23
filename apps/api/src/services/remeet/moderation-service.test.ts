import { beforeEach, describe, expect, it } from "vitest";

import {
  addAction,
  buildManifestPayload,
  daysUntilManifestExpiry,
  publishManifest,
  revokeAction,
  type ModerationContext,
} from "./moderation-service";
import { childDigest, rootFieldDigest } from "./moderation-digest";
import { InMemoryModerationStore } from "./moderation-store";

const CONTENT_ID = "6f9619ff-8b86-d011-b42d-00cf4fc964ff";
const REUNION_ID = "1b4e28ba-2fa1-11d2-883f-0016d3cca427";

/** base64url without Node's `Buffer`, which the Workers typecheck does not
 *  declare. */
function base64url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

describe("moderation service", () => {
  let store: InMemoryModerationStore;
  let context: ModerationContext;

  beforeEach(() => {
    store = new InMemoryModerationStore();
    context = { store, now: () => new Date("2026-09-01T12:00:00Z") };
  });

  const child = (over: Record<string, unknown> = {}) =>
    addAction(context, {
      targetKind: "wish",
      contentId: CONTENT_ID,
      reunionId: REUNION_ID,
      reasonCode: "harassment",
      issuedBy: "tomokichi",
      ...over,
    });

  // MARK: Recording

  it("computes the digest rather than accepting one", async () => {
    const result = await child();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The digest is derived here, so the row can always be traced back to the
    // content it was about — including by the operator trying to work out what
    // they did.
    expect(result.value.target).toBe(await childDigest("wish", CONTENT_ID));
    expect(result.value.contentId).toBe(CONTENT_ID);
  });

  it("computes a value-scoped digest for a root field", async () => {
    const result = await addAction(context, {
      targetKind: "reunionField",
      reunionId: REUNION_ID,
      rootField: "sharedGroupDisplayName",
      value: "違反表現",
      reasonCode: "harassment",
      issuedBy: "tomokichi",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.target).toBe(
      await rootFieldDigest(REUNION_ID, "sharedGroupDisplayName", "違反表現"),
    );
  });

  it("refuses a kind it does not know", async () => {
    const result = await child({ targetKind: "reunion" });
    expect(result).toEqual({ ok: false, error: "INVALID_REQUEST" });
  });

  it("refuses an unknown reason code", async () => {
    expect(await child({ reasonCode: "because" })).toEqual({ ok: false, error: "INVALID_REQUEST" });
  });

  it("refuses a malformed content id", async () => {
    expect(await child({ contentId: "not-a-uuid" })).toEqual({ ok: false, error: "INVALID_REQUEST" });
  });

  it("refuses a root field action with no value", async () => {
    const result = await addAction(context, {
      targetKind: "reunionField",
      reunionId: REUNION_ID,
      rootField: "sharedGroupDisplayName",
      value: "   ",
      reasonCode: "harassment",
      issuedBy: "tomokichi",
    });
    expect(result).toEqual({ ok: false, error: "INVALID_REQUEST" });
  });

  it("refuses the same target twice", async () => {
    expect((await child()).ok).toBe(true);
    expect(await child()).toEqual({ ok: false, error: "DUPLICATE_TARGET" });
  });

  // MARK: Revoking

  it("marks an action revoked rather than deleting it", async () => {
    const created = await child();
    if (!created.ok) throw new Error("setup");
    expect(await revokeAction(context, created.value.actionId, "tomokichi")).toEqual({
      ok: true,
      value: { actionId: created.value.actionId },
    });
    const rows = await store.listActions();
    // Still one row. Dropping it would make a shorter manifest
    // indistinguishable from a rolled-back one.
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("revoked");
  });

  it("reports revoking something that is not there", async () => {
    expect(await revokeAction(context, "6f9619ff-0000-0000-0000-00cf4fc964ff", "tomokichi")).toEqual({
      ok: false,
      error: "NOT_FOUND",
    });
  });

  // MARK: The manifest

  it("publishes only the id, the target and revocation", async () => {
    const created = await child();
    if (!created.ok) throw new Error("setup");
    await revokeAction(context, created.value.actionId, "tomokichi");
    const payload = await buildManifestPayload(context, "key-1");

    expect(payload.actions).toEqual([
      { id: created.value.actionId, target: created.value.target, revoked: true },
    ]);
    // Everything an operator needs stays in D1. A public file listing why each
    // person was moderated would be a worse thing to exist than a vague one.
    const serialised = JSON.stringify(payload);
    for (const leak of ["harassment", CONTENT_ID, REUNION_ID, "tomokichi", "wish"]) {
      expect(serialised, `manifest leaked ${leak}`).not.toContain(leak);
    }
  });

  it("moves the revision forward on every publish", async () => {
    const first = await buildManifestPayload(context, "key-1");
    expect(first.revision).toBe(1);
    await publish(first);
    const second = await buildManifestPayload(context, "key-1");
    expect(second.revision).toBe(2);
  });

  it("refuses to replace a newer manifest with an older one", async () => {
    await publish(await buildManifestPayload(context, "key-1"));
    await publish({ ...(await buildManifestPayload(context, "key-1")), revision: 5 });
    const stale = { ...(await buildManifestPayload(context, "key-1")), revision: 3 };
    expect(await publishManifest(context, { envelope: envelopeFor(stale) })).toEqual({
      ok: false,
      error: "STALE_REVISION",
    });
  });

  it("stores the exact bytes it was given", async () => {
    const payload = await buildManifestPayload(context, "key-1");
    const envelope = envelopeFor(payload);
    await publishManifest(context, { envelope });
    // Byte-for-byte: the signature covers these bytes, so re-serialising
    // anywhere between here and the device would invalidate it.
    expect((await store.currentManifest("production"))?.body).toBe(envelope);
  });

  it("refuses an envelope that is not JSON", async () => {
    expect(await publishManifest(context, { envelope: "nope" })).toEqual({
      ok: false,
      error: "INVALID_REQUEST",
    });
  });

  // MARK: Expiry warning

  it("counts the days until the manifest stops being accepted", async () => {
    await publish(await buildManifestPayload(context, "key-1"));
    expect(await daysUntilManifestExpiry(context)).toBe(90);

    const later: ModerationContext = { store, now: () => new Date("2026-11-15T12:00:00Z") };
    // Inside the thirty-day window the cron mails about, which is the whole
    // point: signing is manual, and an expired manifest silently stops all new
    // moderation.
    expect(await daysUntilManifestExpiry(later)).toBeLessThan(30);
  });

  it("says nothing about expiry before anything has been published", async () => {
    expect(await daysUntilManifestExpiry(context)).toBeNull();
  });

  // MARK: Channels

  /// Debug and Release trust different signing keys, so a test publish needs
  /// somewhere to land that a shipped build will never read. Without this the
  /// Debug build points at a URL nobody serves — configured-looking and inert.
  it("keeps the dev channel separate from production", async () => {
    await publish(await buildManifestPayload(context, "key-prod", "production"));
    await publish(
      { ...(await buildManifestPayload(context, "key-dev", "dev")), revision: 1 },
      "dev",
    );

    const production = await store.currentManifest("production");
    const dev = await store.currentManifest("dev");
    expect(production?.keyId).toBe("key-prod");
    expect(dev?.keyId).toBe("key-dev");
    // Separate revision lines: publishing to dev must not bump production's
    // floor, or a dev rehearsal would make the next production publish look
    // like a rollback.
    expect(production?.revision).toBe(1);
    expect(dev?.revision).toBe(1);
    expect(production?.etag).not.toBe(dev?.etag);
  });

  it("warns only about the production manifest expiring", async () => {
    // A lapsed dev manifest inconveniences one developer; a lapsed production
    // one silently stops all moderation.
    await publish({ ...(await buildManifestPayload(context, "key-dev", "dev")), revision: 1 }, "dev");
    expect(await daysUntilManifestExpiry(context)).toBeNull();
  });

  function envelopeFor(payload: unknown): string {
    return JSON.stringify({
      keyID: "key-1",
      payload: base64url(JSON.stringify(payload)),
      signature: "not-checked-here",
    });
  }

  async function publish(payload: unknown, channel: "production" | "dev" = "production"): Promise<void> {
    const result = await publishManifest(context, { envelope: envelopeFor(payload), channel });
    if (!result.ok) throw new Error(result.error);
  }
});
