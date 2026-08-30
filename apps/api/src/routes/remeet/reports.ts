import type { Context, Hono } from "hono";
import { type AdminBridgeBindings, background, mirrorReport } from "../../services/admin-bridge";
import {
  type ContentReport,
  IMAGE_RETENTION_DAYS,
  imageObjectKey,
  parseReport,
  validateImage,
} from "../../services/remeet/report-service";
import type { RateLimiter, RemeetInviteBindings } from "../../services/remeet/types";
import { sendSupportEmail } from "../../support/email";
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
 * to megabytes, and a body like that cannot be bounded, logged or mailed
 * sensibly.
 */
export type ReportBindings = SupportBindings &
  RemeetInviteBindings &
  AdminBridgeBindings & {
    /** Reported photos, private, with a lifecycle rule that deletes them after
     * `IMAGE_RETENTION_DAYS`. Absent in environments that have no bucket yet,
     * in which case a report with a photo is still accepted — the mail says the
     * photo could not be stored rather than dropping the report. */
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

    try {
      await notifyOperator(c, report, imageKey);
    } catch {
      // The mail is the whole point of the request, so a failure here is a
      // failure of the request — the app keeps what the person typed and lets
      // them try again. Nothing about *why* is echoed back.
      return json(c, 502, { error: "DELIVERY_FAILED" });
    }

    await remember(c, report);

    // Studio Admin gets a copy so the report can be worked through a queue
    // instead of an inbox. Deliberately after the mail and outside the response
    // path — see `services/admin-bridge.ts` for why a failure here does not
    // fail the report.
    background(
      c,
      mirrorReport(
        c.env,
        {
          reportId: report.reportId,
          reportedAt: report.reportedAt,
          reason: report.reason,
          contentType: report.contentType,
          contentId: report.contentId,
          reunionId: report.reunionId,
          reporterAuthorId: report.reporterAuthorId,
          contentAuthorId: report.contentAuthorId,
          details: report.details,
          contentTextSnapshot: report.contentTextSnapshot,
        },
        evidence,
      ),
    );

    return json(c, 201, { ok: true, duplicate: false });
  });
}

/**
 * The operator's copy.
 *
 * This is the only place the reported text is allowed to appear. It is written
 * plainly, because somebody has to read it and decide — and it goes to one
 * address, the same one support mail already goes to.
 */
async function notifyOperator(
  c: ReportContext,
  report: ContentReport,
  imageKey: string | undefined,
): Promise<void> {
  const lines = [
    `通報ID: ${report.reportId}`,
    `日時: ${report.reportedAt}`,
    `理由: ${report.reason}`,
    "",
    `種類: ${report.contentType}`,
    `コンテンツID: ${report.contentId}`,
    `再会ID: ${report.reunionId}`,
    `投稿者: ${report.contentAuthorId ?? "不明（この種類のコンテンツは投稿者を記録していません）"}`,
    `通報者: ${report.reporterAuthorId}`,
    "",
    `アプリ: ${report.appVersion} (${report.buildNumber})`,
    `OS: ${report.osVersion ?? "-"} / ${report.locale ?? "-"}`,
    "",
    "--- 通報対象の本文 ---",
    report.contentTextSnapshot ?? "(なし)",
    "",
    "--- 通報者のコメント ---",
    report.details ?? "(なし)",
  ];

  if (imageKey) {
    lines.push(
      "",
      "--- 添付画像 ---",
      `R2 object: ${imageKey}`,
      `保存期間: ${IMAGE_RETENTION_DAYS}日で自動削除`,
    );
  }

  const text = lines.join("\n");
  await sendSupportEmail(
    {
      from: c.env.SUPPORT_FROM_EMAIL,
      to: c.env.SUPPORT_TO_EMAIL,
      subject: `[Remeet] コンテンツ通報 (${report.reason})`,
      text,
      html: `<pre style="white-space:pre-wrap;font-family:ui-monospace,monospace">${escapeHtml(text)}</pre>`,
      // Resend's own dedupe, in case this Worker is retried above our level.
      idempotencyKey: `remeet-report-${report.reportId}`,
    },
    c.env.RESEND_API_KEY,
  );
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
 * comment — a report is delivered by mail and the database's only job is to
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
    // A missing table must not stop a report reaching a human. Duplicate
    // protection degrades to Resend's idempotency key.
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
      .bind(report.reportId, new Date().toISOString(), report.contentType, "delivered")
      .run();
  } catch {
    // Same reasoning as `hasSeen`: the mail has already gone.
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
