import type { Context, Hono } from "hono";

import {
  createInvite,
  type InviteFailure,
  type InviteServiceContext,
  previewInvite,
  resolveInvite,
  revokeInvite,
} from "../../services/remeet/invite-service";
import { D1InviteStore } from "../../services/remeet/invite-store";
import type { RateLimiter, RemeetInviteBindings } from "../../services/remeet/types";
import type { SupportBindings } from "../../support/types";

/**
 * `https://api.tmkch.io/remeet/v1/invites…`
 *
 * The version is in the path from the first day, so an older build of the app
 * keeps working when a `v2` becomes necessary. The public invitation URL that
 * people actually see and send is not here at all — it lives on
 * `remeet.tmkch.io`, and stays stable even if everything below this line is
 * replaced.
 *
 * These endpoints answer 503 until the database and both secrets exist, rather
 * than throwing per request or, worse, storing a share URL they cannot
 * protect.
 */
export type ApiBindings = SupportBindings & RemeetInviteBindings;

type InviteApp = Hono<{ Bindings: ApiBindings }>;
type InviteContext = Context<{ Bindings: ApiBindings }>;

const ROUTE = "/remeet/v1/invites";
/** How many extra units of the code budget a wrong code costs. */
const FAILED_CODE_PENALTY = 4;
const MAX_BODY_BYTES = 8 * 1024;

export function registerRemeetInviteRoutes(app: InviteApp): void {
  app.post(ROUTE, async (c) => {
    if (!fromRemeet(c)) return rejected(c);
    const context = inviteContext(c);
    if (!context) return serviceUnavailable(c);
    if (!(await withinRateLimit(c, c.env.REMEET_INVITE_CREATE_LIMITER))) return rateLimited(c);

    const body = await readBody(c);
    if (body === undefined) return failure(c, "INVALID_REQUEST");
    return respond(c, await createInvite(context, body), 201);
  });

  app.post(`${ROUTE}/resolve`, async (c) => {
    if (!fromRemeet(c)) return rejected(c);
    const context = inviteContext(c);
    if (!context) return serviceUnavailable(c);

    const body = await readBody(c);
    if (body === undefined) return failure(c, "INVALID_REQUEST");

    // A link carries a hundred and sixty bits and cannot be guessed; a code
    // carries fifty and can be, so the two are budgeted separately — and a
    // wrong code costs more than a right one, which is what makes working
    // through the space impractical rather than merely slow.
    const byCode = (body as { code?: unknown } | null)?.code !== undefined;
    const limiter = byCode ? c.env.REMEET_INVITE_CODE_LIMITER : c.env.REMEET_INVITE_RESOLVE_LIMITER;
    if (!(await withinRateLimit(c, limiter))) return rateLimited(c);

    const result = await resolveInvite(context, body, async () => {
      // The binding has no notion of weight, so the weight is more calls.
      for (let index = 0; index < FAILED_CODE_PENALTY; index += 1) {
        await withinRateLimit(c, c.env.REMEET_INVITE_CODE_LIMITER);
      }
    });
    return respond(c, result);
  });

  /**
   * What the landing page on `remeet.tmkch.io` asks for. Returns the invite
   * code and nothing else — never a CKShare URL, which must not reach a
   * browser under any circumstances.
   */
  app.post(`${ROUTE}/preview`, async (c) => {
    if (!fromRemeet(c)) return rejected(c);
    const context = inviteContext(c);
    if (!context) return serviceUnavailable(c);
    if (!(await withinRateLimit(c, c.env.REMEET_INVITE_RESOLVE_LIMITER))) return rateLimited(c);

    const body = await readBody(c);
    if (body === undefined) return failure(c, "INVALID_REQUEST");
    return respond(c, await previewInvite(context, body));
  });

  app.post(`${ROUTE}/revoke`, async (c) => {
    if (!fromRemeet(c)) return rejected(c);
    const context = inviteContext(c);
    if (!context) return serviceUnavailable(c);
    if (!(await withinRateLimit(c, c.env.REMEET_INVITE_REVOKE_LIMITER))) return rateLimited(c);

    const body = await readBody(c);
    if (body === undefined) return failure(c, "INVALID_REQUEST");
    return respond(c, await revokeInvite(context, body));
  });
}

