import {
  CHILD_KINDS,
  ROOT_FIELDS,
  childDigest,
  rootFieldDigest,
  type ModerationRootField,
  type ModerationTargetKind,
} from "./moderation-digest";
import type {
  ModerationActionRecord,
  ModerationChannel,
  ModerationStore,
} from "./moderation-store";

/**
 * Remeet's moderation domain: turning an operator's decision into a row, and a
 * set of rows into the list a signed manifest is built from.
 *
 * Deliberately free of HTTP and of signing. **The signature is applied on the
 * operator's own Mac**, by `scripts/moderation.ts`, using a key held in the
 * login Keychain and present in no Cloudflare secret, no repository and no
 * database. This Worker stores and serves the result; it cannot mint one. So an
 * attacker who takes the API takes the ability to serve a stale file, and not
 * the ability to make anybody's app delete anything.
 */

export const MANIFEST_SCHEMA_VERSION = 1;

export type ModerationFailure = "INVALID_REQUEST" | "DUPLICATE_TARGET" | "NOT_FOUND" | "STALE_REVISION";

export type ModerationResult<T> = { ok: true; value: T } | { ok: false; error: ModerationFailure };

const fail = (error: ModerationFailure): ModerationResult<never> => ({ ok: false, error });
const succeed = <T>(value: T): ModerationResult<T> => ({ ok: true, value });

export interface ModerationContext {
  store: ModerationStore;
  now?: () => Date;
}

/** The subset of an action that is published. Everything else stays in D1. */
export interface PublishedAction {
  id: string;
  target: string;
  revoked?: true;
}

export interface ManifestPayload {
  schemaVersion: number;
  revision: number;
  generatedAt: string;
  expiresAt: string;
  keyID: string;
  actions: PublishedAction[];
}

const REASON_CODES = new Set([
  "sexual",
  "violence",
  "harassment",
  "illegal",
  "privacy",
  "spam",
  "other",
]);

/**
 * Records a decision, computing the digest from the content it is about.
 *
 * The digest is computed **here**, from the raw ids and value the operator
 * supplies, rather than accepted ready-made. Accepting a digest would mean the
 * database held an opaque string nobody could ever trace back to a piece of
 * content — including the operator trying to work out what they had done, and
 * including anybody checking whether a mistaken action matched what the report
 * described.
 */
export async function addAction(
  context: ModerationContext,
  body: unknown,
): Promise<ModerationResult<ModerationActionRecord>> {
  const input = body as Record<string, unknown> | null;
  if (!input) return fail("INVALID_REQUEST");

  const targetKind = input.targetKind;
  if (typeof targetKind !== "string") return fail("INVALID_REQUEST");
  const reasonCode = typeof input.reasonCode === "string" ? input.reasonCode : "";
  if (!REASON_CODES.has(reasonCode)) return fail("INVALID_REQUEST");
  const issuedBy = typeof input.issuedBy === "string" && input.issuedBy.length <= 128 ? input.issuedBy : "";
  if (!issuedBy) return fail("INVALID_REQUEST");

  const now = (context.now ?? (() => new Date()))();
  const actionId = crypto.randomUUID();
  let record: ModerationActionRecord;

  try {
    if (targetKind === "reunionField") {
      const reunionId = asUUID(input.reunionId);
      const rootField = input.rootField;
      const value = input.value;
      if (
        !reunionId ||
        typeof rootField !== "string" ||
        !ROOT_FIELDS.includes(rootField as ModerationRootField) ||
        typeof value !== "string" ||
        value.trim().length === 0
      ) {
        return fail("INVALID_REQUEST");
      }
      record = {
        actionId,
        target: await rootFieldDigest(reunionId, rootField as ModerationRootField, value),
        targetKind: "reunionField",
        contentId: null,
        reunionId,
        rootField: rootField as ModerationRootField,
        reasonCode,
        reportId: asOptionalString(input.reportId),
        note: asOptionalString(input.note),
        status: "active",
        issuedAt: now.toISOString(),
        issuedBy,
        revokedAt: null,
        revokedBy: null,
      };
    } else {
      if (!CHILD_KINDS.includes(targetKind as ModerationTargetKind)) return fail("INVALID_REQUEST");
      const contentId = asUUID(input.contentId);
      if (!contentId) return fail("INVALID_REQUEST");
      record = {
        actionId,
        target: await childDigest(targetKind as ModerationTargetKind, contentId),
        targetKind: targetKind as ModerationTargetKind,
        contentId,
        reunionId: asUUID(input.reunionId),
        rootField: null,
        reasonCode,
        reportId: asOptionalString(input.reportId),
        note: asOptionalString(input.note),
        status: "active",
        issuedAt: now.toISOString(),
        issuedBy,
        revokedAt: null,
        revokedBy: null,
      };
    }
  } catch {
    return fail("INVALID_REQUEST");
  }

  const existing = await context.store.findByTarget(record.target);
  // Not an error worth hiding: this is an operator tool, and "you already did
  // this" is the useful answer. It also keeps the manifest from carrying two
  // entries that mean the same thing forever.
  if (existing) return fail("DUPLICATE_TARGET");

  await context.store.insertAction(record);
  return succeed(record);
}

