/**
 * Content reports from Remeet.
 *
 * Every other Remeet endpoint is careful to never see a person's writing. This
 * one exists to see exactly one piece of it, once, because somebody asked for
 * it to be looked at — they read a sentence saying what would be sent and
 * pressed the button. Nothing arrives here any other way.
 *
 * That shapes the whole file:
 *
 * - the reported text goes into the operator's mail and **never into a log**;
 * - the photo goes to object storage under an unguessable key and expires;
 * - the database keeps ids and a status, not content;
 * - a retried request with the same `reportId` produces neither a second mail
 *   nor a second upload.
 */

export const reportReasons = [
  "sexual",
  "violence",
  "harassment",
  "illegal",
  "privacy",
  "spam",
  "other",
] as const;

/** Everything a person can write into a shared reunion. Two of these carry an
 * author and two do not — see `contentAuthorId`. */
export const reportContentTypes = [
  "waitingMemory",
  "anniversaryCard",
  "wish",
  "statusNote",
] as const;

export type ReportReason = (typeof reportReasons)[number];
export type ReportContentType = (typeof reportContentTypes)[number];

export interface ContentReport {
  reportId: string;
  reportedAt: string;
  reason: ReportReason;
  details?: string;
  appVersion: string;
  buildNumber: string;
  osVersion?: string;
  locale?: string;
  contentType: ReportContentType;
  contentId: string;
  reunionId: string;
  reporterAuthorId: string;
  /** Absent when the reported content records no author — a wish, or anything
   * written before the app stored one. The report is still accepted: this
   * field was never evidence of anything (it is a client's claim, and the
   * safety notes say so), so its absence costs context, not the report. */
  contentAuthorId?: string;
  contentTextSnapshot?: string;
}

export const DETAILS_LIMIT = 1000;
/** A generous ceiling for one waiting record or one card. Anything longer is
 * not a report, it is somebody testing the endpoint. */
export const SNAPSHOT_LIMIT = 8000;
/** Matches what the app can attach: one photo, already downscaled by Remeet
 * before it was ever stored. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/heic"] as const;
/** How long a reported photo stays readable. Long enough to look at it and
 * decide, short enough that this is not a photo archive. Must match the
 * retention written in the privacy policy. */
export const IMAGE_RETENTION_DAYS = 30;

export type ReportFailure =
  | "INVALID_REQUEST"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "IMAGE_TOO_LARGE"
  | "UNSUPPORTED_IMAGE_TYPE";

export type ReportResult = { ok: true; duplicate: boolean } | { ok: false; failure: ReportFailure };

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Validates the metadata part.
 *
 * Server-side and complete, rather than trusting the app: the app is the only
 * thing that *should* be posting here, but "should" is not a security property
 * and this route creates mail and object storage on request.
 */
export function parseReport(input: unknown): ContentReport | undefined {
  if (!input || typeof input !== "object") return undefined;
  const value = input as Record<string, unknown>;

  const required = (key: string): string | undefined => {
    const found = value[key];
    return typeof found === "string" && found.length > 0 ? found : undefined;
  };
  const uuid = (key: string): string | undefined => {
    const found = required(key);
    return found && UUID_PATTERN.test(found) ? found : undefined;
  };

  const reportId = uuid("reportId");
  const contentId = uuid("contentId");
  const reunionId = uuid("reunionId");
  const reporterAuthorId = uuid("reporterAuthorId");
  // Optional, but still validated when present: a malformed id is a broken
  // client, and accepting it would put a garbage string in the operator's mail.
  const contentAuthorId = value.contentAuthorId === undefined ? undefined : uuid("contentAuthorId");
  if (value.contentAuthorId !== undefined && !contentAuthorId) return undefined;
  const reportedAt = required("reportedAt");
  const appVersion = required("appVersion");
  const buildNumber = required("buildNumber");
  const reason = required("reason");
  const contentType = required("contentType");

  if (
    !reportId ||
    !contentId ||
    !reunionId ||
    !reporterAuthorId ||
    !reportedAt ||
    !appVersion ||
    !buildNumber ||
    !reason ||
    !contentType
  ) {
    return undefined;
  }
  if (!reportReasons.includes(reason as ReportReason)) return undefined;
  if (!reportContentTypes.includes(contentType as ReportContentType)) return undefined;
  if (Number.isNaN(Date.parse(reportedAt))) return undefined;

  const details = typeof value.details === "string" ? value.details : undefined;
  if (details && details.length > DETAILS_LIMIT) return undefined;
  const snapshot =
    typeof value.contentTextSnapshot === "string" ? value.contentTextSnapshot : undefined;
  if (snapshot && snapshot.length > SNAPSHOT_LIMIT) return undefined;

  return {
    reportId,
    reportedAt,
    reason: reason as ReportReason,
    details,
    appVersion,
    buildNumber,
    osVersion: typeof value.osVersion === "string" ? value.osVersion : undefined,
    locale: typeof value.locale === "string" ? value.locale : undefined,
    contentType: contentType as ReportContentType,
    contentId,
    reunionId,
    reporterAuthorId,
    contentAuthorId,
    contentTextSnapshot: snapshot,
  };
}

/**
 * Whether an uploaded part is a photo this route will accept.
 *
 * The declared `Content-Type` is checked *and* the first bytes are, because a
 * header is whatever the sender typed. A file that claims to be a JPEG and is
 * not gets rejected rather than stored and mailed as one.
 */
export function validateImage(
  bytes: Uint8Array,
  declaredType: string,
): { ok: true; contentType: string } | { ok: false; failure: ReportFailure } {
  if (bytes.byteLength === 0) return { ok: false, failure: "INVALID_REQUEST" };
  if (bytes.byteLength > MAX_IMAGE_BYTES) return { ok: false, failure: "IMAGE_TOO_LARGE" };

  const sniffed = sniffImageType(bytes);
  if (!sniffed) return { ok: false, failure: "UNSUPPORTED_IMAGE_TYPE" };
  const declared = declaredType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (declared && declared !== sniffed && !ALLOWED_IMAGE_TYPES.includes(declared as never)) {
    return { ok: false, failure: "UNSUPPORTED_IMAGE_TYPE" };
  }
  return { ok: true, contentType: sniffed };
}

/** Magic numbers for the three formats a Remeet photo can be. */
function sniffImageType(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // HEIC is an ISO-BMFF box: `....ftypheic` / `heix` / `mif1`.
  if (bytes.length >= 12) {
    const brand = String.fromCharCode(...bytes.slice(4, 12));
    if (brand.startsWith("ftyp") && /heic|heix|hevc|mif1|msf1/.test(brand.slice(4))) {
      return "image/heic";
    }
  }
  return undefined;
}

/**
 * Where a reported photo lives while somebody decides what to do about it.
 *
 * The key is unguessable on its own, so knowing the report id is not enough to
 * find the object — the bucket is private and read through a signed URL or the
 * operator's own console, never a public link.
 */
export function imageObjectKey(reportId: string, random: string): string {
  return `reports/remeet/${reportId}/${random}`;
}
