import type { ModerationProposal, ModerationRequest } from "@tomokichi/admin-contracts";
import { CHILD_KINDS, childDigest, type ModerationTargetKind } from "./moderation-digest";
import { buildManifestPayload } from "./moderation-service";
import { D1ModerationStore, type ModerationActionRecord } from "./moderation-store";

const KEY_ID = "remeet-moderation-2026-08";
// The public key trusted by the Release app. Private key stays on the operator Mac.
const PUBLIC_KEY = "Jhh671deVOPZMY360Pnw5skPvbscb80mVZl0Tu+/FYY=";

export async function reportDigest(reportId: string): Promise<string> {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`remeet.report.v1:${reportId.toLowerCase()}`),
  );
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function prepareDecision(
  db: D1Database,
  input: ModerationRequest,
  keyID = KEY_ID,
): Promise<ModerationProposal> {
  if (
    !/^[a-f0-9-]{36}$/i.test(input.reportId) ||
    !/^[a-f0-9-]{36}$/i.test(input.contentId) ||
    !CHILD_KINDS.includes(input.contentType as ModerationTargetKind) ||
    !["delete", "dismiss"].includes(input.decision)
  )
    throw new Error("Unsupported report target");
  const store = new D1ModerationStore(db);
  const payload = await buildManifestPayload({ store }, keyID);
  const target = await childDigest(input.contentType as ModerationTargetKind, input.contentId);
  const existing = await store.findByTarget(target);
  if (input.decision === "dismiss" && existing?.status === "active") {
    throw new Error("このコンテンツには削除指示があるため復元できません。");
  }
  if (input.decision === "delete" && existing?.status === "revoked") {
    throw new Error("取り消し済みの削除指示があります。運営ツールで確認してください。");
  }
  let action: ModerationActionRecord | null = null;
  if (input.decision === "delete" && !existing) {
    action = {
      actionId: crypto.randomUUID(),
      target,
      targetKind: input.contentType as ModerationTargetKind,
      contentId: input.contentId,
      reunionId: input.reunionId ?? null,
      rootField: null,
      reasonCode: input.reason,
      reportId: input.reportId,
      note: null,
      status: "active",
      issuedAt: payload.generatedAt,
      issuedBy: input.actorId,
      revokedAt: null,
      revokedBy: null,
    };
    payload.actions.push({ id: action.actionId, target });
  }
  const digest = await reportDigest(input.reportId);
  payload.dismissedReports = (payload.dismissedReports ?? []).filter((entry) => entry !== digest);
  if (input.decision === "dismiss") payload.dismissedReports.push(digest);
  const proposal = {
    id: crypto.randomUUID(),
    payload: JSON.stringify(payload),
    keyID,
    decision: input.decision,
  };
  await db
    .prepare(`INSERT INTO remeet_moderation_proposals (id,payload,request,action,base_revision,created_at)
    VALUES (?,?,?,?,?,?)`)
    .bind(
      proposal.id,
      proposal.payload,
      JSON.stringify(input),
      action ? JSON.stringify(action) : null,
      payload.revision - 1,
      payload.generatedAt,
    )
    .run();
  return proposal;
}

export async function completeDecision(
  db: D1Database,
  id: string,
  envelopeText: string,
  trustedKey = { id: KEY_ID, publicKey: PUBLIC_KEY },
): Promise<{ revision: number }> {
  const row = await db
    .prepare("SELECT * FROM remeet_moderation_proposals WHERE id = ?")
    .bind(id)
    .first<{
      payload: string;
      request: string;
      action: string | null;
      base_revision: number;
      created_at: string;
      completed_revision: number | null;
    }>();
  if (!row) throw new Error("操作が見つかりません。");
  if (row.completed_revision !== null) return { revision: row.completed_revision };
  if (Date.now() - Date.parse(row.created_at) > 15 * 60_000)
    throw new Error("操作の有効期限が切れました。やり直してください。");
  if (envelopeText.length > 4 * 1024 * 1024) throw new Error("Invalid envelope");
  const envelope = JSON.parse(envelopeText) as {
    keyID: string;
    payload: string;
    signature: string;
  };
  const bytes = decode(envelope.payload);
  if (envelope.keyID !== trustedKey.id || new TextDecoder().decode(bytes) !== row.payload)
    throw new Error("署名対象が一致しません。");
  const key = await crypto.subtle.importKey("raw", decode(trustedKey.publicKey), "Ed25519", false, [
    "verify",
  ]);
  if (!(await crypto.subtle.verify("Ed25519", key, decode(envelope.signature), bytes)))
    throw new Error("署名を確認できません。");
  const payload = JSON.parse(row.payload) as {
    revision: number;
    generatedAt: string;
    expiresAt: string;
  };
  const input = JSON.parse(row.request) as ModerationRequest;
  const statements = [
    db
      .prepare(`INSERT INTO remeet_moderation_manifest (channel,revision,generated_at,expires_at,key_id,body,etag)
    SELECT 'production',?,?,?,?,?,? WHERE ? = 0 OR EXISTS (SELECT 1 FROM remeet_moderation_manifest WHERE channel='production' AND revision=?)
    ON CONFLICT(channel) DO UPDATE SET revision=excluded.revision,generated_at=excluded.generated_at,
      expires_at=excluded.expires_at,key_id=excluded.key_id,body=excluded.body,etag=excluded.etag
    WHERE remeet_moderation_manifest.revision=?`)
      .bind(
        payload.revision,
        payload.generatedAt,
        payload.expiresAt,
        trustedKey.id,
        envelopeText,
        `"moderation-production-${payload.revision}"`,
        row.base_revision,
        row.base_revision,
        row.base_revision,
      ),
  ];
  const guard =
    "EXISTS (SELECT 1 FROM remeet_moderation_manifest WHERE channel='production' AND body=?)";
  if (row.action) {
    const a = JSON.parse(row.action) as ModerationActionRecord;
    statements.push(
      db
        .prepare(`INSERT INTO remeet_moderation_actions
      (action_id,target,target_kind,content_id,reunion_id,root_field,reason_code,report_id,note,status,issued_at,issued_by,revoked_at,revoked_by)
      SELECT ?,?,?,?,?,NULL,?,?,NULL,'active',?,?,NULL,NULL WHERE ${guard}`)
        .bind(
          a.actionId,
          a.target,
          a.targetKind,
          a.contentId,
          a.reunionId,
          a.reasonCode,
          a.reportId,
          a.issuedAt,
          a.issuedBy,
          envelopeText,
        ),
    );
  }
  statements.push(
    db
      .prepare(`INSERT INTO remeet_report_decisions (report_id,decision,report_digest,decided_at)
    SELECT ?,?,?,? WHERE ${guard}
    ON CONFLICT(report_id) DO UPDATE SET decision=excluded.decision, report_digest=excluded.report_digest, decided_at=excluded.decided_at`)
      .bind(
        input.reportId,
        input.decision,
        await reportDigest(input.reportId),
        payload.generatedAt,
        envelopeText,
      ),
  );
  statements.push(
    db
      .prepare(
        `UPDATE remeet_moderation_proposals SET completed_revision=? WHERE id=? AND ${guard}`,
      )
      .bind(payload.revision, id, envelopeText),
  );
  const results = await db.batch(statements);
  if (!results[0]?.meta.changes)
    throw new Error("別の操作が先に反映されました。再度実行してください。");
  return { revision: payload.revision };
}

function decode(value: string): Uint8Array<ArrayBuffer> {
  const base = value.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base.padEnd(Math.ceil(base.length / 4) * 4, "=")), (c) =>
    c.charCodeAt(0),
  );
}
