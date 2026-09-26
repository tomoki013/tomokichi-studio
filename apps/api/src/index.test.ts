import { describe, expect, it, vi } from "vitest";

import { createApp } from "./index";
import { sendSupportEmail } from "./support/email";
import type { SupportBindings, SupportEmail } from "./support/types";

/**
 * Where a support message goes now: Admin Core, and only there.
 *
 * Every test that posts a valid message supplies this stub, because the route
 * accepts a submission by writing it to Admin — there is no mail carrying
 * the message any more, and an environment without Admin Core refuses. What
 * the stub records is what crosses the binding, which is what the PII tests
 * and the "no email" tests read.
 */
function fakeCore(
  result: unknown = { ok: true, value: { ticketNumber: "1", status: "OPEN", duplicate: false } },
) {
  const submitContact = vi.fn().mockResolvedValue(result);
  return { core: { submitContact }, submitContact };
}

describe("GET /api/v1/health", () => {
  it("returns the API status", async () => {
    const app = createApp();
    const response = await app.request("https://tmkch.io/api/v1/health");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      service: "tomokichi-api",
      version: "v1",
    });
  });
});

const validRequest = {
  requestId: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
  clientId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  source: "remeet-ios",
  app: "remeet",
  category: "bug",
  name: " テスト <script> ",
  email: " User@Example.COM ",
  message: " これは十分な長さの問い合わせ内容です。 ",
  appVersion: "1.0.0",
  buildNumber: "1",
  osVersion: "iOS 26.0",
  locale: "ja-JP",
  submittedAt: "2026-07-26T12:00:00.000Z",
  website: "",
};

const env: SupportBindings = {
  RESEND_API_KEY: "test-key",
  SUPPORT_TO_EMAIL: "support@example.com",
  SUPPORT_FROM_EMAIL: "Support <from@example.com>",
  MAIN_SITE_ORIGIN: "https://tmkch.io",
  MAIN_SITE_WORKERS_ORIGIN: "https://tomokichi-main.tomoki-ttttt.workers.dev",
  SUPPORT_RATE_LIMITER: {
    limit: async () => ({ success: true }),
  },
};

function post(
  body: unknown,
  options: {
    origin?: string;
    rate?: boolean;
    /** Extra bindings. `INQUIRY` defaults to a stub that accepts. */
    env?: Partial<SupportBindings & { INQUIRY: unknown }>;
  } = {},
) {
  const app = createApp({
    rateLimit: async () => options.rate ?? true,
  });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.origin) headers.Origin = options.origin;
  return app.request(
    "https://api.example.com/api/v1/support",
    { method: "POST", headers, body: JSON.stringify(body) },
    { ...env, INQUIRY: fakeCore().core, ...options.env },
  );
}

