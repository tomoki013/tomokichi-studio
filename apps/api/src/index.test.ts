import { describe, expect, it, vi } from "vitest";

import { createApp } from "./index";
import { sendSupportEmail } from "./support/email";
import type { SupportBindings, SupportEmail } from "./support/types";

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
    deliver?: (email: SupportEmail) => Promise<{ id: string }>;
    rate?: boolean;
    /** Extra bindings, for the tests that care what reaches Studio Admin. */
    env?: Partial<SupportBindings & { ADMIN_CORE: unknown }>;
  } = {},
) {
  const app = createApp({
    deliver: options.deliver
      ? (email) => options.deliver?.(email) as Promise<{ id: string }>
      : async () => ({ id: "email-id" }),
    rateLimit: async () => options.rate ?? true,
  });
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.origin) headers.Origin = options.origin;
  return app.request(
    "https://api.example.com/api/v1/support",
    { method: "POST", headers, body: JSON.stringify(body) },
    { ...env, ...options.env },
  );
}

describe("POST /api/v1/support", () => {
  it("accepts a valid request", async () => {
    const response = await post(validRequest);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, requestId: validRequest.requestId });
  });

  it("accepts and labels apps from the shared brand registry", async () => {
    const deliver = vi.fn<(email: SupportEmail) => Promise<{ id: string }>>(async () => ({
      id: "email-id",
    }));
    const response = await post({ ...validRequest, app: "yohaku" }, { deliver });
    expect(response.status).toBe(200);
    expect(deliver.mock.calls[0]?.[0].subject).toContain("[Yohaku]");
  });

  it("accepts a request with no email when no reply is requested", async () => {
    const { email: _email, ...withoutEmail } = validRequest;
    const deliver = vi.fn<(email: SupportEmail) => Promise<{ id: string }>>(async () => ({
      id: "email-id",
    }));
    const response = await post(withoutEmail, { deliver });
    expect(response.status).toBe(200);
    expect(deliver.mock.calls[0]?.[0].replyTo).toBeUndefined();
  });

  it("accepts an empty-string email the same as an omitted one (Remeet iOS always sends the key)", async () => {
    const deliver = vi.fn<(email: SupportEmail) => Promise<{ id: string }>>(async () => ({
      id: "email-id",
    }));
    const response = await post(
      { ...validRequest, source: "remeet-ios", name: "", email: "" },
      { deliver },
    );
    expect(response.status).toBe(200);
    expect(deliver.mock.calls[0]?.[0].replyTo).toBeUndefined();
    expect(deliver.mock.calls[0]?.[0].text).toContain("（未入力・返信不要）");
  });

  it("accepts the Colorvia iOS source", async () => {
    const response = await post({ ...validRequest, source: "colorvia-ios", app: "colorvia" });
    expect(response.status).toBe(200);
  });

  it("accepts empty name and email together", async () => {
    const response = await post({ ...validRequest, name: "", email: "" });
    expect(response.status).toBe(200);
  });

  it("silently accepts (without delivering) a honeypot-triggered submission", async () => {
    const deliver = vi.fn<(email: SupportEmail) => Promise<{ id: string }>>(async () => ({
      id: "email-id",
    }));
    const response = await post(
      { ...validRequest, website: "http://spam.example.com" },
      { deliver },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, requestId: validRequest.requestId });
    expect(deliver).not.toHaveBeenCalled();
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

  it("does not deliver honeypot submissions", async () => {
    const deliver = vi.fn<(email: SupportEmail) => Promise<{ id: string }>>(async () => ({
      id: "email-id",
    }));
    const response = await post({ ...validRequest, website: "spam.example" }, { deliver });
    expect(response.status).toBe(200);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    const response = await post(validRequest, { rate: false });
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ code: "RATE_LIMITED" });
  });

  it("returns 502 without exposing delivery details", async () => {
    const response = await post(validRequest, {
      deliver: async () => {
        throw new Error("secret upstream response");
      },
    });
    expect(response.status).toBe(502);
    expect(JSON.stringify(await response.json())).not.toContain("secret upstream");
  });

  /**
   * The copy for Admin does not depend on the mail going out.
   *
   * It used to: the mirror ran after a successful send, so a provider over its
   * quota meant the sender got a 502 and their message existed nowhere. Admin
   * has a database, and a question is worth more than the notification about
   * it.
   */
  it("records the message in Admin even when delivery fails", async () => {
    const createSupportThread = vi.fn().mockResolvedValue({ ok: true, value: {} });
    const response = await post(validRequest, {
      deliver: async () => {
        throw new Error("resend is over quota");
      },
      env: { ADMIN_CORE: { createSupportThread } },
    });

    expect(response.status).toBe(502);
    expect(createSupportThread).toHaveBeenCalledTimes(1);
    const [input] = createSupportThread.mock.calls[0] as [Record<string, unknown>];
    expect(input.requesterEmail).toBe("user@example.com");
  });

  /**
   * The reason this exists: the app asks for an address only when somebody
   * wants an answer, so 不具合 / 要望 / その他 arrive without one. The mirror
   * used to skip exactly those, and every inquiry sent from inside the app was
   * mail-only — invisible on the screen the operator actually reads.
   */
  it("records a message sent without a reply address", async () => {
    const createSupportThread = vi.fn().mockResolvedValue({ ok: true, value: {} });
    const response = await post(
      { ...validRequest, email: "" },
      { env: { ADMIN_CORE: { createSupportThread } } },
    );

    expect(response.status).toBe(200);
    expect(createSupportThread).toHaveBeenCalledTimes(1);
    const [input] = createSupportThread.mock.calls[0] as [Record<string, unknown>];
    // The route's own validation folds an empty address into nothing at all,
    // so what reaches Admin is an absence rather than a blank string.
    expect(input.requesterEmail).toBeUndefined();
    expect(input.bodyText).toContain("十分な長さ");
  });

  it("normalizes reply-to and sets an idempotency key", async () => {
    const deliver = vi.fn<(email: SupportEmail) => Promise<{ id: string }>>(async () => ({
      id: "email-id",
    }));
    await post(validRequest, { deliver });
    const email = deliver.mock.calls[0]?.[0];
    expect(email?.replyTo).toBe("user@example.com");
    expect(email?.idempotencyKey).toBe(`support-${validRequest.requestId}`);
    expect(email?.html).toContain("&lt;script&gt;");
    expect(email?.html).not.toContain("<script>");
    expect(email?.text).toContain("問い合わせ内容");
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

  it("accepts an Origin-less iOS request", async () => {
    expect((await post(validRequest)).status).toBe(200);
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