/**
 * Whether this came from Remeet — the app, or the invitation page on the site.
 *
 * A filter, not a door: the value ships inside the app, so it stops a bare
 * `curl` and the scanners that follow a domain, not somebody who has opened
 * the binary. It is checked before anything else so that unrecognised traffic
 * costs a string comparison rather than a database read, and it is skipped
 * entirely when unset so the key can be rotated without locking out builds
 * already in people's hands.
 *
 * The control that would make this a real answer is App Attest, which needs a
 * physical device to develop against — see `docs/invite-flow.md`.
 */
function fromRemeet(c: InviteContext): boolean {
  const expected = c.env.REMEET_INVITE_CLIENT_KEY;
  if (!expected) return true;
  const presented = c.req.header("X-Remeet-Client");
  return !!presented && constantTimeEquals(presented, expected);
}

function constantTimeEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function inviteContext(c: InviteContext): InviteServiceContext | null {
  const { REMEET_INVITES_DB, REMEET_INVITE_TOKEN_SECRET, REMEET_INVITE_URL_KEY } = c.env;
  if (!REMEET_INVITES_DB || !REMEET_INVITE_TOKEN_SECRET || !REMEET_INVITE_URL_KEY) return null;
  const ttlDays = Number(c.env.REMEET_INVITE_TTL_DAYS ?? "7");
  const store = new D1InviteStore(REMEET_INVITES_DB);
  return {
    store,
    keys: {
      tokenSecret: REMEET_INVITE_TOKEN_SECRET,
      urlKey: REMEET_INVITE_URL_KEY,
      previousTokenSecret: c.env.REMEET_INVITE_TOKEN_SECRET_PREVIOUS,
      previousURLKey: c.env.REMEET_INVITE_URL_KEY_PREVIOUS,
    },
    baseURL: c.env.REMEET_INVITE_BASE_URL ?? "https://remeet.tmkch.io",
    ttlDays: Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : 7,
    // Counting is bookkeeping, not part of answering: a failed tally must
    // never turn a working invitation into an error.
    record: async (outcome) => {
      try {
        await store.countOutcome(new Date().toISOString().slice(0, 10), outcome);
      } catch {
        // Deliberately silent, and deliberately not logged.
      }
    },
  };
}

/** `undefined` when the body was not usable JSON of a sane size. */
async function readBody(c: InviteContext): Promise<unknown | undefined> {
  const length = Number(c.req.header("Content-Length") ?? "0");
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return undefined;
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}

async function withinRateLimit(
  c: InviteContext,
  limiter: RateLimiter | undefined,
): Promise<boolean> {
  if (!limiter) return true;
  const { success } = await limiter.limit({ key: c.req.header("CF-Connecting-IP") ?? "unknown" });
  return success;
}

/**
 * Invitations are secrets in transit, so nothing between here and the app may
 * keep a copy — and nothing about them is ever logged, which is why this file
 * has no logging at all while `routes/support.ts` beside it does.
 */
function json(c: InviteContext, status: number, payload: unknown) {
  return c.json(payload as never, status as never, { "Cache-Control": "no-store" });
}

function respond<T>(
  c: InviteContext,
  result: { ok: true; value: T } | { ok: false; error: InviteFailure },
  okStatus = 200,
) {
  return result.ok ? json(c, okStatus, result.value) : failure(c, result.error);
}

function failure(c: InviteContext, error: InviteFailure) {
  return json(c, error === "INVALID_REQUEST" ? 400 : 404, { error });
}

function rateLimited(c: InviteContext) {
  return json(c, 429, { error: "RATE_LIMITED" });
}

/**
 * Traffic that is not Remeet. Counted — that tally is the difference between
 * "somebody found the endpoint" being a thing you know and a thing you do
 * not — but the count is all that is kept: no address, no body, no header.
 */
function rejected(c: InviteContext) {
  const context = inviteContext(c);
  if (context?.record) c.executionCtx.waitUntil(context.record("rejected"));
  return json(c, 403, { error: "FORBIDDEN" });
}

function serviceUnavailable(c: InviteContext) {
  return json(c, 503, { error: "SERVICE_UNAVAILABLE" });
}
