import assetCacheWorker from "@tomokichi/app-site/asset-cache-worker";

import { appleAppSiteAssociation } from "./apple-app-site-association";
import type { WorkerEnv } from "./env";
import { landingCopy, landingPage } from "./invite/landing";
import { ogCopy } from "./invite/og";
import { inviteOGImage } from "./invite/og-render";
import { fetchInvitePreview, isWellFormedToken } from "./invite/preview";

/**
 * The Remeet site, plus the invitation entrance.
 *
 * `remeet.tmkch.io` is the half of the invitation system people see: the URL
 * they send each other, the page it opens without the app, the preview a
 * messaging app draws, and the file that makes iOS hand the link to Remeet.
 * The invitation *data* — tokens, codes, the CKShare URL behind them — lives
 * entirely behind `api.tmkch.io`, which this Worker only ever asks for a code.
 *
 * Everything the site itself serves still goes through the shared asset-cache
 * Worker; only these two paths are intercepted:
 *
 *   GET /i/{token}
 *   GET /.well-known/apple-app-site-association
 *
 * It deliberately does no logging: an invitation token is a bearer credential,
 * and Workers' observability would be the easiest place for one to leak.
 */
export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/.well-known/apple-app-site-association") {
      return new Response(
        appleAppSiteAssociation(env.APPLE_APP_ID ?? "7GU925RQ99.io.tmkch.remeet"),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
          },
        },
      );
    }

    // The picture beside the link, drawn per request so its countdown is the
    // real one. Placed before the landing route because it is a longer path
    // under the same prefix.
    const ogMatch = url.pathname.match(/^\/i\/([^/]+)\/og\.png$/);
    if (ogMatch && request.method === "GET") {
      const token = ogMatch[1];
      const preview = isWellFormedToken(token)
        ? await fetchInvitePreview(env.INVITE_API_ORIGIN, token, env.INVITE_CLIENT_KEY)
        : null;
      // No reunion, no picture worth drawing here: fall back to the static one
      // rather than an image of nothing, so an expired or older invitation
      // still previews as Remeet.
      if (!preview?.reunion) {
        return Response.redirect(`${url.origin}/assets/invite-preview.png?v=2`, 302);
      }
      const png = await inviteOGImage(
        preview.reunion,
        ogCopy(request.headers.get("Accept-Language")),
      );
      return new Response(png as BodyInit, {
        headers: {
          "Content-Type": "image/png",
          // Short, because the countdown moves: a day is long enough that a
          // group chat is not re-rendering it constantly, short enough that
          // nobody sees a number two days stale. `immutable` is deliberately
          // absent — the URL cannot change when the number does.
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    if (url.pathname.startsWith("/i/") && request.method === "GET") {
      const token = url.pathname.slice("/i/".length).replace(/\/$/, "");
      // The code is shown to whoever already holds the link, so that somebody
      // reading this page on one phone can type it into Remeet on another.
      // The page renders either way: an invitation that has expired or been
      // used still explains where to get the app.
      const preview = isWellFormedToken(token)
        ? await fetchInvitePreview(env.INVITE_API_ORIGIN, token, env.INVITE_CLIENT_KEY)
        : null;
      return new Response(
        landingPage({
          copy: landingCopy(request.headers.get("Accept-Language")),
          appStoreURL: env.APP_STORE_URL || null,
          siteURL: url.origin,
          inviteCode: preview?.inviteCode ?? null,
          // Text, alongside the same number burnt into the picture: a preview
          // whose image fails to load, or whose renderer ignores images, still
          // says how long is left.
          daysRemaining: preview?.reunion?.daysRemaining ?? null,
          // `og:url` is the invitation's own address, without any query a
          // messaging app may have appended on the way.
          pageURL: `${url.origin}${url.pathname}`,
        }),
        {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
          },
        },
      );
    }

    return assetCacheWorker.fetch(request, env);
  },
};