describe("POST /api/v1/support", () => {
  it("accepts a valid request", async () => {
    const response = await post(validRequest);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, requestId: validRequest.requestId });
  });

  it("accepts apps from the shared brand registry and hands the slug to Admin", async () => {
    const { core, submitContact } = fakeCore();
    const response = await post({ ...validRequest, app: "yohaku" }, { env: { INQUIRY: core } });
    expect(response.status).toBe(200);
    expect(submitContact.mock.calls[0]?.[0]).toMatchObject({ projectSlug: "yohaku" });
  });

  it("accepts a request with no email when no reply is requested", async () => {
    const { email: _email, ...withoutEmail } = validRequest;
    const { core, submitContact } = fakeCore();
    const response = await post(withoutEmail, { env: { INQUIRY: core } });
    expect(response.status).toBe(200);
    expect(submitContact.mock.calls[0]?.[0]).toMatchObject({ email: undefined });
  });

  it("accepts an empty-string email the same as an omitted one (Remeet iOS always sends the key)", async () => {
    const { core, submitContact } = fakeCore();
    const response = await post(
      { ...validRequest, source: "remeet-ios", name: "", email: "" },
      { env: { INQUIRY: core } },
    );
    expect(response.status).toBe(200);
    const input = submitContact.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(input.email).toBeUndefined();
    expect(input.name).toBeUndefined();
  });

  it("accepts the Colorvia iOS source", async () => {
    const response = await post({ ...validRequest, source: "colorvia-ios", app: "colorvia" });
    expect(response.status).toBe(200);
  });

  it("silently accepts (without recording) a honeypot-triggered submission", async () => {
    const { core, submitContact } = fakeCore();
    const response = await post(
      { ...validRequest, website: "http://spam.example.com" },
      { env: { INQUIRY: core } },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, requestId: validRequest.requestId });
    expect(submitContact).not.toHaveBeenCalled();
  });

  it("reports missing required fields", async () => {
    const response = await post({});
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { requestId: "REQUIRED", message: "REQUIRED" },
    });
  });

  it.each([
    ["invalid email", { email: "invalid" }, { email: "INVALID_EMAIL" }],
    ["short message", { message: "short" }, { message: "TOO_SHORT" }],
    ["long message", { message: "x".repeat(5001) }, { message: "TOO_LONG" }],
    ["invalid UUID", { requestId: "not-a-uuid" }, { requestId: "INVALID_UUID" }],
  ])("rejects %s", async (_label, change, fields) => {
    const response = await post({ ...validRequest, ...change });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR", fields });
  });

  it("rejects malformed JSON", async () => {
    const app = createApp();
    const response = await app.request(
      "https://api.example.com/api/v1/support",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" },
      env,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_JSON" });
  });

  it("rejects a body over 20 KB", async () => {
    const response = await post({ ...validRequest, ignored: "x".repeat(21 * 1024) });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { request: "TOO_LARGE" },
    });
  });

  it("returns 429 when rate limited", async () => {
    const response = await post(validRequest, { rate: false });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: "RATE_LIMITED" });
  });

  /**
   * The message has one home. If Admin Core cannot write it, the sender is
   * told to try again — a 200 here would mean a message that exists nowhere.
   * Nothing about the upstream failure reaches the response.
   */
  it("returns 502 when Admin Core rejects, without exposing why", async () => {
    const response = await post(validRequest, {
      env: {
        INQUIRY: fakeCore({
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "secret upstream response" },
        }).core,
      },
    });
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("secret upstream");
  });

  it("returns 502 when Admin Core throws", async () => {
    const submitContact = vi.fn().mockRejectedValue(new Error("binding is down"));
    const response = await post(validRequest, { env: { INQUIRY: { submitContact } } });
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("binding is down");
  });

  it("refuses rather than accepts when there is no Admin Core to write to", async () => {
    const response = await post(validRequest, { env: { INQUIRY: undefined } });
    expect(response.status).toBe(502);
  });

  /**
   * The reason this exists: the app asks for an address only when somebody
   * wants an answer, so 不具合 / 要望 / その他 arrive without one. The record
   * used to skip exactly those, and every inquiry sent from inside the app was
   * mail-only — invisible on the screen the operator actually reads.
   */
  it("records a message sent without a reply address", async () => {
    const { core, submitContact } = fakeCore();
    const response = await post({ ...validRequest, email: "" }, { env: { INQUIRY: core } });

    expect(response.status).toBe(200);
    expect(submitContact).toHaveBeenCalledTimes(1);
    const [input] = submitContact.mock.calls[0] as [Record<string, unknown>];
    // The route's own validation folds an empty address into nothing at all,
    // so what reaches Admin is an absence rather than a blank string.
    expect(input.email).toBeUndefined();
    expect(input.message).toContain("十分な長さ");
  });

  /**
   * The property this whole change is for. The route has no mail dependency
   * left to assert against, so the assertion is on the surface that remains:
   * a valid submission produces exactly one call to Admin Core, keyed on the
   * request id so a retry cannot make a second ticket, and no `fetch` to any
   * mail provider at all.
   */
  it("records the message once, keyed on the request id, and mails nobody", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    try {
      const { core, submitContact } = fakeCore();
      const response = await post(validRequest, { env: { INQUIRY: core } });
      expect(response.status).toBe(200);
      expect(submitContact).toHaveBeenCalledTimes(1);
      const [input] = submitContact.mock.calls[0] as [Record<string, unknown>];
      expect(input.idempotencyKey).toBe(validRequest.requestId);
      expect(input.email).toBe("user@example.com");
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it("rejects an unknown Origin", async () => {
    const response = await post(validRequest, { origin: "https://evil.example" });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "ORIGIN_NOT_ALLOWED" });
  });

  it("accepts an allowed Origin and returns CORS headers", async () => {
    const response = await post(validRequest, {
      origin: "https://tmkch.io",
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://tmkch.io");
  });

  it("also accepts the active Workers main-site origin", async () => {
    const origin = "https://tomokichi-main.tomoki-ttttt.workers.dev";
    const response = await post(validRequest, { origin });
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
  });

  it("handles preflight for allowed origins", async () => {
    const app = createApp();
    const response = await app.request(
      "https://api.example.com/api/v1/support",
      { method: "OPTIONS", headers: { Origin: "http://localhost:4321" } },
      env,
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
  });
});

describe("Resend delivery", () => {
  it("sends reply_to and Idempotency-Key through fetch", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ id: "resend-id" }));
    const email: SupportEmail = {
      from: "Support <from@example.com>",
      to: "to@example.com",
      replyTo: "reply@example.com",
      subject: "subject",
      text: "text",
      html: "<p>html</p>",
      idempotencyKey: "support-request-id",
    };
    expect(await sendSupportEmail(email, "api-key", fetcher as typeof fetch)).toEqual({
      id: "resend-id",
    });
    const init = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("support-request-id");
    expect(JSON.parse(init.body as string)).toMatchObject({ reply_to: "reply@example.com" });
  });

  it("throws when Resend fails", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("no", { status: 500 }));
    await expect(
      sendSupportEmail(
        {
          from: "from@example.com",
          to: "to@example.com",
          replyTo: "reply@example.com",
          subject: "subject",
          text: "text",
          html: "html",
          idempotencyKey: "key",
        },
        "api-key",
        fetcher as typeof fetch,
      ),
    ).rejects.toThrow("status 500");
  });
});

describe("Public API cannot read Ticket internals", () => {
  it.each([
    "/api/tickets",
    "/api/tickets/private-id",
    "/api/tickets/private-id/notes",
    "/api/admin/tickets",
    "/admin/tickets",
    "/api/v1/tickets",
    "/api/support/threads/private-id",
  ])("has no read endpoint at %s", async (path) => {
    const core = { getTicket: vi.fn(), listTickets: vi.fn(), getSupportThread: vi.fn() };
    const response = await createApp().request(`https://tmkch.io${path}`, {}, {
      INQUIRY: core,
    } as never);
    expect(response.status).toBe(404);
    expect(core.getTicket).not.toHaveBeenCalled();
    expect(core.listTickets).not.toHaveBeenCalled();
    expect(core.getSupportThread).not.toHaveBeenCalled();
  });
});