export async function revokeAction(
  context: ModerationContext,
  actionId: string,
  revokedBy: string,
): Promise<ModerationResult<{ actionId: string }>> {
  if (!actionId || !revokedBy) return fail("INVALID_REQUEST");
  const now = (context.now ?? (() => new Date()))();
  const changed = await context.store.revokeAction(actionId, now.toISOString(), revokedBy);
  return changed ? succeed({ actionId }) : fail("NOT_FOUND");
}

/**
 * Builds the payload the operator's CLI will sign.
 *
 * A revoked action stays in the list with `revoked: true` rather than being
 * dropped. Removing it would make a shorter manifest indistinguishable from a
 * rolled-back one, and the client's `revision >= minAcceptedRevision` rule
 * depends on "everything before this is still here" being true.
 *
 * @param validityDays how long the file is good for. The client refuses an
 *   expired manifest outright — additions and revocations alike — so this is
 *   the interval at which somebody has to re-sign. Ninety days, with the cron
 *   in `index.ts` mailing a warning at thirty days remaining.
 */
export async function buildManifestPayload(
  context: ModerationContext,
  keyID: string,
  channel: ModerationChannel = "production",
  validityDays = 90,
): Promise<ManifestPayload> {
  const now = (context.now ?? (() => new Date()))();
  const previous = await context.store.currentManifest(channel);
  const actions = await context.store.listActions();
  const expires = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000);
  return {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    // Always forward, including for a re-sign that changes nothing else. The
    // client's replay protection is a floor on this number, and a floor is only
    // useful if the number never repeats.
    revision: (previous?.revision ?? 0) + 1,
    generatedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    keyID,
    actions: actions.map((action) =>
      action.status === "revoked"
        ? { id: action.actionId, target: action.target, revoked: true as const }
        : { id: action.actionId, target: action.target },
    ),
  };
}

/**
 * Accepts a manifest the CLI has signed, after checking the one thing the
 * Worker is in a position to check.
 *
 * It cannot verify the signature — it has no key, deliberately — but it can
 * refuse to replace a newer manifest with an older one. That guards against the
 * ordinary accident of two operator machines, or a re-run of an old command,
 * rather than against an attacker: an attacker with the admin token could
 * simply serve whatever they liked, and it is the client's signature check that
 * stops that mattering.
 */
export async function publishManifest(
  context: ModerationContext,
  body: unknown,
): Promise<ModerationResult<{ revision: number; etag: string; channel: ModerationChannel }>> {
  const input = body as Record<string, unknown> | null;
  if (!input) return fail("INVALID_REQUEST");
  const channel: ModerationChannel = input.channel === "dev" ? "dev" : "production";
  const envelope = input.envelope;
  if (typeof envelope !== "string" || envelope.length === 0 || envelope.length > 4 * 1024 * 1024) {
    return fail("INVALID_REQUEST");
  }

  let parsed: { keyID?: unknown; payload?: unknown; signature?: unknown };
  let payload: ManifestPayload;
  try {
    parsed = JSON.parse(envelope);
    if (typeof parsed.payload !== "string" || typeof parsed.signature !== "string") {
      return fail("INVALID_REQUEST");
    }
    payload = JSON.parse(decodeBase64URL(parsed.payload)) as ManifestPayload;
  } catch {
    return fail("INVALID_REQUEST");
  }
  if (
    typeof payload.revision !== "number" ||
    typeof payload.expiresAt !== "string" ||
    typeof payload.generatedAt !== "string" ||
    typeof payload.keyID !== "string"
  ) {
    return fail("INVALID_REQUEST");
  }

  const previous = await context.store.currentManifest(channel);
  if (previous && payload.revision <= previous.revision) return fail("STALE_REVISION");

  // Derived from the revision rather than hashed from the body: it changes on
  // every publish by construction, which is exactly what an ETag has to do, and
  // it costs nothing.
  const etag = `"moderation-${channel}-${payload.revision}"`;
  await context.store.putManifest({
    channel,
    revision: payload.revision,
    generatedAt: payload.generatedAt,
    expiresAt: payload.expiresAt,
    keyId: payload.keyID,
    body: envelope,
    etag,
  });
  return succeed({ revision: payload.revision, etag, channel });
}

/** Days until the current manifest stops being accepted, or `null` if none has
 *  ever been published. Read by the nightly cron. */
export async function daysUntilManifestExpiry(
  context: ModerationContext,
): Promise<number | null> {
  // Production only. A lapsed dev manifest inconveniences one developer; a
  // lapsed production one silently stops all moderation, which is the thing
  // worth waking somebody up about.
  const manifest = await context.store.currentManifest("production");
  if (!manifest) return null;
  const now = (context.now ?? (() => new Date()))();
  const remaining = new Date(manifest.expiresAt).getTime() - now.getTime();
  return Math.floor(remaining / (24 * 60 * 60 * 1000));
}

function asUUID(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(trimmed)
    ? trimmed
    : null;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= 2048 ? value : null;
}

function decodeBase64URL(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
