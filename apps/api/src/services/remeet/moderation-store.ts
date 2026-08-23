import type { D1Database } from "./types";
import type { ModerationRootField, ModerationTargetKind } from "./moderation-digest";

/**
 * One decision by the operator to take a piece of shared Remeet content down.
 *
 * Only `actionId`, `target` and `status` ever leave this database — see
 * `0007_moderation.sql` for why the rest stays put.
 */
export interface ModerationActionRecord {
  actionId: string;
  target: string;
  targetKind: ModerationTargetKind;
  contentId: string | null;
  reunionId: string | null;
  rootField: ModerationRootField | null;
  reasonCode: string;
  reportId: string | null;
  note: string | null;
  status: "active" | "revoked";
  issuedAt: string;
  issuedBy: string;
  revokedAt: string | null;
  revokedBy: string | null;
}

/**
 * Which build channel a manifest is for.
 *
 * Remeet's Debug and Release builds trust different signing keys, so a test
 * publish has to have somewhere to go that a shipped build will never read.
 */
export type ModerationChannel = "production" | "dev";

/** The signed file, exactly as it will be served. */
export interface ModerationManifestRecord {
  channel: ModerationChannel;
  revision: number;
  generatedAt: string;
  expiresAt: string;
  keyId: string;
  body: string;
  etag: string;
}

export interface ModerationStore {
  insertAction(record: ModerationActionRecord): Promise<void>;
  revokeAction(actionId: string, revokedAt: string, revokedBy: string): Promise<boolean>;
  findByTarget(target: string): Promise<ModerationActionRecord | null>;
  listActions(): Promise<ModerationActionRecord[]>;
  currentManifest(channel: ModerationChannel): Promise<ModerationManifestRecord | null>;
  putManifest(record: ModerationManifestRecord): Promise<void>;
}

interface ActionRow {
  action_id: string;
  target: string;
  target_kind: string;
  content_id: string | null;
  reunion_id: string | null;
  root_field: string | null;
  reason_code: string;
  report_id: string | null;
  note: string | null;
  status: string;
  issued_at: string;
  issued_by: string;
  revoked_at: string | null;
  revoked_by: string | null;
}

interface ManifestRow {
  channel: string;
  revision: number;
  generated_at: string;
  expires_at: string;
  key_id: string;
  body: string;
  etag: string;
}

export class D1ModerationStore implements ModerationStore {
  constructor(private readonly database: D1Database) {}

  async insertAction(record: ModerationActionRecord): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO remeet_moderation_actions (
           action_id, target, target_kind, content_id, reunion_id, root_field,
           reason_code, report_id, note, status, issued_at, issued_by, revoked_at, revoked_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL)`,
      )
      .bind(
        record.actionId,
        record.target,
        record.targetKind,
        record.contentId,
        record.reunionId,
        record.rootField,
        record.reasonCode,
        record.reportId,
        record.note,
        record.status,
        record.issuedAt,
        record.issuedBy,
      )
      .run();
  }

  async revokeAction(actionId: string, revokedAt: string, revokedBy: string): Promise<boolean> {
    const result = await this.database
      .prepare(
        `UPDATE remeet_moderation_actions
            SET status = 'revoked', revoked_at = ?, revoked_by = ?
          WHERE action_id = ? AND status = 'active'`,
      )
      .bind(revokedAt, revokedBy, actionId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  async findByTarget(target: string): Promise<ModerationActionRecord | null> {
    const row = await this.database
      .prepare("SELECT * FROM remeet_moderation_actions WHERE target = ? LIMIT 1")
      .bind(target)
      .first<ActionRow>();
    return row ? toActionRecord(row) : null;
  }

  async listActions(): Promise<ModerationActionRecord[]> {
    // Ordered so a published manifest is byte-stable for the same set of
    // actions. Not required for correctness — the signature covers whatever
    // order it was written in — but a diff between two publishes should show
    // what changed rather than a reshuffle.
    const result = await this.database
      .prepare("SELECT * FROM remeet_moderation_actions ORDER BY issued_at ASC, action_id ASC")
      .all<ActionRow>();
    return (result.results ?? []).map(toActionRecord);
  }

  async currentManifest(channel: ModerationChannel): Promise<ModerationManifestRecord | null> {
    const row = await this.database
      .prepare("SELECT * FROM remeet_moderation_manifest WHERE channel = ?")
      .bind(channel)
      .first<ManifestRow>();
    if (!row) return null;
    return {
      channel,
      revision: row.revision,
      generatedAt: row.generated_at,
      expiresAt: row.expires_at,
      keyId: row.key_id,
      body: row.body,
      etag: row.etag,
    };
  }

  async putManifest(record: ModerationManifestRecord): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO remeet_moderation_manifest (channel, revision, generated_at, expires_at, key_id, body, etag)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(channel) DO UPDATE SET
           revision = excluded.revision,
           generated_at = excluded.generated_at,
           expires_at = excluded.expires_at,
           key_id = excluded.key_id,
           body = excluded.body,
           etag = excluded.etag`,
      )
      .bind(
        record.channel,
        record.revision,
        record.generatedAt,
        record.expiresAt,
        record.keyId,
        record.body,
        record.etag,
      )
      .run();
  }
}

function toActionRecord(row: ActionRow): ModerationActionRecord {
  return {
    actionId: row.action_id,
    target: row.target,
    targetKind: row.target_kind as ModerationTargetKind,
    contentId: row.content_id,
    reunionId: row.reunion_id,
    rootField: row.root_field as ModerationRootField | null,
    reasonCode: row.reason_code,
    reportId: row.report_id,
    note: row.note,
    status: row.status === "revoked" ? "revoked" : "active",
    issuedAt: row.issued_at,
    issuedBy: row.issued_by,
    revokedAt: row.revoked_at,
    revokedBy: row.revoked_by,
  };
}

/** The store the tests drive, alongside the D1 one for the same reasons as
 *  `InMemoryInviteStore`. */
export class InMemoryModerationStore implements ModerationStore {
  readonly actions = new Map<string, ModerationActionRecord>();
  readonly manifests = new Map<ModerationChannel, ModerationManifestRecord>();

  async insertAction(record: ModerationActionRecord): Promise<void> {
    for (const existing of this.actions.values()) {
      if (existing.target === record.target) throw new Error("UNIQUE constraint failed");
    }
    this.actions.set(record.actionId, { ...record });
  }

  async revokeAction(actionId: string, revokedAt: string, revokedBy: string): Promise<boolean> {
    const record = this.actions.get(actionId);
    if (!record || record.status !== "active") return false;
    this.actions.set(actionId, { ...record, status: "revoked", revokedAt, revokedBy });
    return true;
  }

  async findByTarget(target: string): Promise<ModerationActionRecord | null> {
    for (const record of this.actions.values()) {
      if (record.target === target) return { ...record };
    }
    return null;
  }

  async listActions(): Promise<ModerationActionRecord[]> {
    return [...this.actions.values()].sort((left, right) =>
      left.issuedAt === right.issuedAt
        ? left.actionId.localeCompare(right.actionId)
        : left.issuedAt.localeCompare(right.issuedAt),
    );
  }

  async currentManifest(channel: ModerationChannel): Promise<ModerationManifestRecord | null> {
    const record = this.manifests.get(channel);
    return record ? { ...record } : null;
  }

  async putManifest(record: ModerationManifestRecord): Promise<void> {
    this.manifests.set(record.channel, { ...record });
  }
}
