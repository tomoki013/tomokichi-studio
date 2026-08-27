const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5_000;

/**
 * Cloudflare Turnstile, in front of the web support form.
 *
 * Two rules shape how this is used, both in `routes/support.ts`:
 *
 * 1. It applies to `main-web` only. The Remeet and Colorvia apps post to this
 *    same endpoint and have no browser to solve a challenge in — requiring a
 *    token of them would silently break support from inside the apps.
 * 2. With no secret configured, verification is skipped entirely. The form
 *    keeps working exactly as it did before Turnstile existed, so setting this
 *    up is a switch that can be thrown once and never has a half-on state that
 *    rejects real people.
 */
export interface TurnstileVerification {
  ok: boolean;
  /** Cloudflare's error codes, for the log line. Never shown to the sender. */
  errorCodes?: string[];
}

interface SiteverifyResponse {
  success?: unknown;
  "error-codes"?: unknown;
}

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  options: { remoteIp?: string; idempotencyKey?: string; fetchImpl?: typeof fetch } = {},
): Promise<TurnstileVerification> {
  if (!token) return { ok: false, errorCodes: ["missing-input-response"] };

  const body = new URLSearchParams({ secret, response: token });
  if (options.remoteIp) body.set("remoteip", options.remoteIp);
  if (options.idempotencyKey) body.set("idempotency_key", options.idempotencyKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await (options.fetchImpl ?? fetch)(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
    });
    if (!response.ok) return { ok: false, errorCodes: [`http-${response.status}`] };

    const result = (await response.json()) as SiteverifyResponse;
    const codes = Array.isArray(result["error-codes"])
      ? result["error-codes"].filter((code): code is string => typeof code === "string")
      : undefined;
    return result.success === true ? { ok: true } : { ok: false, errorCodes: codes };
  } catch (error) {
    // Cloudflare being unreachable is not the sender's fault, but it is also
    // not proof they are human. The caller decides; this only reports.
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return { ok: false, errorCodes: [aborted ? "timeout" : "unreachable"] };
  } finally {
    clearTimeout(timeout);
  }
}
