/**
 * Remeet's slice of the API app's bindings.
 *
 * Kept apart from `SupportBindings` for the reason the architecture keeps the
 * domains apart at all: `api.tmkch.io` is one Worker serving several apps, and
 * the Remeet invite service has no business reading Colorvia's or the support
 * form's configuration — or the other way round.
 */
export interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  /** D1 reports how many rows a statement touched. Used to tell "revoked it"
   *  from "there was nothing to revoke" without a second query. */
  meta?: { changes?: number };
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface RemeetInviteBindings {
  REMEET_INVITES_DB?: D1Database;
  /** HMAC key behind every lookup hash. A Worker secret; never in D1. */
  REMEET_INVITE_TOKEN_SECRET?: string;
  /** Base64 32-byte AES-GCM key wrapping the CKShare URL and the code. */
  REMEET_INVITE_URL_KEY?: string;
  /**
   * The keys being retired, set only while a rotation is in progress. Reads
   * fall back to them, so invitations already out keep working until they
   * expire; after that they can be removed. See the API app's README.
   */
  REMEET_INVITE_TOKEN_SECRET_PREVIOUS?: string;
  REMEET_INVITE_URL_KEY_PREVIOUS?: string;
  /**
   * A shared value the Remeet app sends with every invite request.
   *
   * Not authentication, and not treated as any: it ships inside the app, so
   * anybody willing to open the binary has it. What it buys is that the
   * endpoints stop answering a bare `curl`, which is most of the traffic an
   * open API on a known domain actually attracts. App Attest is the control
   * that would make this a real answer — see the invite-flow design notes.
   *
   * Unset means unenforced, so the key can be rotated without a window where
   * shipped apps are locked out: add the new one to the app, then to here.
   */
  REMEET_INVITE_CLIENT_KEY?: string;
  REMEET_INVITE_CREATE_LIMITER?: RateLimiter;
  REMEET_INVITE_RESOLVE_LIMITER?: RateLimiter;
  /** Codes are short enough to guess, so they get their own tighter budget. */
  REMEET_INVITE_CODE_LIMITER?: RateLimiter;
  REMEET_INVITE_REVOKE_LIMITER?: RateLimiter;
  /** Where invitation links live — the site, never this API. */
  REMEET_INVITE_BASE_URL?: string;
  REMEET_INVITE_TTL_DAYS?: string;
}
