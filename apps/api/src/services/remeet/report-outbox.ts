import { type AdminBridgeBindings, type MirroredReport, mirrorReport } from "../admin-bridge";

export type ReportOutboxBindings = AdminBridgeBindings & { REMEET_REPORTS_BUCKET?: R2Bucket };
const PREFIX = "report-outbox/";
interface PendingReport {
  report: MirroredReport;
  imageKey?: string;
}

/** Acceptance waits for this durable copy. Successful delivery removes it. */
export async function enqueueReport(
  env: ReportOutboxBindings,
  report: MirroredReport,
  imageKey?: string,
): Promise<string | undefined> {
  if (!env.ADMIN_CORE) return undefined;
  if (!env.REMEET_REPORTS_BUCKET) throw new Error("ReportOutboxUnavailable");
  const key = `${PREFIX}${report.reportId}.json`;
  // Never replace a pending report's original image reference on a retry.
  await env.REMEET_REPORTS_BUCKET.put(key, JSON.stringify({ report, imageKey }), {
    onlyIf: { etagDoesNotMatch: "*" },
    httpMetadata: { contentType: "application/json" },
  });
  return key;
}

export async function deliverPendingReport(env: ReportOutboxBindings, key: string): Promise<void> {
  const bucket = env.REMEET_REPORTS_BUCKET;
  if (!bucket || !env.ADMIN_CORE) return;
  try {
    const stored = await bucket.get(key);
    if (!stored) return;
    const pending = await stored.json<PendingReport>();
    const object = pending.imageKey ? await bucket.get(pending.imageKey) : null;
    const image = object
      ? {
          bytes: new Uint8Array(await object.arrayBuffer()),
          contentType: object.httpMetadata?.contentType ?? "image/jpeg",
          createdAt: object.uploaded.toISOString(),
        }
      : undefined;
    if (await mirrorReport(env, pending.report, image)) await bucket.delete(key);
    else console.log(JSON.stringify({ event: "report_outbox.pending" }));
  } catch {
    // The durable entry stays for the next run. Never log a report or its ids.
    console.log(JSON.stringify({ event: "report_outbox.retry_failed" }));
  }
}

export async function retryReportOutbox(env: ReportOutboxBindings): Promise<void> {
  const bucket = env.REMEET_REPORTS_BUCKET;
  if (!bucket || !env.ADMIN_CORE) return;
  let cursor: string | undefined;
  do {
    const page = await bucket.list({ prefix: PREFIX, limit: 100, cursor });
    // Sequential to bound memory when reports carry large images.
    for (const entry of page.objects) await deliverPendingReport(env, entry.key);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
