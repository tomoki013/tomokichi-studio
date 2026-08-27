import {
  type SupportRequest,
  supportApps,
  supportCategories,
  supportSources,
  type ValidationFields,
} from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationResult =
  | { ok: true; value: SupportRequest }
  | { ok: false; fields: ValidationFields };

function trimmed(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function optionalString(
  input: Record<string, unknown>,
  key: string,
  maxLength: number,
  fields: ValidationFields,
): string | undefined {
  const value = trimmed(input[key]);
  if (input[key] !== undefined && value === undefined) {
    fields[key] = "INVALID_TYPE";
  } else if (value !== undefined && value.length > maxLength) {
    fields[key] = "TOO_LONG";
  }
  return value || undefined;
}

export function validateSupportRequest(input: unknown): ValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, fields: { request: "INVALID_TYPE" } };
  }

  const raw = input as Record<string, unknown>;
  const fields: ValidationFields = {};
  const requestId = trimmed(raw.requestId);
  const clientId = trimmed(raw.clientId);
  const source = trimmed(raw.source);
  const app = trimmed(raw.app);
  const category = trimmed(raw.category);
  // The native apps always send the `email` key, empty string when no reply is
  // requested — normalize that (and an entirely absent key, which the web form
  // uses) to the same "no email" shape below.
  const email = trimmed(raw.email)?.toLowerCase() || undefined;
  const message = trimmed(raw.message);
  const submittedAt = trimmed(raw.submittedAt);
  const website = trimmed(raw.website) ?? "";

  if (!requestId) fields.requestId = "REQUIRED";
  else if (!UUID_PATTERN.test(requestId)) fields.requestId = "INVALID_UUID";
  if (!clientId) fields.clientId = "REQUIRED";
  else if (!UUID_PATTERN.test(clientId)) fields.clientId = "INVALID_UUID";
  if (!source) fields.source = "REQUIRED";
  else if (!supportSources.includes(source as SupportRequest["source"]))
    fields.source = "INVALID_VALUE";
  if (!app) fields.app = "REQUIRED";
  else if (!supportApps.includes(app as SupportRequest["app"])) fields.app = "INVALID_VALUE";
  if (!category) fields.category = "REQUIRED";
  else if (!supportCategories.includes(category as SupportRequest["category"]))
    fields.category = "INVALID_VALUE";
  if (email) {
    if (email.length > 254) fields.email = "TOO_LONG";
    else if (!EMAIL_PATTERN.test(email)) fields.email = "INVALID_EMAIL";
  }
  if (!message) fields.message = "REQUIRED";
  else if (message.length < 10) fields.message = "TOO_SHORT";
  else if (message.length > 5000) fields.message = "TOO_LONG";
  if (!submittedAt) fields.submittedAt = "REQUIRED";
  else if (!Number.isFinite(Date.parse(submittedAt))) fields.submittedAt = "INVALID_DATETIME";
  if (raw.website !== undefined && typeof raw.website !== "string") fields.website = "INVALID_TYPE";

  const name = optionalString(raw, "name", 100, fields);
  const appVersion = optionalString(raw, "appVersion", 30, fields);
  const buildNumber = optionalString(raw, "buildNumber", 30, fields);
  const osVersion = optionalString(raw, "osVersion", 100, fields);
  const locale = optionalString(raw, "locale", 30, fields);
  // Turnstile tokens are opaque and can be long; the cap only stops a body
  // being padded out through this field.
  const turnstileToken = optionalString(raw, "turnstileToken", 2048, fields);

  if (Object.keys(fields).length > 0) return { ok: false, fields };

  return {
    ok: true,
    value: {
      requestId: requestId as string,
      clientId: clientId as string,
      source: source as SupportRequest["source"],
      app: app as SupportRequest["app"],
      category: category as SupportRequest["category"],
      name,
      email,
      message: message as string,
      appVersion,
      buildNumber,
      osVersion,
      locale,
      submittedAt: submittedAt as string,
      website,
      turnstileToken,
    },
  };
}
