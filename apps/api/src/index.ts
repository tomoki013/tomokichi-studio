import { type Context, Hono } from "hono";

import { registerRemeetInviteRoutes, type ApiBindings } from "./routes/remeet/invites";
import { registerRemeetModerationRoutes } from "./routes/remeet/moderation";
import { registerRemeetReportRoutes } from "./routes/remeet/reports";
import { cleanUpExpiredInvites } from "./services/remeet/invite-service";
import { D1InviteStore } from "./services/remeet/invite-store";
import { daysUntilManifestExpiry } from "./services/remeet/moderation-service";
import { D1ModerationStore } from "./services/remeet/moderation-store";
import { sendSupportEmail } from "./support/email";
import { registerSupportRoute, type SupportDependencies } from "./routes/support";

type ApiContext = Context<{ Bindings: ApiBindings }>;

export function createApp(dependencies: SupportDependencies = {}) {
  const app = new Hono<{ Bindings: ApiBindings }>();

  const health = (c: ApiContext) => {
    return c.json({
      ok: true,
      service: "tomokichi-api",
      version: "v1",
    });
  };

  app.get("/api/v1/health", health);
  app.get("/api/health", health);

  registerSupportRoute(app, dependencies);
  // One Worker, one namespace per app: `/remeet/v1/*` is Remeet's, and the
  // service behind it depends on nothing else served here.
  registerRemeetInviteRoutes(app);
  // Content reports. The only route here that ever receives a person's own
  // writing, and only when they asked for it to be looked at — see
  // `routes/remeet/reports.ts`.
  registerRemeetReportRoutes(app);
  // Operator moderation of shared Remeet content. The public half is one
  // cached file with no caller identity attached; the operator half is signed
  // on a Mac this Worker knows nothing about. See routes/remeet/moderation.ts.
  registerRemeetModerationRoutes(app);
  return app;
}

export const app = createApp();

/**
 * Mails the operator when the signed moderation manifest is running out.
 *
 * Signing happens by hand, on a Mac, with a key kept in the Keychain — that is
 * what makes a compromised Worker unable to mint deletion instructions. The
 * cost of that choice is that nothing renews the manifest automatically, and an
 * expired manifest is refused outright by every install: existing tombstones
 * stand, but **no new moderation reaches anybody**. That failure is silent from
 * the operator's side, which is exactly the kind that goes unnoticed for
 * months.
 *
 * So the clock says something first. Thirty days is enough warning to re-sign
 * without hurrying, and the mail repeats nightly until somebody does.
 */
async function warnIfModerationManifestIsExpiring(env: ApiBindings): Promise<void> {
  const database = env.REMEET_INVITES_DB;
  if (!database) return;
  const context = { store: new D1ModerationStore(database) };
  const remaining = await daysUntilManifestExpiry(context);
  if (remaining === null || remaining > 30) return;
  if (!env.RESEND_API_KEY || !env.SUPPORT_TO_EMAIL || !env.SUPPORT_FROM_EMAIL) return;
  // No content, no ids, no count of who has been moderated: the operator only
  // needs to know that a signature is due.
  const text = [
    `The signed Remeet moderation manifest expires in ${remaining} day(s).`,
    "",
    "Re-sign and publish it from the operator Mac:",
    "  pnpm moderation publish",
    "",
    "Once it expires, every Remeet install refuses the file. Existing hidden",
    "content stays hidden; new moderation actions reach nobody.",
  ].join("\n");
  await sendSupportEmail(
    {
      from: env.SUPPORT_FROM_EMAIL,
      to: env.SUPPORT_TO_EMAIL,
      subject: `[Remeet] moderation manifest expires in ${remaining} day(s)`,
      text,
      html: `<pre>${text}</pre>`,
      // One mail a day at most, however many times the cron fires.
      idempotencyKey: `remeet-moderation-expiry-${new Date().toISOString().slice(0, 10)}`,
    },
    env.RESEND_API_KEY,
  );
}

/**
 * Hono answers requests; the default export also answers the clock.
 *
 * The only scheduled work here is Remeet's: invitations that expired days ago
 * are deleted, so the table cannot be grown without bound by anybody who can
 * reach the create endpoint. Deliberately not done during a request — putting
 * a delete in front of somebody sending an invitation is both slower and, on a
 * bad day, a way to make their invitation fail for a reason that has nothing
 * to do with them.
 */
export default {
  fetch: app.fetch,
  async scheduled(_event: unknown, env: ApiBindings): Promise<void> {
    if (!env.REMEET_INVITES_DB) return;
    await cleanUpExpiredInvites(new D1InviteStore(env.REMEET_INVITES_DB));
    await warnIfModerationManifestIsExpiring(env);
  },
};
