import type { Context, Hono } from "hono";
import { type AdminBridgeBindings, background } from "../../services/admin-bridge";
import { deliverPendingReport, enqueueReport } from "../../services/remeet/report-outbox";
import {
  type ContentReport,
  imageObjectKey,
  parseReport,
  validateImage,
} from "../../services/remeet/report-service";
import type { RateLimiter, RemeetInviteBindings } from "../../services/remeet/types";
import type { SupportBindings } from "../../support/types";

/**
 * `POST https://api.tmkch.io/remeet/v1/reports`
 *
 * The one route in this Worker that is *supposed* to receive somebody's private
 * writing, and only because the person reading it asked for it to be looked at.
 * Everything else about Remeet goes device → iCloud → device and never touches
 * this API.
 *
 * Deliberately not `/api/support`: a support message is written *by* the person
 * sending it, a report contains content belonging to somebody who is not in the
 * conversation. Separate route, separate rate limit, separate validation,
 * separate retention — and separate so that a change to one cannot loosen the
 * other by accident.
 *
 * `multipart/form-data` in both shapes, with or without a photo, so there is
 * one thing to validate. The photo is never base64 in JSON: a Remeet photo runs
 * to megabytes, and a body like that cannot be bounded or logged sensibly.
 *
 * Where a report goes: the durable outbox in R2, then Admin Core, which holds
 * the ticket and tells the operator — by mail and push — that a report
 * exists, with its ticket number and nothing about it. Nothing here mails the
 * reported text anywhere. It used to; an inbox is where a moderation queue
 * ends up readable by everything the inbox is connected to.
 */
export type ReportBindings = SupportBindings &
  RemeetInviteBindings &
  AdminBridgeBindings & {
    /** Reported photos and the report outbox, private, with a lifecycle rule
     * that deletes photos after `IMAGE_RETENTION_DAYS`. Acceptance depends on
     * it: with nowhere durable to put a report, the request is refused. */
    REMEET_REPORTS_BUCKET?: R2Bucket;
    REMEET_REPORT_LIMITER?: RateLimiter;
  };

type ReportApp = Hono<{ Bindings: ReportBindings }>;
type ReportContext = Context<{ Bindings: ReportBindings }>;

const ROUTE = "/remeet/v1/reports";
/** Metadata only; the photo is its own part and bounded separately. */
const MAX_METADATA_BYTES = 32 * 1024;

export function registerRemeetReportRoutes(app: ReportApp): void {
  app.post(ROUTE, async (c) => {
    if (!fromRemeet(c)) return json(c, 403, { error: "FORBIDDEN" });
    if (!(await withinRateLimit(c))) return json(c, 429, { error: "RATE_LIMITED" });

    let form: FormData;
    try {
      form = await c.req.formData();
    } catch {
      return json(c, 400, { error: "INVALID_REQUEST" });
    }

    const metadata = form.get("report");
    if (typeof metadata !== "string" || metadata.length > MAX_METADATA_BYTES) {
      return json(c, 400, { error: "INVALID_REQUEST" });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(metadata);
    } catch {
      return json(c, 400, { error: "INVALID_REQUEST" });
    }

    const report = parseReport(parsed);
    if (!report) return json(c, 400, { error: "INVALID_REQUEST" });

    // Idempotency before anything with a side effect. A phone that retried on a
    // flaky connection must not produce a second mail or a second upload — the
    // person pressed the button once.
    if (await hasSeen(c, report.reportId)) {
      return json(c, 200, { ok: true, duplicate: true });
    }

    let imageKey: string | undefined;
    let evidence: { bytes: Uint8Array; contentType: string } | undefined;
    const image = form.get("image");
    if (image instanceof File) {
      const bytes = new Uint8Array(await image.arrayBuffer());
      const validation = validateImage(bytes, image.type);
      if (!validation.ok) return json(c, 400, { error: validation.failure });
      imageKey = await storeImage(c, report.reportId, bytes, validation.contentType);
      evidence = { bytes, contentType: validation.contentType };
    }

    // Acceptance is the durable copy. `enqueueReport` throws when there is no
    // bucket and returns nothing when there is no Admin Core; either way the
    // report would exist nowhere, and the app keeps what the person typed and
    // lets them try again. Nothing about *why* is echoed back.
    let pendingKey: string | undefined;
    try {
      pendingKey = await enqueueReport(
        c.env,
        { ...report, evidenceExpected: Boolean(evidence) },
        imageKey,
      );
    } catch {
      return json(c, 502, { error: "DELIVERY_FAILED" });
    }
    if (!pendingKey) return json(c, 502, { error: "DELIVERY_FAILED" });
    await remember(c, report);
    background(c, deliverPendingReport(c.env, pendingKey));

    return json(c, 201, { ok: true, duplicate: false });
  });
}

/**
 * Puts the photo in the private bucket under a key that cannot be guessed from
 * the report id alone, and never returns a public URL — the operator reads it
 * through a signed URL or the console.
 */
async function storeImage(
  c: ReportContext,
  reportId: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<string | undefined> {
  const bucket = c.env.REMEET_REPORTS_BUCKET;
  if (!bucket) return undefined;
  const random = crypto.randomUUID().replace(/-/g, "");
  const key = imageObjectKey(reportId, random);
  await bucket.put(key, bytes, { httpMetadata: { contentType } });
  return key;
}

/**
 * Ids and a status. Never the text, never the photo, never the reporter's
 * comment — a report lives in Admin and this database's only job is to
 * recognise the same report arriving twice.
 */
async function hasSeen(c: ReportContext, reportId: string): Promise<boolean> {
  const db = c.env.REMEET_INVITES_DB;
  if (!db) return false;
  try {
    const row = await db
      .prepare("SELECT report_id FROM remeet_reports WHERE report_id = ?")
      .bind(reportId)
      .first();
    return !!row;
  } catch {
    // A missing table must not stop a report reaching Admin. Duplicate
    // protection degrades to Admin Core's own check on the report id.
    return false;
  }
}

async function remember(c: ReportContext, report: ContentReport): Promise<void> {
  const db = c.env.REMEET_INVITES_DB;
  if (!db) return;
  try {
    await db
      .prepare(
        "INSERT OR IGNORE INTO remeet_reports (report_id, created_at, content_type, status) VALUES (?, ?, ?, ?)",
      )
      .bind(report.reportId, new Date().toISOString(), report.contentType, "accepted")
      .run();
  } catch {
    // Same reasoning as `hasSeen`: the durable copy already exists.
  }
}

function fromRemeet(c: ReportContext): boolean {
  const expected = c.env.REMEET_INVITE_CLIENT_KEY;
  if (!expected) return true;
  const presented = c.req.header("X-Remeet-Client");
  return !!presented && presented === expected;
}

async function withinRateLimit(c: ReportContext): Promise<boolean> {
  const limiter = c.env.REMEET_REPORT_LIMITER;
  if (!limiter) return true;
  const { success } = await limiter.limit({ key: c.req.header("CF-Connecting-IP") ?? "unknown" });
  return success;
}

/**
 * Responses carry a code and nothing else, and this route logs **no** request
 * detail at all: not the text, not the comment, not the ids. What is observable
 * from outside is a status code; what is observable from the logs is that a
 * report happened.
 */
function json(c: ReportContext, status: number, body: Record<string, unknown>) {
  return c.json(body, status as 200 | 201 | 400 | 403 | 429 | 502);
}
