import type { AuditEntry } from "@inquiry-platform/core";
import { Link } from "react-router";
import { auditActionLabel, auditActorLabel, auditTargetPath } from "../lib/labels";
import { Timestamp } from "./primitives";

const settingLabels: Record<string, string> = {
  name: "名前",
  slug: "識別名",
  is_active: "有効",
  service_id: "所属プロジェクト",
  type: "種別",
  ack: "受付期限（分）",
  response: "応答期限（分）",
  resolution: "解決期限（分）",
};
function settingSnapshot(value: unknown): string {
  if (value === null) return "新規登録";
  if (!value || typeof value !== "object" || Array.isArray(value)) return "記録なし";
  return Object.entries(value)
    .filter(([key]) => key !== "id")
    .map(
      ([key, value]) =>
        `${settingLabels[key] ?? key}: ${key === "is_active" ? (value ? "有効" : "無効") : value === null ? "なし" : String(value)}`,
    )
    .join(" / ");
}

/**
 * What has happened, in the order it happened.
 *
 * Shared by the Dashboard and one app's Activity tab because they were drifting
 * apart while showing the same rows out of the same table.
 *
 * Each row says the action in words and links to the thing it happened to. It
 * used to render the raw `action` in a monospace font, which is accurate — that
 * really is what is in the audit table — and useless: "somebody did
 * `support.reply_sent` to some id" is not something an operator can act on
 * without going and looking for the thread by hand.
 */
export function ActivityList({ entries }: { entries: AuditEntry[] }) {
  return (
    <ul className="divide-y divide-line-soft">
      {entries.map((entry) => {
        const path = auditTargetPath(entry);
        const label = auditActionLabel(entry.action);
        return (
          <li key={entry.id} className="flex items-baseline justify-between gap-4 py-2 text-sm">
            <span className="min-w-0">
              {path ? (
                <Link to={path} className="text-accent underline-offset-2 hover:underline">
                  {label}
                </Link>
              ) : (
                <span className="text-ink">{label}</span>
              )}
              {entry.action === "ticket.settings_updated" && "to" in entry.metadata && (
                <span className="block text-xs text-ink-soft">
                  変更前: {settingSnapshot(entry.metadata.from)} → 変更後:{" "}
                  {settingSnapshot(entry.metadata.to)}
                </span>
              )}
              <span className="ml-2 text-xs text-ink-faint">
                {auditActorLabel(entry.actorType)}
              </span>
            </span>
            <span className="shrink-0 text-xs text-ink-faint">
              <Timestamp value={entry.createdAt} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}
