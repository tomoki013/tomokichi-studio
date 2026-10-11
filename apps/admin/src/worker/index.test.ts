import { describe, expect, it, vi } from "vitest";
import { handle, isApiPath } from "./index";

function fetcher(body: string, headers: Record<string, string> = {}) {
  const fetch = vi.fn(async (_request: Request) => new Response(body, { headers }));
  return { fetch, connect: vi.fn() } as unknown as Fetcher & { fetch: typeof fetch };
}

function env() {
  return {
    ASSETS: fetcher("<!doctype html>", { "Content-Type": "text/html" }),
    GATEWAY: fetcher('{"ok":true}', { "Content-Type": "application/json" }),
  };
}

const run = (url: string, bindings: ReturnType<typeof env>, init?: RequestInit) =>
  handle(new Request(url, init), bindings);

describe("isApiPath", () => {
  it("matches the API and nothing that merely starts with the word", () => {
    expect(isApiPath("/api")).toBe(true);
    expect(isApiPath("/api/tickets")).toBe(true);
    expect(isApiPath("/apis")).toBe(false);
    expect(isApiPath("/tickets/api")).toBe(false);
  });
});

describe("console worker", () => {
  it("hands /api/* to the gateway untouched", async () => {
    const bindings = env();
    const request = new Request("https://admin.tmkch.io/api/tickets", {
      method: "PATCH",
      headers: { Origin: "https://admin.tmkch.io", "Cf-Access-Jwt-Assertion": "jwt" },
      body: "{}",
    });
    const response = await handle(request, bindings);
    expect(await response.text()).toBe('{"ok":true}');
    expect(bindings.GATEWAY.fetch).toHaveBeenCalledWith(request);
    expect(bindings.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("serves everything else from the assets with security headers", async () => {
    const bindings = env();
    const response = await run("https://admin.tmkch.io/tickets/T-1", bindings);
    expect(bindings.GATEWAY.fetch).not.toHaveBeenCalled();
    expect(response.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    expect(response.headers.get("Cache-Control")).toBe("private, no-cache");
  });

  it("leaves hashed bundles cacheable", async () => {
    const response = await run("https://admin.tmkch.io/assets/index-abc.js", env());
    expect(response.headers.get("Cache-Control")).toBeNull();
  });
});
