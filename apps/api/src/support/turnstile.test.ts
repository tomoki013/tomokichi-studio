import { describe, expect, it, vi } from "vitest";

import { createApp } from "../index";
import { verifyTurnstileToken } from "./turnstile";
import { type SupportBindings, supportSources } from "./types";

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
  // "Delivered" now means "recorded in Admin". The stub stands in for the
  // binding; what the tests assert is whether the message got that far.
  const deliver = vi.fn().mockResolvedValue({
    ok: true,
    value: { ticketNumber: "1", status: "OPEN", duplicate: false },
  });
  const app = createApp({
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
    {
      ...baseEnv,
      INQUIRY: { submitContact: deliver },
      ...(options.secret ? { TURNSTILE_SECRET_KEY: options.secret } : {}),
    },
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

  it("turns away a web request that fails the check, without saying why", async () => {
    const verify = vi.fn(async () => ({ ok: false, errorCodes: ["invalid-input-secret"] }));
    const { response, deliver } = post(
      { ...webRequest, turnstileToken: "stale" },
      { secret: "sk", verify },
    );
    const result = await response;

    expect(result.status).toBe(403);
    const body = await result.json();
    expect(body).toMatchObject({ ok: false, code: "TURNSTILE_FAILED" });
    expect(JSON.stringify(body)).not.toContain("invalid-input-secret");
    expect(deliver).not.toHaveBeenCalled();
  });

  /** Not stubbed: the real check must refuse a missing token by itself. */
  it("turns away a web request with no token at all", async () => {
    const { response, deliver } = post(webRequest, { secret: "sk" });

    expect((await response).status).toBe(403);
    expect(deliver).not.toHaveBeenCalled();
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

  it("fails closed when siteverify is unreachable or erroring", async () => {
    const unreachable = vi.fn(async () => {
      throw new Error("network down");
    });
    for (const fetchImpl of [unreachable, siteverify({}, false)]) {
      const result = await verifyTurnstileToken("token", "secret", {
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });
      expect(result.ok).toBe(false);
    }
  });
});

describe("the client key, for sources that cannot solve a challenge", () => {
  function postWithHeaders(
    body: unknown,
    options: { clientKey?: string; header?: string; secret?: string } = {},
  ) {
    const deliver = vi.fn().mockResolvedValue({
      ok: true,
      value: { ticketNumber: "1", status: "OPEN", duplicate: false },
    });
    const app = createApp({
      rateLimit: async () => true,
      verifyTurnstile: async () => ({ ok: true }),
    });
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (options.header) headers["X-Support-Client"] = options.header;
    const response = app.request(
      "https://api.example.com/api/v1/support",
      { method: "POST", headers, body: JSON.stringify(body) },
      {
        ...baseEnv,
        INQUIRY: { submitContact: deliver },
        ...(options.clientKey ? { SUPPORT_CLIENT_KEY: options.clientKey } : {}),
        ...(options.secret ? { TURNSTILE_SECRET_KEY: options.secret } : {}),
      },
    );
    return { response, deliver };
  }

  const appRequest = { ...webRequest, source: "remeet-ios", app: "remeet" };

  it("enforces nothing while no key is configured", async () => {
    const { response } = postWithHeaders(appRequest);
    expect((await response).status).toBe(200);
  });

  it("accepts an app that presents the key", async () => {
    const { response } = postWithHeaders(appRequest, {
      clientKey: "shared-key",
      header: "shared-key",
    });
    expect((await response).status).toBe(200);
  });

  // Every app source is gated by the same key; none may be left out of the
  // list (Yohaku was, and every in-app message from it was refused).
  const appSources = supportSources.filter((source) => source !== "main-web");
  it.each(appSources)("applies the key to %s", async (source) => {
    const accepted = postWithHeaders(
      { ...appRequest, source },
      { clientKey: "shared-key", header: "shared-key" },
    );
    expect((await accepted.response).status).toBe(200);

    const refused = postWithHeaders({ ...appRequest, source }, { clientKey: "shared-key" });
    expect((await refused.response).status).toBe(403);
  });

  it("turns away an app request with no key, or the wrong one", async () => {
    const missing = postWithHeaders(appRequest, { clientKey: "shared-key" });
    expect((await missing.response).status).toBe(403);
    expect(missing.deliver).not.toHaveBeenCalled();

    const wrong = postWithHeaders(appRequest, { clientKey: "shared-key", header: "nope-same-len" });
    expect((await wrong.response).status).toBe(403);
  });

  it("closes the gap where claiming to be an app skipped the web check", async () => {
    // The whole point: with Turnstile on, `source: "main-web"` needs a token
    // and every other source needs the key. Neither is a way past the other.
    const { response, deliver } = postWithHeaders(
      { ...webRequest, source: "remeet-ios", app: "remeet" },
      { clientKey: "shared-key", secret: "sk" },
    );

    expect((await response).status).toBe(403);
    expect(await (await response).json()).toMatchObject({ code: "CLIENT_NOT_ALLOWED" });
    expect(deliver).not.toHaveBeenCalled();
  });

  it("never asks the web form for a key it could not keep secret", async () => {
    const { response } = postWithHeaders(
      { ...webRequest, turnstileToken: "token" },
      { clientKey: "shared-key", secret: "sk" },
    );
    expect((await response).status).toBe(200);
  });
});
