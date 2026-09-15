import type { AdminCoreStub } from "@tomokichi/admin-contracts";
import {
  ATTACHMENT_FILENAME_HEADER,
  INTERNAL_ORIGIN,
  INTERNAL_PATHS,
} from "@tomokichi/admin-contracts";

/** Reports are delivered through the durable report outbox. Support mirroring
 * remains best-effort. Environments without Admin Core keep the mail path. */
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
  work: Promise<unknown>,
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
  reporterEmail?: string;
  contentTextSnapshot?: string;
  evidenceExpected?: boolean;
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
  image?: { bytes: Uint8Array; contentType: string; createdAt?: string },
): Promise<boolean> {
  const core = env.ADMIN_CORE;
  if (!core) return false;

  try {
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
        reporterEmail: report.reporterEmail,
        detail: report.details,
        snapshotText: report.contentTextSnapshot,
        priority: "normal",
        evidenceExpected: Boolean(image) || report.evidenceExpected,
        reportedAt: report.reportedAt,
      },
      { type: "app", id: "remeet-backend" },
    );

    if (!result.ok) {
      console.log(
        JSON.stringify({ event: "admin_bridge.report_rejected", code: result.error.code }),
      );
      return false;
    }
    // Core deduplicates evidence separately, so a metadata-only success can recover.
    if (!image) return !report.evidenceExpected;

    const response = await core.fetch(
      `${INTERNAL_ORIGIN}${INTERNAL_PATHS.reportAttachment(result.value.reportId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": image.contentType,
          "Content-Length": String(image.bytes.byteLength),
          [ATTACHMENT_FILENAME_HEADER]: "report-image",
          ...(image.createdAt ? { "X-Evidence-Created-At": image.createdAt } : {}),
        },
        body: image.bytes,
      },
    );
    if (!response.ok) {
      console.log(
        JSON.stringify({ event: "admin_bridge.evidence_failed", status: response.status }),
      );
      return false;
    }
    return true;
  } catch {
    console.log(JSON.stringify({ event: "admin_bridge.failed", what: "report" }));
    return false;
  }
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
