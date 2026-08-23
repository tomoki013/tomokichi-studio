import { formatInviteCode, generateInviteCode, normalizeInviteCode } from "./invite-code";
import {
  decryptSecret,
  encryptSecret,
  hashesMatch,
  lookupHash,
  lookupHashes,
  type InviteKeys,
} from "./invite-crypto";
import type { InviteRecord, InviteStore } from "./invite-store";
import { generateManagementToken, generateURLToken, isWellFormedToken } from "./invite-tokens";

/**
 * Remeet's invitation domain: the entrance to a CloudKit share, and nothing
 * else about Remeet.
 *
 * Deliberately free of HTTP — the route layer turns these results into
 * responses. It is also free of any other app in this API: an invitation knows
 * about a CKShare URL, two tokens and an expiry, and that is the whole of it.
 *
 * Three rules the whole design rests on, worth stating before the code:
 *
 *  * a token is never stored, only `HMAC-SHA256(secret, token)`, so a copy of
 *    the database yields no working invitation;
 *  * the CKShare URL is encrypted above D1's own encryption, because it is the
 *    entrance to somebody's private CloudKit share;
 *  * every failure is the same `INVITE_UNAVAILABLE` — unknown, expired,
 *    revoked, superseded and wrong-management-token are indistinguishable from
 *    outside, so working through the space teaches nothing.
 */
export interface InviteServiceContext {
  store: InviteStore;
  keys: InviteKeys;
  /** The site, not this API: `https://remeet.tmkch.io`. */
  baseURL: string;
  ttlDays: number;
  now?: () => Date;
  /**
   * Counts what happened, by outcome and day, so abuse has a shape somebody
   * can look at. Never told which invitation, which token, or which address —
   * an audit trail that identified invitations would be the thing it is meant
   * to protect.
   */
  record?: (outcome: InviteOutcome) => Promise<void>;
}

export type InviteOutcome =
  | "created"
  | "resolved"
  | "resolve_unavailable"
  | "code_failed"
  | "previewed"
  | "revoked"
  | "rejected";

export type InviteFailure = "INVALID_REQUEST" | "INVITE_UNAVAILABLE";

export type InviteResult<T> = { ok: true; value: T } | { ok: false; error: InviteFailure };

export interface CreatedInvite {
  inviteUrl: string;
  inviteCode: string;
  managementToken: string;
  expiresAt: string;
}

/**
 * Deletes invitations well past their expiry. Run from a schedule rather than
 * from a request: the only thing that makes flooding the create endpoint worth
 * anything is rows that stay, and a nightly sweep bounds that without putting
 * a delete in front of every person sending an invitation.
 *
 * The grace period is not politeness. An invitation cannot be resolved once it
 * has expired either way; keeping the row a while longer is what stops
 * "expired" and "never existed" from being distinguishable by timing.
 */
export async function cleanUpExpiredInvites(
  store: InviteStore,
  now: Date = new Date(),
  graceMs = 24 * 60 * 60 * 1000,
): Promise<void> {
  await store.deleteExpiredBefore(new Date(now.getTime() - graceMs).toISOString());
}

/**
 * Looks a value up under every key it could have been stored with — the
 * current one, and the one being retired if a rotation is in progress.
 */
async function findBy(
  context: InviteServiceContext,
  value: string,
  find: (hash: string) => Promise<InviteRecord | null>,
): Promise<InviteRecord | null> {
  for (const hash of await lookupHashes(context.keys, value)) {
    const record = await find(hash);
    if (record) return record;
  }
  return null;
}

const fail = (error: InviteFailure): InviteResult<never> => ({ ok: false, error });
const succeed = <T>(value: T): InviteResult<T> => ({ ok: true, value });

