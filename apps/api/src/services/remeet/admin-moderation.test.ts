import { env } from "cloudflare:workers";
import { beforeAll, beforeEach, expect, it } from "vitest";
import initial from "../../../migrations/0007_moderation.sql?raw";
import channels from "../../../migrations/0008_moderation_channel.sql?raw";
import decisions from "../../../migrations/0009_report_decisions.sql?raw";
import { completeDecision, prepareDecision, reportDigest } from "./admin-moderation";

const db = (env as unknown as { REMEET_INVITES_DB: D1Database }).REMEET_INVITES_DB;
let keys: CryptoKeyPair;
let trustedKey: { id: string; publicKey: string };
const input = {
  reportId: "11111111-1111-4111-8111-111111111111",
  contentId: "22222222-2222-4222-8222-222222222222",
  contentType: "wish",
  reason: "spam",
  decision: "delete" as const,
  actorId: "admin",
};
const base64 = (bytes: ArrayBufferLike) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
async function sign(payload: string) {
  return JSON.stringify({
    keyID: trustedKey.id,
    payload: base64(new TextEncoder().encode(payload).buffer),
    signature: base64(
      await crypto.subtle.sign("Ed25519", keys.privateKey, new TextEncoder().encode(payload)),
    ),
  });
}
beforeAll(async () => {
  for (const sql of [initial, channels, decisions]) {
    for (const statement of sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .filter((s) => s.trim()))
      await db.prepare(statement).run();
  }
  keys = (await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"])) as CryptoKeyPair;
  const publicKey = await crypto.subtle.exportKey("raw", keys.publicKey);
  if (!(publicKey instanceof ArrayBuffer)) throw new Error("Expected a raw public key");
  trustedKey = { id: "test-key", publicKey: base64(publicKey) };
});
beforeEach(async () => {
  await db.batch(
    [
      "remeet_moderation_proposals",
      "remeet_report_decisions",
      "remeet_moderation_actions",
      "remeet_moderation_manifest",
    ].map((t) => db.prepare(`DELETE FROM ${t}`)),
  );
});
it("publishes a signed deletion atomically and accepts a retry", async () => {
  const proposal = await prepareDecision(db, input, trustedKey.id);
  expect(await db.prepare("SELECT * FROM remeet_moderation_actions").first()).toBeNull();
  const envelope = await sign(proposal.payload);
  expect(await completeDecision(db, proposal.id, envelope, trustedKey)).toEqual({ revision: 1 });
  expect(await completeDecision(db, proposal.id, envelope, trustedKey)).toEqual({ revision: 1 });
  expect((await db.prepare("SELECT * FROM remeet_moderation_actions").all()).results).toHaveLength(
    1,
  );
});
it("publishes dismissal without creating a deletion", async () => {
  const proposal = await prepareDecision(db, { ...input, decision: "dismiss" }, trustedKey.id);
  const payload = JSON.parse(proposal.payload);
  expect(payload.actions).toEqual([]);
  expect(payload.dismissedReports).toEqual([await reportDigest(input.reportId)]);
  await completeDecision(db, proposal.id, await sign(proposal.payload), trustedKey);
  expect(await db.prepare("SELECT * FROM remeet_moderation_actions").first()).toBeNull();
});
it("rejects tampered payloads and signatures without changing state", async () => {
  const proposal = await prepareDecision(db, input, trustedKey.id);
  await expect(
    completeDecision(db, proposal.id, await sign(`${proposal.payload} `), trustedKey),
  ).rejects.toThrow();
  const wrong = JSON.parse(await sign(proposal.payload));
  wrong.signature = base64(new Uint8Array(64).buffer);
  await expect(
    completeDecision(db, proposal.id, JSON.stringify(wrong), trustedKey),
  ).rejects.toThrow();
  expect(await db.prepare("SELECT * FROM remeet_moderation_manifest").first()).toBeNull();
});
it("rejects a stale decision without overwriting a newer manifest", async () => {
  const first = await prepareDecision(db, input, trustedKey.id);
  const stale = await prepareDecision(db, { ...input, decision: "dismiss" }, trustedKey.id);
  await completeDecision(db, first.id, await sign(first.payload), trustedKey);
  await expect(
    completeDecision(db, stale.id, await sign(stale.payload), trustedKey),
  ).rejects.toThrow();
  const decision = await db
    .prepare("SELECT decision FROM remeet_report_decisions")
    .first<{ decision: string }>();
  expect(decision?.decision).toBe("delete");
});
it("does not dismiss content that already has an active deletion", async () => {
  const first = await prepareDecision(db, input, trustedKey.id);
  await completeDecision(db, first.id, await sign(first.payload), trustedKey);
  await expect(
    prepareDecision(db, { ...input, decision: "dismiss" }, trustedKey.id),
  ).rejects.toThrow();
});
