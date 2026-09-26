import { env } from "cloudflare:workers";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../index";

/*
 * The report route, from the outside.
 *
 * What used to happen here was a mail to the operator's inbox with the
 * reported text in it. What happens now is a durable copy in R2 and a hand-off
 * to Admin Core; the operator hears "a report exists" from Admin Core, not from
 * here. These tests pin the acceptance rule — durable copy or 502 — and the
 * absence of any mail, by watching the only thing that could send one.
 */

const bucket = (env as unknown as { REMEET_REPORTS_BUCKET: R2Bucket }).REMEET_REPORTS_BUCKET;

function report() {
  return {
    reportId: crypto.randomUUID(),
    reportedAt: "2026-09-21T06:30:00.000Z",
    reason: "harassment",
    details: "しつこく連絡されています",
    appVersion: "1.2.0",
    buildNumber: "42",
    contentType: "wish",
    contentId: crypto.randomUUID(),
    reunionId: crypto.randomUUID(),
    reporterAuthorId: crypto.randomUUID(),
    contentTextSnapshot: "通報された本文",
  };
}

function post(body: Record<string, unknown>, bindings: Record<string, unknown>) {
  const form = new FormData();
  form.set("report", JSON.stringify(body));
  return createApp().request(
    "https://api.tmkch.io/remeet/v1/reports",
    { method: "POST", body: form },
    {
      RESEND_API_KEY: "key",
      SUPPORT_TO_EMAIL: "operator@example.com",
      SUPPORT_FROM_EMAIL: "Support <from@example.com>",
      ...bindings,
    } as never,
  );
}

describe("POST /remeet/v1/reports", () => {
  it("accepts by writing the outbox, hands off to Admin Core, and mails nobody", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    try {
      const submitReport = vi.fn().mockResolvedValue({
        ok: true,
        value: { reportId: "r", ticketNumber: "1", status: "OPEN", duplicate: false },
      });
      const body = report();
      const response = await post(body, {
        REMEET_REPORTS_BUCKET: bucket,
        INQUIRY: { submitReport, fetch: vi.fn() },
      });
      expect(response.status).toBe(201);
      expect(await response.json()).toEqual({ ok: true, duplicate: false });
      expect(fetchSpy).not.toHaveBeenCalled();

      // The hand-off runs after the response (`background`), so wait for it.
      // It carries the report to Admin Core — that is where it is read — and
      // nothing about it left this Worker any other way.
      await vi.waitFor(() => expect(submitReport).toHaveBeenCalledTimes(1));
      const [input] = submitReport.mock.calls[0] as [Record<string, unknown>];
      expect(input.externalReportId).toBe(body.reportId);
      expect(input.snapshotText).toBe("通報された本文");
      // Delivered, so the durable copy is gone.
      await vi.waitFor(async () =>
        expect(await bucket.head(`report-outbox/${body.reportId}.json`)).toBeNull(),
      );
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("keeps the durable copy and still answers 201 when Admin Core is down", async () => {
    const body = report();
    const response = await post(body, {
      REMEET_REPORTS_BUCKET: bucket,
      INQUIRY: { submitReport: vi.fn().mockRejectedValue(new Error("offline")) },
    });
    expect(response.status).toBe(201);
    expect(await bucket.head(`report-outbox/${body.reportId}.json`)).not.toBeNull();
  });

  it("refuses with 502 when there is nowhere durable to put the report", async () => {
    const withoutBucket = await post(report(), {
      REMEET_REPORTS_BUCKET: undefined,
      INQUIRY: { submitReport: vi.fn() },
    });
    expect(withoutBucket.status).toBe(502);
    const withoutCore = await post(report(), {
      REMEET_REPORTS_BUCKET: bucket,
      INQUIRY: undefined,
    });
    expect(withoutCore.status).toBe(502);
  });
});
