import { describe, expect, it } from "vitest";

import {
  DETAILS_LIMIT,
  imageObjectKey,
  MAX_IMAGE_BYTES,
  parseReport,
  reportContentTypes,
  SNAPSHOT_LIMIT,
  validateImage,
} from "./report-service";

const valid = {
  reportId: "6f9619ff-8b86-d011-b42d-00c04fc964ff",
  reportedAt: "2026-08-22T04:00:00Z",
  reason: "harassment",
  details: "こわい",
  appVersion: "1.0.0",
  buildNumber: "29",
  osVersion: "iOS 26.5",
  locale: "ja_JP",
  contentType: "waitingMemory",
  contentId: "6f9619ff-8b86-d011-b42d-00c04fc964f1",
  reunionId: "6f9619ff-8b86-d011-b42d-00c04fc964f2",
  reporterAuthorId: "6f9619ff-8b86-d011-b42d-00c04fc964f3",
  contentAuthorId: "6f9619ff-8b86-d011-b42d-00c04fc964f4",
  contentTextSnapshot: "こっち雨やばい",
};

describe("parseReport", () => {
  it("accepts a well-formed report", () => {
    expect(parseReport(valid)?.reason).toBe("harassment");
  });

  it("rejects anything that is not an object", () => {
    for (const input of [undefined, null, "report", 42, []]) {
      expect(parseReport(input)).toBeUndefined();
    }
  });

  it.each([
    "reportId",
    "reportedAt",
    "reason",
    "contentType",
    "contentId",
    "reunionId",
    "reporterAuthorId",
    "appVersion",
    "buildNumber",
  ])("rejects a report missing %s", (field) => {
    const input: Record<string, unknown> = { ...valid };
    delete input[field];
    expect(parseReport(input)).toBeUndefined();
  });

  it("rejects an unknown reason", () => {
    expect(parseReport({ ...valid, reason: "because" })).toBeUndefined();
  });

  it("accepts every kind of post and nothing else", () => {
    expect(reportContentTypes).toEqual(["waitingMemory", "anniversaryCard", "wish", "statusNote"]);
    for (const contentType of reportContentTypes) {
      expect(parseReport({ ...valid, contentType })).toBeDefined();
    }
    // Reactions are not writing; there is nothing for a person to read.
    expect(parseReport({ ...valid, contentType: "reaction" })).toBeUndefined();
  });

  /** Wishes record no author in Remeet, so the app sends the field absent
   * rather than filled with a placeholder. The report is still a report. */
  it("accepts a report whose content has no known author", () => {
    const { contentAuthorId, ...anonymous } = valid;
    const parsed = parseReport({ ...anonymous, contentType: "wish" });

    expect(parsed).toBeDefined();
    expect(parsed?.contentAuthorId).toBeUndefined();
  });

  /** Absent is fine; malformed is a broken client, and must not end up in the
   * operator's mail looking like an id. */
  it("still rejects a malformed author when one is given", () => {
    expect(parseReport({ ...valid, contentAuthorId: "nobody" })).toBeUndefined();
    expect(parseReport({ ...valid, contentAuthorId: "" })).toBeUndefined();
  });

  it("rejects ids that are not uuids", () => {
    expect(parseReport({ ...valid, contentId: "../../etc/passwd" })).toBeUndefined();
  });

  it("rejects an unparseable timestamp", () => {
    expect(parseReport({ ...valid, reportedAt: "yesterday" })).toBeUndefined();
  });

  it("rejects oversized details and snapshots", () => {
    expect(parseReport({ ...valid, details: "あ".repeat(DETAILS_LIMIT + 1) })).toBeUndefined();
    expect(
      parseReport({ ...valid, contentTextSnapshot: "あ".repeat(SNAPSHOT_LIMIT + 1) }),
    ).toBeUndefined();
  });

  it("keeps the optional fields optional", () => {
    const report = parseReport({ ...valid, details: undefined, contentTextSnapshot: undefined });
    expect(report?.details).toBeUndefined();
    expect(report?.contentTextSnapshot).toBeUndefined();
  });
});

describe("validateImage", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  it("accepts a jpeg and a png", () => {
    expect(validateImage(jpeg, "image/jpeg")).toEqual({ ok: true, contentType: "image/jpeg" });
    expect(validateImage(png, "image/png")).toEqual({ ok: true, contentType: "image/png" });
  });

  /** The header is whatever the sender typed, so the bytes decide. */
  it("rejects a file that only claims to be an image", () => {
    const script = new TextEncoder().encode("<?php echo 1; ?>");
    expect(validateImage(script, "image/jpeg")).toEqual({
      ok: false,
      failure: "UNSUPPORTED_IMAGE_TYPE",
    });
  });

  it("rejects an empty part", () => {
    expect(validateImage(new Uint8Array(), "image/jpeg")).toEqual({
      ok: false,
      failure: "INVALID_REQUEST",
    });
  });

  it("rejects something far too large to be one photo", () => {
    const huge = new Uint8Array(MAX_IMAGE_BYTES + 1);
    huge.set(jpeg);
    expect(validateImage(huge, "image/jpeg")).toEqual({ ok: false, failure: "IMAGE_TOO_LARGE" });
  });
});

describe("imageObjectKey", () => {
  /** Knowing the report id must not be enough to find the object. */
  it("puts a random component after the report id", () => {
    const key = imageObjectKey(valid.reportId, "abc123");
    expect(key).toBe(`reports/remeet/${valid.reportId}/abc123`);
    expect(key).not.toContain("..");
  });
});