export async function createInvite(
  context: InviteServiceContext,
  body: unknown,
): Promise<InviteResult<CreatedInvite>> {
  const ckShareUrl = readShareURL(body);
  if (!ckShareUrl) return fail("INVALID_REQUEST");
  // Optional, and rejected rather than trimmed when malformed: this ends up
  // drawn into a picture that strangers may see, so "nearly right" is not a
  // thing to be lenient about.
  const reunion = readReunion(body);
  if (reunion === INVALID) return fail("INVALID_REQUEST");

  const now = (context.now ?? (() => new Date()))();
  const id = crypto.randomUUID();
  const urlToken = generateURLToken();
  const inviteCode = generateInviteCode();
  const managementToken = generateManagementToken();
  const shareURLHash = await lookupHash(context.keys.tokenSecret, ckShareUrl);

  // A new invitation supersedes the ones before it for the same share: the old
  // link stops resolving here. That is the entrance closing, not the share —
  // CloudKit remains the only thing that decides who is actually in the
  // reunion, and anybody already inside stays inside.
  await context.store.revokeActiveForShare(shareURLHash, now.toISOString());

  const expiresAt = new Date(now.getTime() + context.ttlDays * 24 * 60 * 60 * 1000);
  await context.store.insert({
    id,
    urlTokenHash: await lookupHash(context.keys.tokenSecret, urlToken),
    inviteCodeHash: await lookupHash(context.keys.tokenSecret, inviteCode),
    shareURLHash,
    encryptedShareURL: await encryptSecret(context.keys.urlKey, id, ckShareUrl),
    encryptedInviteCode: await encryptSecret(context.keys.urlKey, id, inviteCode),
    encryptedReunion: reunion
      ? await encryptSecret(context.keys.urlKey, id, JSON.stringify(reunion))
      : null,
    managementTokenHash: await lookupHash(context.keys.tokenSecret, managementToken),
    status: "active",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    revokedAt: null,
  });

  await context.record?.("created");
  return succeed({
    inviteUrl: `${context.baseURL.replace(/\/$/, "")}/i/${urlToken}`,
    inviteCode: formatInviteCode(inviteCode),
    managementToken,
    expiresAt: expiresAt.toISOString(),
  });
}

/**
 * Token or code — the same invitation reached two ways.
 *
 * Only ever answered to the app. The landing page gets `previewInvite` below,
 * which cannot return a CKShare URL at all.
 *
 * @param onFailedCode runs when a *code* did not resolve, so the caller can
 *   charge for the attempt. A code carries around fifty bits, which is few
 *   enough that guessing is a real strategy; a link carries a hundred and
 *   sixty, which is not.
 */
export async function resolveInvite(
  context: InviteServiceContext,
  body: unknown,
  onFailedCode?: () => Promise<void>,
): Promise<InviteResult<{ ckShareUrl: string; expiresAt: string }>> {
  const token = readToken(body);
  const code = normalizeInviteCode((body as { code?: unknown } | null)?.code);
  if (!token && !code) return fail("INVALID_REQUEST");
  const attemptID = readAttemptID(body);

  const now = (context.now ?? (() => new Date()))();
  const record = token
    ? await findBy(context, token, (hash) => context.store.findByURLTokenHash(hash))
    : await findBy(context, code as string, (hash) => context.store.findByInviteCodeHash(hash));

  if (!isUsable(record, now)) {
    if (code) await onFailedCode?.();
    await context.record?.(code ? "code_failed" : "resolve_unavailable");
    return fail("INVITE_UNAVAILABLE");
  }

  // Deliberately the same failure as unknown/expired/revoked. Somebody holding
  // a forwarded link learns that it does not work, and nothing about why —
  // "already used" would tell them there is a real reunion behind it and that
  // they were a moment too late.
  if (!mayResolve(record, attemptID, now)) {
    await context.record?.("resolve_unavailable");
    return fail("INVITE_UNAVAILABLE");
  }

  try {
    const ckShareUrl = await decryptSecret(context.keys, record.id, record.encryptedShareURL);
    // Marked after the URL is in hand, so a decryption failure does not burn
    // the invitation on somebody who never received anything.
    if (!record.consumedAt) {
      await context.store.markConsumed(record.id, now.toISOString(), attemptID);
    }
    await context.record?.("resolved");
    return succeed({ ckShareUrl, expiresAt: record.expiresAt });
  } catch {
    await context.record?.("resolve_unavailable");
    return fail("INVITE_UNAVAILABLE");
  }
}

