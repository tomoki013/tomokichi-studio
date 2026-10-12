import type { OperatorDeliveryPage } from "@inquiry-platform/sdk";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { useSession } from "../lib/session";

const kinds = {
  notification_email: "新着メール通知",
  notification_push: "新着Push通知",
  inbound_email: "受信メールの取り込み",
  failure_alert: "障害通知",
};
const reasons: Record<string, string> = {
  NOTIFICATION_FAILED: "通知を送信できませんでした",
  MAIL_UNCONFIGURED: "メール送信設定を確認してください",
  MAIL_INGEST_FAILED: "メールを取り込めませんでした",
  MAIL_PARSE_FAILED: "メール形式を解析できませんでした",
  MAIL_SENDER_MISSING: "送信者を読み取れませんでした",
  RAW_MAIL_MISSING: "メール原本が見つかりません",
  MAIL_EXPIRED: "原本の保持期限を過ぎました",
  LEASE_EXPIRED: "処理が時間内に完了しませんでした",
  ALERT_DELIVERY_FAILED: "障害通知を送信できませんでした",
};
const states = { queued: "再試行待ち", running: "処理中", failed: "対応が必要", completed: "完了" };
export function Deliveries() {
  const client = useQueryClient(),
    session = useSession();
  const [message, setMessage] = useState("");
  const query = useQuery({
    queryKey: ["deliveries"],
    queryFn: () => api.get<OperatorDeliveryPage>("/api/deliveries"),
    refetchInterval: 30_000,
  });
  const retry = useMutation({
    mutationFn: (id: string) => api.post(`/api/deliveries/${encodeURIComponent(id)}/retry`, {}),
    onSuccess: () => {
      setMessage("再処理を予約しました。");
      void client.invalidateQueries({ queryKey: ["deliveries"] });
    },
  });
  const canOperate = session.data?.role === "operator" || session.data?.role === "admin";
  return (
    <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
      <h1 className="text-xl font-medium">配送・取り込みの失敗</h1>
      <p className="text-sm text-ink-soft">
        失敗した処理は自動で最大8回試します。受信メールの原本は非公開で30日間保持し、取り込み完了後に削除します。
      </p>
      <button type="button" onClick={() => void query.refetch()}>
        再読み込み
      </button>
      {query.error && <p role="alert">{query.error.message}</p>}
      {retry.error && <p role="alert">{retry.error.message}</p>}
      {message && <p role="status">{message}</p>}
      {query.isPending ? (
        <p>読み込んでいます…</p>
      ) : query.data?.items.length === 0 ? (
        <p>失敗・待機中の処理はありません。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th>プロジェクト</th>
                <th>処理</th>
                <th>状態</th>
                <th>試行回数</th>
                <th>次の試行</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.items.map((job) => (
                <tr key={job.id}>
                  <td>{job.projectName ?? "—"}</td>
                  <td className="py-3">
                    {kinds[job.kind]}
                    <p className="text-xs text-ink-faint">
                      {new Date(job.createdAt).toLocaleString("ja-JP")}
                    </p>
                  </td>
                  <td>
                    {states[job.state]}
                    <p className="text-xs">
                      {job.lastError && (reasons[job.lastError] ?? "処理中にエラーが発生しました")}
                    </p>
                  </td>
                  <td>{job.attempts}/8</td>
                  <td>
                    {job.state === "queued"
                      ? new Date(job.nextAttemptAt).toLocaleString("ja-JP")
                      : "—"}
                  </td>
                  <td>
                    {canOperate && (
                      <button
                        type="button"
                        disabled={
                          retry.isPending ||
                          job.lastError === "MAIL_EXPIRED" ||
                          !(job.state === "failed" || (job.state === "queued" && job.lastError))
                        }
                        onClick={() => {
                          setMessage("");
                          retry.mutate(job.id);
                        }}
                      >
                        再処理する
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {query.data && query.data.total > 100 && (
            <p>先頭100件を表示しています（全{query.data.total}件）。</p>
          )}
        </div>
      )}
    </div>
  );
}
