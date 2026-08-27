import type { Context, Hono } from "hono";
import {
  addAction,
  buildManifestPayload,
  type ModerationContext,
  publishManifest,
  revokeAction,
} from "../../services/remeet/moderation-service";
import { D1ModerationStore, type ModerationChannel } from "../../services/remeet/moderation-store";
import type { RemeetInviteBindings } from "../../services/remeet/types";
import type { SupportBindings } from "../../support/types";

/**
 * Remeet moderation: one public route and three the operator uses.
 *
 * ## The public one
 *
 * `GET /remeet/v1/moderation/manifest.json` is the same file for everybody. It
 * takes no parameters, reads no headers about the caller, sets no cookies and
 * is cached at the edge. That is not an oversight — it is the entire privacy
 * design of the feature.
 *
 * The alternative, which was considered and rejected, was for each app to send
 * the reunions it holds and receive the actions that apply. That works, and it
 * would let the operator see how far each action had spread. It would also mean
 * this server learning which accounts hold which reunions and when each person
 * opens Remeet — a new stream of information about people's private lives,
 * created by the feature meant to protect them. So the app downloads everything
 * and matches locally, and the server learns nothing beyond an IP hitting a
 * cache.
 *
 * `ModerationPrivacyTests` on the app side fails if the request ever grows a
 * parameter or an identifying header.
 *
 * ## The operator ones
 *
 * `POST /actions`, `POST /actions/:id/revoke` and `PUT /manifest` all require
 * `Authorization: Bearer $REMEET_MODERATION_ADMIN_TOKEN`. That token is a
 * Worker secret and can therefore be lost with the Worker — which is precisely
 * why it is not what makes moderation safe. **The manifest is signed on the
 * operator's own machine with a key this server has never seen.** An attacker
 * holding this token can store and serve a file; every Remeet install will
 * reject it, because it will not verify.
 */
export type ModerationBindings = SupportBindings &
  RemeetInviteBindings & {
    REMEET_MODERATION_ADMIN_TOKEN?: string;
    /** The key id the CLI signs with, so `buildManifestPayload` can name it. */
    REMEET_MODERATION_KEY_ID?: string;
  };

type ModerationApp = Hono<{ Bindings: ModerationBindings }>;
type ModerationContextHTTP = Context<{ Bindings: ModerationBindings }>;

const PUBLIC_ROUTE = "/remeet/v1/moderation/manifest.json";
/**
 * The Debug channel.
 *
 * Remeet's Debug and Release builds trust different signing keys — a manifest
 * minted while testing must not be able to order deletions on a build in
 * somebody's hands. That split only means anything if a test publish has
 * somewhere to go, so it gets its own path and its own row.
 */
const DEV_ROUTE = "/remeet/v1/moderation/dev-manifest.json";
const ADMIN_ROUTE = "/remeet/v1/moderation/actions";

