/**
 * Thin Worker in front of static assets: long-cache hashed/static files,
 * short revalidation for HTML so deploys show up quickly.
 *
 * It also keeps preview deployments out of search. Every page canonicalises to
 * the production hostname, but a `*.workers.dev` preview is a live, crawlable
 * copy of the whole site, so it says so in a header as well.
 *
 * And it is what turns the built 500 page into a page anyone ever sees: static
 * assets have no failure path of their own, so without something in front of
 * them a reader who hits a bad moment gets Cloudflare's blank error instead of
 * the site's.
 */
const LONG_CACHE = "public, max-age=31536000, immutable";
const HTML_CACHE = "public, max-age=300, must-revalidate";
const SHORT_CACHE = "public, max-age=3600, must-revalidate";

const LONG_EXT =
  /\.(?:css|js|mjs|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|mp4|webm|txt)$/i;

/**
 * The site's own error page, served with a 5xx status so nothing mistakes a
 * failure for a page. If even this cannot be fetched, fall back to plain text
 * rather than throwing again.
 */
export async function errorPage(request, env, status) {
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
  try {
    // A Request, not a URL: that is what the assets binding takes.
    const page = await env.ASSETS.fetch(new Request(new URL("/500.html", request.url)));
    if (page?.ok) {
      return new Response(page.body, {
        status,
        headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
      });
    }
  } catch {
    // Fall through to the plain-text response below.
  }
  return new Response("Something went wrong.", {
    status,
    headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
  });
}

export default {
  async fetch(request, env) {
    let response;
    try {
      response = await env.ASSETS.fetch(request);
    } catch {
      return errorPage(request, env, 500);
    }
    if (!response) return errorPage(request, env, 500);
    if (response.status >= 500) return errorPage(request, env, response.status);
    if (response.status === 404) return response;

    const url = new URL(request.url);
    const path = url.pathname;
    const headers = new Headers(response.headers);

    // Only the custom domain is the real site. Matching on workers.dev rather
    // than on a configured hostname means production can never be excluded by
    // a missing or mistyped variable.
    if (url.hostname.endsWith(".workers.dev")) {
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    if (path.startsWith("/_astro/") || LONG_EXT.test(path)) {
      headers.set("Cache-Control", LONG_CACHE);
    } else if (path.endsWith(".html") || path.endsWith("/") || !path.includes(".")) {
      headers.set("Cache-Control", HTML_CACHE);
    } else {
      headers.set("Cache-Control", SHORT_CACHE);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
