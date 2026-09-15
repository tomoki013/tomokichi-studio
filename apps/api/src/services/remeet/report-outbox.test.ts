import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { enqueueReport, type ReportOutboxBindings, retryReportOutbox } from "./report-outbox";

const bucket = (env as unknown as { REMEET_REPORTS_BUCKET: R2Bucket }).REMEET_REPORTS_BUCKET;

describe("durable report delivery", () => {
  it("recovers from a core outage and then an image-only failure", async () => {
    const reportId = crypto.randomUUID();
    const report = {
      reportId,
      reportedAt: new Date().toISOString(),
      reason: "spam",
      contentType: "wish",
      contentId: crypto.randomUUID(),
      reunionId: crypto.randomUUID(),
      reporterAuthorId: crypto.randomUUID(),
      evidenceExpected: true,
    };
    const createReport = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({ ok: true, value: { reportId: "internal", duplicate: true } });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValue(new Response(null, { status: 201 }));
    const bindings = {
      REMEET_REPORTS_BUCKET: bucket,
      ADMIN_CORE: { createReport, fetch },
    } as unknown as ReportOutboxBindings;
    const imageKey = `reports/remeet/${reportId}/original`;
    await bucket.put(imageKey, new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: "image/png" },
    });
    const key = await enqueueReport(bindings, report, imageKey);
    if (!key) throw new Error("outbox not configured");
    await retryReportOutbox(bindings);
    expect(await bucket.head(key)).not.toBeNull();
    await enqueueReport(bindings, report, "missing-retry-image");
    await retryReportOutbox(bindings);
    expect(await bucket.head(key)).not.toBeNull();
    await retryReportOutbox(bindings);
    expect(await bucket.head(key)).toBeNull();
    expect(createReport).toHaveBeenCalledTimes(3);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1]?.[1].headers["X-Evidence-Created-At"]).toBe(
      (await bucket.head(imageKey))?.uploaded.toISOString(),
    );
    expect(fetch.mock.calls[1]?.[1].body).toEqual(new Uint8Array([1, 2, 3]));
  });
});