/**
 * What the landing page is allowed to know: that the invitation is live, and
 * the code somebody can type on another device.
 *
 * Not a widening — whoever is asking already holds the token, and the token
 * opens everything the code opens — but emphatically not `resolveInvite`
 * either: no CKShare URL reaches a browser, ever.
 */
export async function previewInvite(
  context: InviteServiceContext,
  body: unknown,
): Promise<InviteResult<{ inviteCode: string; expiresAt: string; reunion?: PreviewReunion }>> {
  const token = readToken(body);
  if (!token) return fail("INVALID_REQUEST");

  const now = (context.now ?? (() => new Date()))();
  const record = await findBy(context, token, (hash) => context.store.findByURLTokenHash(hash));
  if (!isUsable(record, now) || !record.encryptedInviteCode) return fail("INVITE_UNAVAILABLE");

  try {
    const code = await decryptSecret(context.keys, record.id, record.encryptedInviteCode);
    await context.record?.("previewed");
    return succeed({
      inviteCode: formatInviteCode(code),
      expiresAt: record.expiresAt,
      reunion: await previewReunion(context, record, now),
    });
  } catch {
    return fail("INVITE_UNAVAILABLE");
  }
}

export async function revokeInvite(
  context: InviteServiceContext,
  body: unknown,
): Promise<InviteResult<{ status: "revoked" }>> {
  const token = readToken(body);
  const managementToken = readManagementToken(body);
  if (!token || !managementToken) return fail("INVALID_REQUEST");

  const now = (context.now ?? (() => new Date()))();
  const record = await findBy(context, token, (hash) => context.store.findByURLTokenHash(hash));
  if (!record) return fail("INVITE_UNAVAILABLE");

  // Holding the invitation is not the same as owning it: revoking takes the
  // management token, which only the device that created the invitation ever
  // had. Otherwise anybody the link reached could close it behind them.
  const presented = await lookupHashes(context.keys, managementToken);
  if (!presented.some((hash) => hashesMatch(hash, record.managementTokenHash))) {
    return fail("INVITE_UNAVAILABLE");
  }

  if (record.status === "active") await context.store.revoke(record.id, now.toISOString());
  await context.record?.("revoked");
  return succeed({ status: "revoked" });
}

/**
 * What a reunion may contribute to a link preview.
 *
 * `reunionAt` is stored; it is never returned. What leaves the API is
 * `daysRemaining`, worked out at request time — the difference between "they
 * meet in three weeks", which says something about two people without locating
 * them in a calendar, and a date, which anybody the message was forwarded to
 * could keep.
 */
export interface StoredReunion {
  reunionAt: string;
  origin?: string;
  destination?: string;
}

export interface PreviewReunion {
  daysRemaining: number;
  origin?: string;
  destination?: string;
}

/** Distinct from `undefined`, which means "the app sent none". */
const INVALID = Symbol("invalid-reunion");

function readReunion(body: unknown): StoredReunion | undefined | typeof INVALID {
  const value = (body as { reunion?: unknown } | null)?.reunion;
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object") return INVALID;

  const { reunionAt, origin, destination } = value as Record<string, unknown>;
  if (typeof reunionAt !== "string") return INVALID;
  const at = new Date(reunionAt);
  if (Number.isNaN(at.getTime())) return INVALID;

  const place = (candidate: unknown): string | undefined | typeof INVALID => {
    if (candidate === undefined || candidate === null) return undefined;
    if (typeof candidate !== "string") return INVALID;
    const trimmed = candidate.trim();
    // Long enough for "Düsseldorf, Germany", short enough that nothing else
    // fits — a place name is all this field is for.
    if (!trimmed || [...trimmed].length > 40) return INVALID;
    return trimmed;
  };
  const from = place(origin);
  const to = place(destination);
  if (from === INVALID || to === INVALID) return INVALID;

  // Both names or neither: one end of a route is not a thing the picture can
  // draw, and it would be a stranger disclosure than the pair.
  if ((from === undefined) !== (to === undefined)) return INVALID;

  return { reunionAt: at.toISOString(), origin: from, destination: to };
}

