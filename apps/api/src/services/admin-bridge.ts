import type { AdminCoreStub } from "@tomokichi/admin-contracts";
import {
  ATTACHMENT_FILENAME_HEADER,
  INTERNAL_ORIGIN,
  INTERNAL_PATHS,
} from "@tomokichi/admin-contracts";

/**
 * Handing a copy to Tomokichi Studio Admin.
 *
 * Everything in this file is **additive and best-effort**, and that is a
 * deliberate constraint rather than laziness. Before Admin existed, a Remeet
 * report reached a person by email and a support message reached a person by
 * email; those paths still run first and still decide the response. If Admin
 * Core is down, mid-deploy, or simply not bound in this environment, the
 * operator still gets the mail and the sender still gets a 201.
 *
 * The alternative — making the request fail when Admin is unavailable — would
 * mean a phone showing "通報できませんでした" for a report that a human is about
 * to read in their inbox. That trade is not worth a tidier database.
 *
 * The binding is optional for the same reason: `preview` and local runs have no
 * Admin Core, and the API must not need one.
 */
export interface AdminBridgeBindings {
  ADMIN_CORE?: AdminCoreStub;
}

/**
 * Runs the hand-off after the response, when there is an execution context to
 * run it in.
 *
 * `c.executionCtx` throws when a Hono app is invoked without one — which is how
 * every unit test in this Worker calls these routes. Catching that and letting
 * the promise settle on its own keeps the mirror out of the response path in
 * production *and* out of the way in tests, without either behaviour being a
 * special case in the route.
 */
export function background(
  context: { executionCtx: { waitUntil(promise: Promise<unknown>): void } },
  work: Promise<void>,
): void {
  try {
    context.executionCtx.waitUntil(work);
  } catch {
    void work.catch(() => undefined);
  }
}

/** Never throws, never logs content — only whether the hand-off worked. */
async function attempt(what: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    console.log(
      JSON.stringify({
        event: "admin_bridge.failed",
        what,
        error: error instanceof Error ? error.name : "Unknown",
      }),
    );
  }
}

export interface MirroredReport {
  reportId: string;
  reportedAt: string;
  reason: string;
  contentType: string;
  contentId: string;
  reunionId: string;
  reporterAuthorId: string;
  contentAuthorId?: string;
  details?: string;
  contentTextSnapshot?: string;
}

/**
 * Records a Remeet report in Admin.
 *
 * The raw author ids go over the binding and are pseudonymised **inside** Admin
 * Core, which holds the pepper this Worker does not — so the moderation
 * database can answer "the same author again" without holding a second copy of
 * Remeet's identity graph.
 *
 * Idempotent at the far end on `externalReportId`, so a retry of this call
 * cannot create a second row.
 */
export async function mirrorReport(
  env: AdminBridgeBindings,
  report: MirroredReport,
  image?: { bytes: Uint8Array; contentType: string },
): Promise<void> {
  const core = env.ADMIN_CORE;
  if (!core) return;

  await attempt("report", async () => {
    const result = await core.createReport(
      {
        appSlug: "remeet",
        externalReportId: report.reportId,
        contextExternalId: report.reunionId,
        contentType: report.contentType,
        contentExternalId: report.contentId,
        reporterRefHash: report.reporterAuthorId,
        authorRefHash: report.contentAuthorId,
        reasonCode: report.reason,
        detail: report.details,
        snapshotText: report.contentTextSnapshot,
        priority: "normal",
        reportedAt: report.reportedAt,
      },
      { type: "app", id: "remeet-backend" },
    );

    if (!result.ok) {
      console.log(
        JSON.stringify({ event: "admin_bridge.report_rejected", code: result.error.code }),
      );
      return;
    }
    // A duplicate already has whatever evidence it had; re-uploading the photo
    // would store the same bytes under a second key.
    if (result.value.duplicate || !image) return;

    const response = await core.fetch(
      `${INTERNAL_ORIGIN}${INTERNAL_PATHS.reportAttachment(result.value.reportId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": image.contentType,
          "Content-Length": String(image.bytes.byteLength),
          [ATTACHMENT_FILENAME_HEADER]: "report-image",
        },
        body: image.bytes,
      },
    );
    if (!response.ok) {
      console.log(
        JSON.stringify({ event: "admin_bridge.evidence_failed", status: response.status }),
      );
    }
  });
}

export interface MirroredSupportMessage {
  requestId: string;
  appSlug?: string;
  requesterEmail?: string;
  requesterName?: string;
  category: string;
  message: string;
  source: string;
}

/**
 * Records a support-form submission in Admin so it can be answered from the
 * admin screen rather than only from the operator's inbox.
 *
 * **Including the ones with no address.** This used to return early when the
 * sender had not asked for a reply, on the reasoning that a thread nobody can
 * answer is a row for no operational reason. That was written when every
 * sender was a web form that always collected an address; the Remeet app then
 * made "no reply wanted" the default for 不具合 / 要望 / その他, so most of
 * what people sent from inside the app existed only as mail and never appeared
 * on the screen the operator actually reads. Reading is an operational reason.
 * `sendReply` still refuses a thread with nowhere to write back to.
 */
export async function mirrorSupportMessage(
  env: AdminBridgeBindings,
  message: MirroredSupportMessage,
): Promise<void> {
  const core = env.ADMIN_CORE;
  if (!core) return;

  await attempt("support", async () => {
    const result = await core.createSupportThread(
      {
        appSlug: message.appSlug === "other" ? undefined : message.appSlug,
        source: "web_form",
        requesterEmail: message.requesterEmail,
        // Only what the person typed into the name field. Never inferred.
        requesterName: message.requesterName,
        subject: `[${message.category}] ${message.requestId}`,
        bodyText: message.message,
        providerMessageId: `form-${message.requestId}`,
        sender: message.requesterEmail,
      },
      { type: "app", id: "tomokichi-api" },
    );
    if (!result.ok) {
      console.log(
        JSON.stringify({ event: "admin_bridge.support_rejected", code: result.error.code }),
      );
    }
  });
}
