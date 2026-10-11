/**
 * Tomokichi Studio's operator console on admin.tmkch.io.
 *
 * inquiry-platform's gateway (`tomokichi-admin-web`) is API only by design;
 * the screen is ours to provide. This Worker owns the hostname, serves the
 * built React app, and hands every `/api/*` request to the gateway over a
 * Service Binding — unchanged, so the gateway still sees Access's JWT and the
 * `https://admin.tmkch.io` Origin and does all of its own authentication,
 * authorization and CSRF checks. Nothing here touches tickets or identities.
 *
 * Cloudflare Access sits in front of the hostname; the bundle carries no data
 * and every byte of data comes through the gateway's gate.
 */
type Env = Pick<CloudflareBindings, "ASSETS" | "GATEWAY">;

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // The operator Mac's signing service for Remeet moderation decisions
  // (docs/inquiry-platform/report-workflow.md).
  "connect-src 'self' http://127.0.0.1:47831",
  "frame-ancestors 'none'",
  "form-action 'none'",
  "base-uri 'none'",
  "object-src 'none'",
].join("; ");

export function isApiPath(pathname: string): boolean {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function withSecurityHeaders(response: Response, pathname: string): Response {
  const secured = new Response(response.body, response);
  const headers = secured.headers;
  headers.set("Content-Security-Policy", CSP);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  // The shell and the service worker must never be stale after a deploy;
  // hashed bundles under /assets/ can be cached.
  if (!pathname.startsWith("/assets/")) {
    headers.set("Cache-Control", "private, no-cache");
  }
  return secured;
}

export async function handle(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (isApiPath(pathname)) return env.GATEWAY.fetch(request);
  return withSecurityHeaders(await env.ASSETS.fetch(request), pathname);
}

export default { fetch: handle } satisfies ExportedHandler<Env>;
