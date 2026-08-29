import assert from "node:assert/strict";
import test from "node:test";

import worker, { appleAppSiteAssociation } from "./asset-cache-worker.js";

const configuredEnv = {
  APPLE_APP_ID: "TEAM123456.io.example.app",
  APP_STORE_URL: "https://apps.apple.com/app/id123456789",
  UNIVERSAL_LINK_PATHS: '["/open"]',
  ASSETS: {
    fetch() {
      throw new Error("configured universal-link requests must not reach static assets");
    },
  },
};

test("builds a narrowly scoped AASA payload", () => {
  const payload = JSON.parse(
    appleAppSiteAssociation(
      ["TEAM123456.io.example.app"],
      [{ "/": "/open", comment: "App entry" }],
    ),
  );
  assert.deepEqual(payload.applinks.details, [
    {
      appIDs: ["TEAM123456.io.example.app"],
      components: [{ "/": "/open", comment: "App entry" }],
    },
  ]);
});

test("serves the well-known AASA endpoint without a redirect", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/.well-known/apple-app-site-association"),
    configuredEnv,
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/json");
  const payload = await response.json();
  assert.deepEqual(payload.applinks.details[0].appIDs, ["TEAM123456.io.example.app"]);
  assert.equal(payload.applinks.details[0].components[0]["/"], "/open");
});

test("redirects the browser fallback to the configured App Store page", async () => {
  const response = await worker.fetch(new Request("https://example.com/open"), configuredEnv);
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("Location"), "https://apps.apple.com/app/id123456789");
});

test("leaves app-link endpoints disabled when a site has no app configuration", async () => {
  let requested = false;
  const response = await worker.fetch(
    new Request("https://example.com/.well-known/apple-app-site-association"),
    {
      ASSETS: {
        fetch() {
          requested = true;
          return new Response("not found", { status: 404 });
        },
      },
    },
  );
  assert.equal(requested, true);
  assert.equal(response.status, 404);
});
