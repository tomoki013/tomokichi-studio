import {
  SUPPORT_API_URL as configuredApiUrl,
  SUPPORT_API_PUBLIC_URL as configuredPublicApiUrl,
} from "@tomokichi/app-site/urls";
import type { Locale } from "../data/apps";
import { supportAppOptions, supportCategoryOptions } from "./support-copy";

const parsedApiUrl = new URL(configuredApiUrl);
if (parsedApiUrl.protocol !== "https:" || parsedApiUrl.pathname !== "/api/v1/support") {
  throw new Error("Support API URL is invalid");
}
export const SUPPORT_API_URL = parsedApiUrl.toString();
export const SUPPORT_API_PUBLIC_URL = new URL(configuredPublicApiUrl).toString();
export const SUPPORT_CLIENT_ID_KEY = "tomokichi-support-client-id";
export const SUPPORT_TIMEOUT_MS = 15_000;

export type SupportApp = (typeof supportAppOptions)[number]["value"];
export type SupportCategory = (typeof supportCategoryOptions)[number]["value"];

export interface SupportFormValues {
  app: string;
  category: string;
  name: string;
  email: string;
  /** Whether the user asked for a reply — gates whether email is required/sent. */
  replyRequested: boolean;
  message: string;
  website: string;
}

export interface SupportFieldErrors {
  name?: "TOO_LONG";
  email?: "REQUIRED" | "INVALID_EMAIL" | "TOO_LONG";
  message?: "REQUIRED" | "TOO_SHORT" | "TOO_LONG";
}

export interface SupportRequestBody {
  requestId: string;
  clientId: string;
  source: "main-web";
  app: SupportApp;
  category: SupportCategory;
  name?: string;
  email?: string;
  message: string;
  locale: "ja-JP" | "en";
  submittedAt: string;
  website: string;
  /** Turnstile token, when the form is behind Turnstile. */
  turnstileToken?: string;
}

export type FormStatus =
  | "idle"
  | "editing"
  | "submitting"
  | "success"
  | "validation_error"
  | "rate_limited"
  | "delivery_failed"
  | "server_error"
  | "network_error"
  | "verification_failed"
  | "timeout";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const apps = new Set<string>(supportAppOptions.map(({ value }) => value));
const categories = new Set<string>(supportCategoryOptions.map(({ value }) => value));

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export function isValidEmail(value: string): boolean {
  const normalized = value.trim();
  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized);
}

/**
 * Categories that are already asking a question — a reply is the point, so
 * there is no "would you like a reply?" toggle for them; email is required
 * outright. Only "question" qualifies here. Mirrors
 * `SupportCategory.impliesReply` in the Remeet app (the reference
 * implementation — see `docs/support-form-porting.md` in that repo).
 */
export function categoryImpliesReply(category: string): boolean {
  return category === "question";
}

/** Whether the toggle should be offered at all — hidden for reply-implying categories. */
export function showsReplyToggle(category: string): boolean {
  return !categoryImpliesReply(category);
}

/** Whether email is required, given the category and the toggle state. */
export function requiresEmail(
  values: Pick<SupportFormValues, "category" | "replyRequested">,
): boolean {
  return categoryImpliesReply(values.category) || values.replyRequested;
}

export function validateSupportForm(values: SupportFormValues): SupportFieldErrors {
  const errors: SupportFieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (name.length > 100) errors.name = "TOO_LONG";
  if (requiresEmail(values)) {
    if (!email) errors.email = "REQUIRED";
    else if (email.length > 254) errors.email = "TOO_LONG";
    else if (!EMAIL_PATTERN.test(email)) errors.email = "INVALID_EMAIL";
  }
  if (!message) errors.message = "REQUIRED";
  else if (message.length < 10) errors.message = "TOO_SHORT";
  else if (message.length > 5000) errors.message = "TOO_LONG";

  return errors;
}

export function initialSelections(search: URLSearchParams): {
  app: SupportApp;
  category: SupportCategory;
} {
  const app = search.get("app");
  const category = search.get("category");
  return {
    app: apps.has(app ?? "") ? (app as SupportApp) : "remeet",
    category: categories.has(category ?? "") ? (category as SupportCategory) : "question",
  };
}

export function buildSupportRequest(
  values: SupportFormValues,
  options: {
    requestId: string;
    clientId: string;
    locale: Locale;
    now?: Date;
    /** Omitted when the form is not behind Turnstile. */
    turnstileToken?: string;
  },
): SupportRequestBody {
  const app = apps.has(values.app) ? (values.app as SupportApp) : "remeet";
  const category = categories.has(values.category)
    ? (values.category as SupportCategory)
    : "question";
  const name = values.name.trim();

  return {
    requestId: options.requestId,
    clientId: options.clientId,
    source: "main-web",
    app,
    category,
    ...(name ? { name } : {}),
    ...(requiresEmail(values) && values.email.trim()
      ? { email: values.email.trim().toLowerCase() }
      : {}),
    message: values.message.trim(),
    locale: options.locale === "ja" ? "ja-JP" : "en",
    submittedAt: (options.now ?? new Date()).toISOString(),
    website: values.website,
    ...(options.turnstileToken ? { turnstileToken: options.turnstileToken } : {}),
  };
}

export function getOrCreateClientId(
  storage: Pick<Storage, "getItem" | "setItem"> | undefined,
  createUuid: () => string = () => crypto.randomUUID(),
): string {
  try {
    const existing = storage?.getItem(SUPPORT_CLIENT_ID_KEY);
    if (isUuid(existing)) return existing;
    const generated = createUuid();
    storage?.setItem(SUPPORT_CLIENT_ID_KEY, generated);
    return generated;
  } catch {
    return createUuid();
  }
}

export function statusForApiResponse(
  status: number,
  responseRequestId: unknown,
  expectedRequestId: string,
  /** The API's error code, which tells two different 403s apart. */
  code?: unknown,
): FormStatus {
  if (status === 200) {
    return responseRequestId === expectedRequestId ? "success" : "server_error";
  }
  if (status === 400) return "validation_error";
  // The other 403 is an origin the API does not allow, which no visitor to
  // the real site can produce and which reloading would not fix.
  if (status === 403) return code === "TURNSTILE_FAILED" ? "verification_failed" : "server_error";
  if (status === 429) return "rate_limited";
  if (status === 502) return "delivery_failed";
  return status >= 500 ? "server_error" : "server_error";
}

export class SupportRequestCycle {
  status: FormStatus = "idle";
  requestId: string;

  constructor(private readonly createUuid: () => string = () => crypto.randomUUID()) {
    this.requestId = createUuid();
  }

  begin(): boolean {
    if (this.status === "submitting" || this.status === "success") return false;
    this.status = "submitting";
    return true;
  }

  complete(status: FormStatus): void {
    this.status = status;
  }

  markEditing(): void {
    if (this.status !== "submitting" && this.status !== "success") this.status = "editing";
  }

  startNew(): void {
    this.requestId = this.createUuid();
    this.status = "idle";
  }
}
