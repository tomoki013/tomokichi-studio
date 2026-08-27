import assetCacheWorker, { errorPage } from "@tomokichi/app-site/asset-cache-worker";
import { describe, expect, it } from "vitest";

/**
 * The shared asset-cache Worker now sits in front of every site, so what it
 * does when the assets underneath it fail is the studio's error behaviour.
 */

const ERROR_PAGE = "<!doctype html><title>Something went wrong</title>";

/** Assets that answer normally, unless the test says otherwise. */
const assets = (
  handler: (request: Request) => Response | Promise<Response>,
): { ASSETS: { fetch(request: Request): Promise<Response> } } => ({
  ASSETS: {
    async fetch(request: Request) {
      if (new URL(request.url).pathname === "/500.html") {
        return new Response(ERROR_PAGE, { status: 200, headers: { "Content-Type": "text/html" } });
      }
      return handler(request);
    },
  },
});

const get = (path: string, origin = "https://yohaku.tmkch.io") => new Request(`${origin}${path}`);

describe("serving assets", () => {
  it("passes a page through and gives HTML a short cache", async () => {
    const env = assets(() => new Response("<h1>ok</h1>", { status: 200 }));
    const response = await assetCacheWorker.fetch(get("/features/"), env);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("max-age=300");
  });

  it("caches hashed build output for a year", async () => {
    const env = assets(() => new Response("body{}", { status: 200 }));
    const response = await assetCacheWorker.fetch(get("/_astro/page.abc123.css"), env);

    expect(response.headers.get("Cache-Control")).toContain("immutable");
  });

  it("leaves a 404 alone, so the site's own 404 page keeps its status", async () => {
    const env = assets(() => new Response("<h1>not found</h1>", { status: 404 }));
    const response = await assetCacheWorker.fetch(get("/nope/"), env);

    expect(response.status).toBe(404);
    expect(await response.text()).toContain("not found");
  });
});

describe("keeping previews out of search", () => {
  it("marks a workers.dev preview noindex", async () => {
    const env = assets(() => new Response("<h1>ok</h1>", { status: 200 }));
    const response = await assetCacheWorker.fetch(
      get("/", "https://tomokichi-yohaku.tomoki-ttttt.workers.dev"),
      env,
    );

    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });

  it("leaves the real site indexable", async () => {
    const env = assets(() => new Response("<h1>ok</h1>", { status: 200 }));
    const response = await assetCacheWorker.fetch(get("/"), env);

    expect(response.headers.get("X-Robots-Tag")).toBeNull();
  });
});

describe("when something fails", () => {
  it("serves the site's error page instead of a blank 5xx", async () => {
    const env = assets(() => new Response("upstream is unhappy", { status: 503 }));
    const response = await assetCacheWorker.fetch(get("/features/"), env);

    expect(response.status).toBe(503);
    expect(await response.text()).toBe(ERROR_PAGE);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("catches a throw rather than letting it reach the reader", async () => {
    const env = assets(() => {
      throw new Error("boom");
    });
    const response = await assetCacheWorker.fetch(get("/features/"), env);

    expect(response.status).toBe(500);
    expect(await response.text()).toBe(ERROR_PAGE);
  });

  it("never caches an error, and never lets one be indexed", async () => {
    const env = assets(() => new Response("", { status: 500 }));
    const response = await assetCacheWorker.fetch(get("/"), env);

    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
  });

  it("falls back to plain text when even the error page cannot be read", async () => {
    const env = {
      ASSETS: {
        async fetch() {
          throw new Error("assets are entirely gone");
        },
      },
    };
    const response = await errorPage(get("/"), env, 500);

    expect(response.status).toBe(500);
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(await response.text()).toContain("Something went wrong");
  });
});
