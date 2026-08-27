import { describe, expect, it, vi } from "vitest";

import { createApp } from "../index";
import { verifyTurnstileToken } from "./turnstile";
import type { SupportBindings, SupportEmail } from "./types";

const webRequest = {
  requestId: "49a3999c-0ce1-4ea6-ab68-afcd6dc2e794",
  clientId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  source: "main-web",
  app: "yohaku",
  category: "question",
  email: "user@example.com",
  message: "これは十分な長さの問い合わせ内容です。",
  locale: "ja-JP",
  submittedAt: "2026-07-26T12:00:00.000Z",
  website: "",
};

const baseEnv: SupportBindings = {
  RESEND_API_KEY: "test-key",
  SUPPORT_TO_EMAIL: "support@example.com",
  SUPPORT_FROM_EMAIL: "Support <from@example.com>",
  MAIN_SITE_ORIGIN: "https://tmkch.io",
  MAIN_SITE_WORKERS_ORIGIN: "https://tomokichi-main.tomoki-ttttt.workers.dev",
  SUPPORT_RATE_LIMITER: { limit: async () => ({ success: true }) },
};

function post(
  body: unknown,
  options: { secret?: string; verify?: typeof verifyTurnstileToken } = {},
) {
  const deliver = vi.fn<(email: SupportEmail) => Promise<{ id: string }>>(async () => ({
    id: "email-id",
  }));
  const app = createApp({
    deliver,
    rateLimit: async () => true,
    verifyTurnstile: options.verify,
  });
  const response = app.request(
    "https://api.example.com/api/v1/support",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    { ...baseEnv, ...(options.secret ? { TURNSTILE_SECRET_KEY: options.secret } : {}) },
  );
  return { response, deliver };
}

describe("Turnstile on the support endpoint", () => {
  it("verifies nothing while no secret is configured", async () => {
    const verify = vi.fn(async () => ({ ok: false }));
    const { response, deliver } = post(webRequest, { verify });

    expect((await response).status).toBe(200);
    expect(verify).not.toHaveBeenCalled();
    expect(deliver).toHaveBeenCalled();
  });

  it("leaves the native apps alone — they have no browser to solve a challenge in", async () => {
    const verify = vi.fn(async () => ({ ok: false }));
    const { response, deliver } = post(
      { ...webRequest, source: "remeet-ios", app: "remeet" },
      { secret: "sk", verify },
    );

    expect((await response).status).toBe(200);
    expect(verify).not.toHaveBeenCalled();
    expect(deliver).toHaveBeenCalled();
  });

  it("checks the token on a web request once a secret is set", async () => {
    const verify = vi.fn(async () => ({ ok: true }));
    const { response, deliver } = post(
      { ...webRequest, turnstileToken: "a-token" },
      { secret: "sk", verify },
    );

    expect((await response).status).toBe(200);
    expect(verify).toHaveBeenCalledWith(
      "a-token",
      "sk",
      expect.objectContaining({
        idempotencyKey: webRequest.requestId,
      }),
    );
    expect(deliver).toHaveBeenCalled();
  });

  it("turns away a web request that fails the check, and sends no email", async () => {
    const verify = vi.fn(async () => ({ ok: false, errorCodes: ["invalid-input-response"] }));
    const { response, deliver } = post(
      { ...webRequest, turnstileToken: "stale" },
      { secret: "sk", verify },
    );
    const result = await response;

    expect(result.status).toBe(403);
    expect(await result.json()).toMatchObject({ ok: false, code: "TURNSTILE_FAILED" });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("turns away a web request with no token at all", async () => {
    const verify = vi.fn(async () => ({ ok: false }));
    const { response, deliver } = post(webRequest, { secret: "sk", verify });

    expect((await response).status).toBe(403);
    expect(verify).toHaveBeenCalledWith("", "sk", expect.anything());
    expect(deliver).not.toHaveBeenCalled();
  });

  it("never tells the sender why they failed", async () => {
    const verify = vi.fn(async () => ({ ok: false, errorCodes: ["invalid-input-secret"] }));
    const { response } = post({ ...webRequest, turnstileToken: "x" }, { secret: "sk", verify });
    const body = JSON.stringify(await (await response).json());

    expect(body).not.toContain("invalid-input-secret");
  });
});

describe("verifyTurnstileToken", () => {
  const siteverify = (result: unknown, ok = true) =>
    vi.fn(async () => new Response(JSON.stringify(result), { status: ok ? 200 : 500 }));

  it("passes a token Cloudflare accepts", async () => {
    const fetchImpl = siteverify({ success: true });
    const result = await verifyTurnstileToken("token", "secret", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(true);
    const body = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string;
    expect(new URLSearchParams(body).get("response")).toBe("token");
    expect(new URLSearchParams(body).get("secret")).toBe("secret");
  });

  it("reports Cloudflare's codes when it rejects one", async () => {
    const fetchImpl = siteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
    const result = await verifyTurnstileToken("token", "secret", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: false, errorCodes: ["timeout-or-duplicate"] });
  });

  it("does not call out at all for an empty token", async () => {
    const fetchImpl = siteverify({ success: true });
    const result = await verifyTurnstileToken("", "secret", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result.ok).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when Cloudflare cannot be reached", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("network down");
    });
    const result = await verifyTurnstileToken("token", "secret", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: false, errorCodes: ["unreachable"] });
  });

  it("fails closed on an HTTP error from siteverify", async () => {
    const fetchImpl = siteverify({}, false);
    const result = await verifyTurnstileToken("token", "secret", {
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(result).toEqual({ ok: false, errorCodes: ["http-500"] });
  });
});
