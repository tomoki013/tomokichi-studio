import type { Context, Hono } from "hono";

import {
  type AdminBridgeBindings,
  background,
  mirrorSupportMessage,
} from "../services/admin-bridge";
import { sendSupportEmail } from "../support/email";
import { createSupportEmail } from "../support/template";
import { verifyTurnstileToken } from "../support/turnstile";
import type { EmailDeliveryResult, SupportBindings, SupportEmail } from "../support/types";
import { validateSupportRequest } from "../support/validation";

const MAX_BODY_BYTES = 20 * 1024;
const LOCAL_ORIGIN = "http://localhost:4321";
const SUPPORT_API_PATHS = ["/api/v1/support", "/api/support"];

type SupportRouteBindings = SupportBindings & AdminBridgeBindings;
type SupportApp = Hono<{ Bindings: SupportRouteBindings }>;
type SupportContext = Context<{ Bindings: SupportRouteBindings }>;

export interface SupportDependencies {
  deliver?: (email: SupportEmail, env: SupportBindings) => Promise<EmailDeliveryResult>;
  rateLimit?: (clientId: string, env: SupportBindings) => Promise<boolean>;
  verifyTurnstile?: typeof verifyTurnstileToken;
}

const errorMessages = {
  INVALID_JSON: "リクエストを読み取れませんでした。",
  RATE_LIMITED: "短時間に送信できる回数を超えました。しばらくしてからお試しください。",
  DELIVERY_FAILED: "お問い合わせを送信できませんでした。時間をおいて再度お試しください。",
  TURNSTILE_FAILED: "確認を完了できませんでした。ページを再読み込みして、もう一度お試しください。",
  CLIENT_NOT_ALLOWED: "この経路からのお問い合わせは受け付けていません。",
} as const;

/**
 * App sources have no browser to solve a Turnstile challenge in, so they carry
 * a key instead — the same arrangement, and the same honest limits, as
 * `REMEET_INVITE_CLIENT_KEY` on the invite routes. It ships inside the app, so
 * it is a filter rather than a credential: it stops a bare `curl` and anything
 * that simply claims `source: "remeet-ios"` to skip the web check, not somebody
 * who has opened the binary.
 *
 * Unset means unenforced, so the key can be rotated without locking out builds
 * already in people's hands: add the new value to the apps first, then here.
 */
function fromKnownClient(c: SupportContext, source: string): boolean {
  const expected = c.env.SUPPORT_CLIENT_KEY;
  if (!expected || source === "main-web") return true;
  const presented = c.req.header("X-Support-Client");
  return !!presented && constantTimeEquals(presented, expected);
}

