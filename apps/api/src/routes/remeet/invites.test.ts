import { describe, expect, it } from "vitest";

import { createApp } from "../../index";

const post = (
  path: string,
  body: unknown,
  env: Record<string, unknown> = {},
  headers: Record<string, string> = {},
) =>
  createApp().request(
    `https://api.tmkch.io${path}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    },
    env,
  );

const PATHS = [
  "/remeet/v1/invites",
  "/remeet/v1/invites/resolve",
  "/remeet/v1/invites/preview",
  "/remeet/v1/invites/revoke",
];

describe("the Remeet invite namespace", () => {
  /// Half-provisioned is not a state this may operate in: without the database
  /// and both secrets it would either throw per request or store a share URL
  /// it could not protect.
  it("refuses every endpoint until the backend is provisioned", async () => {
    for (const path of PATHS) {
      const response = await post(path, {});
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "SERVICE_UNAVAILABLE" });
    }
  });

  it("keeps invitations out of every cache between here and the app", async () => {
    const response = await post("/remeet/v1/invites/resolve", {});
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("is versioned from the first day", async () => {
    const unversioned = await post("/remeet/invites", {});
    expect(unversioned.status).toBe(404);
  });

  /// Remeet's namespace and the support form share a Worker and nothing else.
  /// A filter rather than a door — the value ships inside the app — but it is
  /// the difference between an endpoint anyone can poke and one that ignores
  /// everything but Remeet.
  it("ignores requests that do not come from Remeet", async () => {
    const env = { REMEET_INVITE_CLIENT_KEY: "test-client-key" };
    for (const path of PATHS) {
      expect((await post(path, {}, env)).status).toBe(403);
      expect((await post(path, {}, env, { "X-Remeet-Client": "wrong" })).status).toBe(403);
      // The right key gets past the filter and on to the real answer, which
      // here is "not provisioned".
      expect((await post(path, {}, env, { "X-Remeet-Client": "test-client-key" })).status).toBe(
        503,
      );
    }
  });

  it("is unenforced until a key is configured, so a rotation locks nobody out", async () => {
    expect((await post("/remeet/v1/invites", {})).status).toBe(503);
  });

  it("does not disturb the rest of the API", async () => {
    const response = await createApp().request("https://api.tmkch.io/api/v1/health");
    expect(response.status).toBe(200);
  });
});

describe("the nightly sweep", () => {
  it("does nothing at all when there is no database to sweep", async () => {
    const { default: worker } = await import("../../index");
    await expect(worker.scheduled({}, {} as never)).resolves.toBeUndefined();
  });
});