async function previewReunion(
  context: InviteServiceContext,
  record: { id: string; encryptedReunion?: string | null },
  now: Date,
): Promise<PreviewReunion | undefined> {
  if (!record.encryptedReunion) return undefined;
  try {
    const stored = JSON.parse(
      await decryptSecret(context.keys, record.id, record.encryptedReunion),
    ) as StoredReunion;
    const at = new Date(stored.reunionAt);
    if (Number.isNaN(at.getTime())) return undefined;
    // Whole days, rounded up, floored at zero: the day itself reads as "today"
    // rather than as a countdown that has gone negative.
    const days = Math.max(0, Math.ceil((at.getTime() - now.getTime()) / 86_400_000));
    return { daysRemaining: days, origin: stored.origin, destination: stored.destination };
  } catch {
    // A reunion that will not decrypt is not a reason to fail the preview: the
    // invitation itself still works, and the picture falls back to the static
    // one.
    return undefined;
  }
}

/**
 * Only an iCloud share link is worth storing.
 *
 * This service takes a URL and hands it back later to whoever holds the token,
 * so without this it would be an open redirect service with an expiry — and
 * one that Remeet's own name vouches for.
 */
function readShareURL(body: unknown): string | null {
  const value = (body as { ckShareUrl?: unknown } | null)?.ckShareUrl;
  if (typeof value !== "string" || value.length > 2048) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "www.icloud.com" && host !== "icloud.com") return null;
  if (!url.pathname.startsWith("/share/")) return null;
  return url.toString();
}

function readToken(body: unknown): string | null {
  const value = (body as { token?: unknown } | null)?.token;
  return isWellFormedToken(value) ? value : null;
}

function readManagementToken(body: unknown): string | null {
  const value = (body as { managementToken?: unknown } | null)?.managementToken;
  return isWellFormedToken(value) ? value : null;
}

function isUsable(record: InviteRecord | null, now: Date): record is InviteRecord {
  return !!record && record.status === "active" && new Date(record.expiresAt) > now;
}

/**
 * How long after the first successful resolve the *same* attempt may ask again.
 *
 * Long enough to cover a dropped connection, a relaunch and somebody tapping
 * the link twice because nothing appeared to happen; short enough that a
 * consumed invitation is not sitting there answering questions all afternoon.
 */
const CONSUMPTION_GRACE_MS = 10 * 60 * 1000;

/**
 * Whether this attempt may have the share URL.
 *
 * The rule that matters is the second one: a *different* attempt id is refused
 * outright. That is the whole point — a plain time window would hand the URL to
 * whoever asked next, which on a forwarded invitation is exactly the person it
 * must not go to.
 *
 * An invitation consumed by an attempt this request cannot name is refused even
 * inside the grace period, and a request with no attempt id at all cannot
 * consume anything a second time. An older build of the app sends none; it gets
 * one resolve, which is what it needed anyway.
 */
function mayResolve(record: InviteRecord, attemptID: string | null, now: Date): boolean {
  if (!record.consumedAt) return true;
  if (!attemptID || record.consumedByAttempt !== attemptID) return false;
  return now.getTime() - new Date(record.consumedAt).getTime() <= CONSUMPTION_GRACE_MS;
}

function readAttemptID(body: unknown): string | null {
  const value = (body as { resolveAttemptId?: unknown } | null)?.resolveAttemptId;
  if (typeof value !== "string") return null;
  // A UUID's worth and no more. This is only ever compared for equality, so
  // there is nothing to gain by accepting anything longer.
  if (value.length < 8 || value.length > 64) return null;
  return /^[A-Za-z0-9-]+$/.test(value) ? value : null;
}
