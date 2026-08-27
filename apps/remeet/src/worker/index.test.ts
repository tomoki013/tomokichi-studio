import { describe, expect, it } from "vitest";
import type { WorkerEnv } from "./env";
import worker from "./index";

function makeEnv(overrides: Partial<WorkerEnv> = {}): WorkerEnv {
  return {
    ASSETS: { fetch: async () => new Response("<html>site</html>", { status: 200 }) },
    APPLE_APP_ID: "7GU925RQ99.io.tmkch.remeet",
    ...overrides,
  };
}

const get = (path: string, headers: Record<string, string> = {}) =>
  new Request(`https://remeet.tmkch.io${path}`, { headers });

describe("the Remeet Worker", () => {
  it("serves the associated-domains file as JSON", async () => {
    const response = await worker.fetch(get("/.well-known/apple-app-site-association"), makeEnv());
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect((await response.json()).applinks.details[0].appIDs).toEqual([
      "7GU925RQ99.io.tmkch.remeet",
    ]);
  });

  it("shows the landing page for an invitation link", async () => {
    const response = await worker.fetch(
      get("/i/abcdefghijklmnopqrstuvwxy", { "Accept-Language": "ja" }),
      makeEnv(),
    );
    const html = await response.text();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(html).toContain("Remeetへの招待が届いています");
    // The token appears once, as `og:url` — a preview card claiming a
    // different canonical address than the link somebody actually sent would
    // be worse than showing the one they already have. It is nowhere in the
    // page body, and neither is anything about the share behind it.
    const body = html.slice(html.indexOf("</head>"));
    expect(body).not.toContain("abcdefghijklmnopqrstuvwxy");
    expect(html.split("abcdefghijklmnopqrstuvwxy").length - 1).toBe(1);
  });

  /// The preview a messaging app draws is part of the invitation, and says
  /// nothing about who invited whom.
  it("carries a Remeet link preview with nothing personal in it", async () => {
    const html = await (await worker.fetch(get("/i/abcdefghijklmnopqrstuvwxy"), makeEnv())).text();
    expect(html).toContain('property="og:title"');
    expect(html).toContain("/assets/invite-preview.png?v=");
  });

  /// The site asks the API for a code, and could not ask for a share URL if it
  /// wanted to — `preview` does not return one.
  it("shows the invitation code the API hands back", async () => {
    const calls: Request[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(new Request(input as RequestInfo, init));
      return new Response(
        JSON.stringify({ inviteCode: "7KM4P-Q2X8N", expiresAt: "2026-08-26T00:00:00Z" }),
      );
    }) as typeof fetch;
    try {
      const response = await worker.fetch(
        get("/i/abcdefghijklmnopqrstuvwxy", { "Accept-Language": "ja" }),
        makeEnv({ INVITE_API_ORIGIN: "https://api.tmkch.io" }),
      );
      const html = await response.text();
      expect(html).toContain("7KM4P-Q2X8N");
      expect(calls[0]?.url).toBe("https://api.tmkch.io/remeet/v1/invites/preview");
    } finally {
      globalThis.fetch = original;
    }
  });

  it("still explains itself when the API cannot be reached", async () => {
    const original = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    try {
      const html = await (
        await worker.fetch(
          get("/i/abcdefghijklmnopqrstuvwxy", { "Accept-Language": "ja" }),
          makeEnv({ INVITE_API_ORIGIN: "https://api.tmkch.io" }),
        )
      ).text();
      expect(html).toContain("Remeetへの招待が届いています");
      expect(html).not.toContain('class="code-label"');
    } finally {
      globalThis.fetch = original;
    }
  });

  it("serves no invite API of its own", async () => {
    const response = await worker.fetch(get("/api/v1/invites"), makeEnv());
    expect(await response.text()).toBe("<html>site</html>");
  });

  it("leaves the rest of the site to the shared asset worker", async () => {
    const response = await worker.fetch(get("/privacy"), makeEnv());
    expect(await response.text()).toBe("<html>site</html>");
  });
});