export function registerRemeetModerationRoutes(app: ModerationApp): void {
  const serveManifest = (channel: ModerationChannel) => async (c: ModerationContextHTTP) => {
    const context = moderationContext(c);
    if (!context) return c.json({ error: "UNAVAILABLE" }, 503);
    const manifest = await context.store.currentManifest(channel);
    if (!manifest) {
      // Nothing has ever been published. A 404 rather than an empty manifest,
      // because an empty manifest is a claim ("there are no actions") and this
      // is an absence ("nothing has been said"). The app treats both the same
      // way — it changes nothing and keeps every tombstone it already has —
      // but the two should not be conflated on the wire.
      return c.json({ error: "NOT_FOUND" }, 404);
    }
    if (c.req.header("If-None-Match") === manifest.etag) {
      return c.body(null, 304, cacheHeaders(manifest.etag));
    }
    return c.body(manifest.body, 200, {
      "Content-Type": "application/json; charset=utf-8",
      ...cacheHeaders(manifest.etag),
    });
  };

  app.get(PUBLIC_ROUTE, serveManifest("production"));
  app.get(DEV_ROUTE, serveManifest("dev"));

  app.post(ADMIN_ROUTE, async (c) => {
    if (!isOperator(c)) return c.json({ error: "FORBIDDEN" }, 403);
    const context = moderationContext(c);
    if (!context) return c.json({ error: "UNAVAILABLE" }, 503);
    const body = await readJSON(c);
    if (body === undefined) return c.json({ error: "INVALID_REQUEST" }, 400);
    const result = await addAction(context, body);
    if (!result.ok) {
      return c.json({ error: result.error }, result.error === "DUPLICATE_TARGET" ? 409 : 400);
    }
    // The digest goes back so the operator can see what was recorded, and
    // nothing else does: this response is the one place the raw content id and
    // the digest exist side by side, and it belongs only in the terminal of the
    // person who typed the command.
    return c.json({ actionId: result.value.actionId, target: result.value.target }, 201);
  });

  app.post(`${ADMIN_ROUTE}/:id/revoke`, async (c) => {
    if (!isOperator(c)) return c.json({ error: "FORBIDDEN" }, 403);
    const context = moderationContext(c);
    if (!context) return c.json({ error: "UNAVAILABLE" }, 503);
    const body = (await readJSON(c)) as { revokedBy?: unknown } | undefined;
    const revokedBy = typeof body?.revokedBy === "string" ? body.revokedBy : "";
    const result = await revokeAction(context, c.req.param("id"), revokedBy);
    if (!result.ok) {
      return c.json({ error: result.error }, result.error === "NOT_FOUND" ? 404 : 400);
    }
    return c.json({ actionId: result.value.actionId, status: "revoked" });
  });

  /** What the CLI signs. Read-only, and admin-only because the list of targets
   *  is operator information even though each entry is opaque. */
  app.get(`${ADMIN_ROUTE}/pending`, async (c) => {
    if (!isOperator(c)) return c.json({ error: "FORBIDDEN" }, 403);
    const context = moderationContext(c);
    if (!context) return c.json({ error: "UNAVAILABLE" }, 503);
    // The CLI names both, so a dev rehearsal signs with the dev key and lands
    // in the dev row without touching what shipped builds read.
    const keyID = c.req.query("keyID") ?? c.env.REMEET_MODERATION_KEY_ID ?? "";
    if (!keyID) return c.json({ error: "UNAVAILABLE" }, 503);
    const channel: ModerationChannel = c.req.query("channel") === "dev" ? "dev" : "production";
    return c.json(await buildManifestPayload(context, keyID, channel));
  });

  app.put("/remeet/v1/moderation/manifest", async (c) => {
    if (!isOperator(c)) return c.json({ error: "FORBIDDEN" }, 403);
    const context = moderationContext(c);
    if (!context) return c.json({ error: "UNAVAILABLE" }, 503);
    const body = await readJSON(c);
    if (body === undefined) return c.json({ error: "INVALID_REQUEST" }, 400);
    const result = await publishManifest(context, body);
    if (!result.ok) {
      return c.json({ error: result.error }, result.error === "STALE_REVISION" ? 409 : 400);
    }
    return c.json(result.value);
  });
}

/**
 * Fifteen minutes at the edge.
 *
 * Short enough that a new action reaches people within the hour, long enough
 * that the origin is not asked by every install. The app throttles its own
 * fetches to twice a day anyway, so this mostly protects against a burst.
 */
function cacheHeaders(etag: string): Record<string, string> {
  return {
    ETag: etag,
    "Cache-Control": "public, max-age=900",
  };
}

function isOperator(c: ModerationContextHTTP): boolean {
  const expected = c.env.REMEET_MODERATION_ADMIN_TOKEN;
  // Absent means the operator routes are closed, not open. The opposite
  // default — the one `fromRemeet` uses for the client key, where an unset
  // value lets everything through so a key can be rotated — would be
  // catastrophic here.
  if (!expected) return false;
  const header = c.req.header("Authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  return constantTimeEquals(presented, expected);
}

function constantTimeEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function moderationContext(c: ModerationContextHTTP): ModerationContext | null {
  const database = c.env.REMEET_INVITES_DB;
  if (!database) return null;
  return { store: new D1ModerationStore(database) };
}

async function readJSON(c: ModerationContextHTTP): Promise<unknown | undefined> {
  try {
    return await c.req.json();
  } catch {
    return undefined;
  }
}