function constantTimeEquals(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function allowedOrigins(env: SupportBindings): Set<string> {
  return new Set([env.MAIN_SITE_ORIGIN, env.MAIN_SITE_WORKERS_ORIGIN, LOCAL_ORIGIN]);
}

function corsHeaders(c: SupportContext): Record<string, string> {
  const origin = c.req.header("Origin");
  return origin && allowedOrigins(c.env).has(origin)
    ? { "Access-Control-Allow-Origin": origin, Vary: "Origin" }
    : { Vary: "Origin" };
}

function logResult(
  request: { requestId: string; source: string; app: string; category: string } | undefined,
  status: number,
  startedAt: number,
  emailId?: string,
  /** Why a request was turned away, when the status alone does not say. */
  reason?: string,
): void {
  console.log(
    JSON.stringify({
      requestId: request?.requestId,
      source: request?.source,
      app: request?.app,
      category: request?.category,
      status,
      emailId,
      reason,
      durationMs: Date.now() - startedAt,
    }),
  );
}

export function registerSupportRoute(
  app: SupportApp,
  dependencies: SupportDependencies = {},
): void {
  app.on("OPTIONS", SUPPORT_API_PATHS, (c) => {
    const origin = c.req.header("Origin");
    if (!origin || !allowedOrigins(c.env).has(origin)) {
      return c.json(
        { ok: false, code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed." },
        403,
      );
    }
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders(c),
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  });

  app.on("POST", SUPPORT_API_PATHS, async (c) => {
    const startedAt = Date.now();
    const origin = c.req.header("Origin");
    if (origin && !allowedOrigins(c.env).has(origin)) {
      logResult(undefined, 403, startedAt);
      return c.json(
        { ok: false, code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed." },
        403,
        corsHeaders(c),
      );
    }

    const declaredLength = Number(c.req.header("Content-Length") ?? "0");
    if (declaredLength > MAX_BODY_BYTES) {
      logResult(undefined, 400, startedAt);
      return c.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "入力内容を確認してください。",
          fields: { request: "TOO_LARGE" },
        },
        400,
        corsHeaders(c),
      );
    }

    let rawBody: string;
    let input: unknown;
    try {
      rawBody = await c.req.text();
      if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES)
        throw new RangeError("body too large");
      input = JSON.parse(rawBody);
    } catch (error) {
      const tooLarge = error instanceof RangeError;
      logResult(undefined, 400, startedAt);
      return c.json(
        tooLarge
          ? {
              ok: false,
              code: "VALIDATION_ERROR",
              message: "入力内容を確認してください。",
              fields: { request: "TOO_LARGE" },
            }
          : { ok: false, code: "INVALID_JSON", message: errorMessages.INVALID_JSON },
        400,
        corsHeaders(c),
      );
    }

    const validation = validateSupportRequest(input);
    if (!validation.ok) {
      logResult(undefined, 400, startedAt);
      return c.json(
        {
          ok: false,
          code: "VALIDATION_ERROR",
          message: "入力内容を確認してください。",
          fields: validation.fields,
        },
        400,
        corsHeaders(c),
      );
    }
    const request = validation.value;

    if (request.website) {
      logResult(request, 200, startedAt);
      return c.json({ ok: true, requestId: request.requestId }, 200, corsHeaders(c));
    }

    // Keyed on the caller's IP, not on `clientId`: the client generates that
    // UUID itself, so a sender who wanted around the limit only had to send a
    // new one. The invite and report routes already limit this way.
    const rateLimitKey = c.req.header("CF-Connecting-IP") ?? request.clientId;
    const withinLimit = dependencies.rateLimit
      ? await dependencies.rateLimit(rateLimitKey, c.env)
      : (await c.env.SUPPORT_RATE_LIMITER.limit({ key: rateLimitKey })).success;
    if (!withinLimit) {
      logResult(request, 429, startedAt);
      return c.json(
        { ok: false, code: "RATE_LIMITED", message: errorMessages.RATE_LIMITED },
        429,
        corsHeaders(c),
      );
    }

    if (!fromKnownClient(c, request.source)) {
      logResult(request, 403, startedAt, undefined, "client-key");
      return c.json(
        { ok: false, code: "CLIENT_NOT_ALLOWED", message: errorMessages.CLIENT_NOT_ALLOWED },
        403,
        corsHeaders(c),
      );
    }

    // Turnstile, for the web form only: the Remeet and Colorvia apps post here
    // too and have no browser to solve a challenge in. With no secret set,
    // nothing is verified and the form behaves exactly as it did before.
    if (c.env.TURNSTILE_SECRET_KEY && request.source === "main-web") {
      const verification = await (dependencies.verifyTurnstile ?? verifyTurnstileToken)(
        request.turnstileToken ?? "",
        c.env.TURNSTILE_SECRET_KEY,
        {
          remoteIp: c.req.header("CF-Connecting-IP"),
          idempotencyKey: request.requestId,
        },
      );
      if (!verification.ok) {
        // The sender is told to try again, not why they failed; the codes go
        // to the log, for whoever is looking at abuse.
        logResult(request, 403, startedAt, undefined, verification.errorCodes?.join(","));
        return c.json(
          { ok: false, code: "TURNSTILE_FAILED", message: errorMessages.TURNSTILE_FAILED },
          403,
          corsHeaders(c),
        );
      }
    }

    try {
      const email = createSupportEmail(request, {
        from: c.env.SUPPORT_FROM_EMAIL,
        to: c.env.SUPPORT_TO_EMAIL,
      });
      const result = dependencies.deliver
        ? await dependencies.deliver(email, c.env)
        : c.env.SUPPORT_MOCK_DELIVERY === "true"
          ? { id: "mock-email-id" }
          : await sendSupportEmail(email, c.env.RESEND_API_KEY);
      logResult(request, 200, startedAt, result.id);

      // A copy for Studio Admin, so the message can be answered from
      // admin.tmkch.io. After delivery and outside the response path: the mail
      // is what the sender was promised.
      background(
        c,
        mirrorSupportMessage(c.env, {
          requestId: request.requestId,
          appSlug: request.app,
          requesterEmail: request.email,
          requesterName: request.name,
          category: request.category,
          message: request.message,
          source: request.source,
        }),
      );

      return c.json({ ok: true, requestId: request.requestId }, 200, corsHeaders(c));
    } catch {
      logResult(request, 502, startedAt);
      return c.json(
        { ok: false, code: "DELIVERY_FAILED", message: errorMessages.DELIVERY_FAILED },
        502,
        corsHeaders(c),
      );
    }
  });
}
