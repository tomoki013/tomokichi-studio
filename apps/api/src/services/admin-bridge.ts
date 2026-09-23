import { createInquiryClient, type IntakeBinding } from "@inquiry-platform/sdk";

/**
 * Reports are delivered through the durable report outbox; support messages
 * are recorded directly. The inquiry platform is where a message *exists* —
 * there is no longer a mail carrying it — so an environment without the
 * binding cannot accept either, and the routes answer 502 rather than
 * pretending.
 *
 * `INQUIRY` is bound to the platform's `Intake` entrypoint, which can submit
 * contacts, reports and evidence and nothing else. Which projects this Worker
 * may submit for is fixed in the binding's `props` (`wrangler.jsonc`).
 */
export interface AdminBridgeBindings {
  INQUIRY?: IntakeBinding;
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
async function attempt(what: string, run: () => Promise<boolean>): Promise<boolean> {
  try {
    return await run();
  } catch (error) {
    console.log(
      JSON.stringify({
        event: "admin_bridge.failed",
        what,
        error: error instanceof Error ? error.name : "Unknown",
      }),
    );
    return false;
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
 * Records a Remeet report in the inquiry platform.
 *
 * The raw author ids go over the binding and are pseudonymised **inside** the
 * platform, which holds the pepper this Worker does not — so the moderation
 * database can answer "the same author again" without holding a second copy of
 * Remeet's identity graph.
 *
 * Idempotent at the far end on `externalReportId`, so a retry of this call
 * cannot create a second row.
 */
export async function mirrorReport(
  env: AdminBridgeBindings,
  report: MirroredReport,
  image?: { bytes: Uint8Array<ArrayBuffer>; contentType: string; createdAt?: string },
): Promise<boolean> {
  if (!env.INQUIRY) return false;
  const inquiry = createInquiryClient(env.INQUIRY);

  try {
    const result = await inquiry.createReport({
      projectSlug: "remeet",
      externalReportId: report.reportId,
      contextId: report.reunionId,
      targetType: report.contentType,
      targetId: report.contentId,
      reporterId: report.reporterAuthorId,
      targetOwnerId: report.contentAuthorId,
      reason: report.reason,
      reporterEmail: report.reporterEmail,
      description: report.details,
      snapshotText: report.contentTextSnapshot,
      priority: "normal",
      evidenceExpected: Boolean(image) || report.evidenceExpected,
      reportedAt: report.reportedAt,
    });

    if (!result.ok) {
      console.log(
        JSON.stringify({ event: "admin_bridge.report_rejected", code: result.error.code }),
      );
      return false;
    }
    // The platform deduplicates evidence separately, so a metadata-only success can recover.
    if (!image) return !report.evidenceExpected;

    const stored = await inquiry.attachReportEvidence(result.value.reportId, {
      bytes: image.bytes,
      contentType: image.contentType,
      filename: "report-image",
      createdAt: image.createdAt,
    });
    if (!stored.ok) {
      console.log(
        JSON.stringify({ event: "admin_bridge.evidence_failed", code: stored.error.code }),
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
 * Records a support-form submission in the inquiry platform. This is the
 * submission being accepted: the only copy of what the person wrote is the
 * ticket the platform writes, and the operator is told it exists — by mail and
 * by push, from the platform, with the number and nothing else — once it does.
 *
 * It used to be a "mirror" beside a mail that carried the full message to a
 * personal inbox. That mail is gone: an inbox is not a support database, and
 * anything with access to the inbox had access to every message.
 *
 * **Including the ones with no address.** This used to return early when the
 * sender had not asked for a reply, on the reasoning that a thread nobody can
 * answer is a row for no operational reason. That was written when every
 * sender was a web form that always collected an address; the Remeet app then
 * made "no reply wanted" the default for 不具合 / 要望 / その他, so most of
 * what people sent from inside the app existed only as mail and never appeared
 * on the screen the operator actually reads. Reading is an operational reason.
 * `sendReply` still refuses a thread with nowhere to write back to.
 *
 * Idempotent at the far end on the request id, so a client that retries a lost
 * response does not make a second ticket.
 *
 * @returns whether the message is now recorded. False is a 502 to the sender.
 */
export async function recordSupportMessage(
  env: AdminBridgeBindings,
  message: MirroredSupportMessage,
): Promise<boolean> {
  if (!env.INQUIRY) {
    console.log(JSON.stringify({ event: "admin_bridge.unavailable", what: "support" }));
    return false;
  }
  const inquiry = createInquiryClient(env.INQUIRY);

  return await attempt("support", async () => {
    const result = await inquiry.createContact({
      projectSlug: message.appSlug === "other" ? undefined : message.appSlug,
      // The request id the form minted. The platform keys the ticket on it,
      // so a client retrying a lost response does not make a second one.
      idempotencyKey: message.requestId,
      subject: `[${message.category}] ${message.requestId}`,
      message: message.message,
      email: message.requesterEmail,
      // Only what the person typed into the name field. Never inferred.
      name: message.requesterName,
      channel: "web_form",
    });
    if (!result.ok) {
      console.log(
        JSON.stringify({ event: "admin_bridge.support_rejected", code: result.error.code }),
      );
      return false;
    }
    return true;
  });
}
