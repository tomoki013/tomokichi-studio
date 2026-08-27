import { supportAppBrands } from "@tomokichi/app-site/apps";

export const supportSources = ["remeet-ios", "colorvia-ios", "main-web"] as const;
export const supportApps = [...supportAppBrands.map((app) => app.slug), "other"] as const;
export const supportCategories = ["question", "bug", "feature", "other"] as const;

export type SupportSource = (typeof supportSources)[number];
export type SupportApp = (typeof supportApps)[number];
export type SupportCategory = (typeof supportCategories)[number];

export interface SupportRequest {
  requestId: string;
  clientId: string;
  source: SupportSource;
  app: SupportApp;
  category: SupportCategory;
  name?: string;
  email?: string;
  message: string;
  appVersion?: string;
  buildNumber?: string;
  osVersion?: string;
  locale?: string;
  submittedAt: string;
  website: string;
  /** Turnstile token. Sent by the web form only; see `support/turnstile.ts`. */
  turnstileToken?: string;
}

export type ValidationFields = Record<string, string>;

export interface SupportEmail {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
}

export interface SupportBindings {
  RESEND_API_KEY: string;
  SUPPORT_TO_EMAIL: string;
  SUPPORT_FROM_EMAIL: string;
  MAIN_SITE_ORIGIN: string;
  MAIN_SITE_WORKERS_ORIGIN: string;
  SUPPORT_MOCK_DELIVERY?: string;
  /**
   * Turnstile's secret key, set with `wrangler secret put`. Absent means the
   * web form is not behind Turnstile and nothing is verified.
   */
  TURNSTILE_SECRET_KEY?: string;
  /**
   * Shared with the iOS apps, sent as `X-Support-Client`. Unset means
   * unenforced; see `fromKnownClient` in `routes/support.ts`.
   */
  SUPPORT_CLIENT_KEY?: string;
  SUPPORT_RATE_LIMITER: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}

export interface EmailDeliveryResult {
  id: string;
}
