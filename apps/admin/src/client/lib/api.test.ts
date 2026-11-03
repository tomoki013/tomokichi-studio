import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, shouldRetryQuery } from "./api";

afterEach(() => vi.unstubAllGlobals());

describe("API authentication and transport", () => {
  it("recognizes Access's opaque login redirect without following it", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({ type: "opaqueredirect", status: 0, headers: new Headers() });
    vi.stubGlobal("fetch", fetch);

    await expect(api.get("/api/tickets")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/tickets",
      expect.objectContaining({
        credentials: "same-origin",
        redirect: "manual",
      }),
    );
  });

  it("recognizes a non-JSON 401 as an authentication failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("Unauthorized", {
          status: 401,
          headers: { "X-Request-Id": "auth-request" },
        }),
      ),
    );

    await expect(api.get("/api/session")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      requestId: "auth-request",
    });
  });

  it("keeps real network failures distinct from an expired session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(api.get("/api/tickets")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
  });

  it("retains the request id in the gateway's JSON authentication error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "UNAUTHORIZED", message: "サインインが必要です。" },
            requestId: "json-auth-request",
          }),
          { status: 401 },
        ),
      ),
    );

    await expect(api.get("/api/session")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      requestId: "json-auth-request",
    });
  });

  it("preserves the gateway's structured errors and does not retry permission failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            error: { code: "FORBIDDEN", message: "この操作の権限がありません。" },
            requestId: "permission-request",
          }),
          { status: 403 },
        ),
      ),
    );

    const error = await api.get("/api/tickets").catch((error: unknown) => error);
    expect(error).toMatchObject({ code: "FORBIDDEN", requestId: "permission-request" });
    expect(shouldRetryQuery(0, error)).toBe(false);
  });

  it("does not retry expired sessions or missing records, but bounds transient retries", () => {
    for (const code of ["UNAUTHORIZED", "NOT_FOUND"]) {
      expect(shouldRetryQuery(0, new ApiError(code, "日本語のエラーメッセージ", undefined))).toBe(
        false,
      );
    }
    expect(shouldRetryQuery(0, new ApiError("NETWORK_ERROR", "通信エラー", undefined))).toBe(true);
    expect(shouldRetryQuery(2, new Error("temporary failure"))).toBe(false);
  });

  it("continues sending JSON mutations to the same origin and unwraps successful responses", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { id: "ticket" } })));
    vi.stubGlobal("fetch", fetch);

    await expect(api.post("/api/tickets", { subject: "test" })).resolves.toEqual({ id: "ticket" });
    expect(fetch).toHaveBeenCalledWith(
      "/api/tickets",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "test" }),
        redirect: "manual",
      }),
    );
  });
});
