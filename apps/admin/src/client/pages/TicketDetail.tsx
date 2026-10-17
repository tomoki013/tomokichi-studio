import {
  type TicketDetail as Detail,
  type ReportDetail,
  type SupportThreadDetail,
  slaClock,
  type Ticket,
  type TicketEvent,
  type TicketMasters,
  ticketLevels,
  ticketPriorities,
  ticketRelationTypes,
  ticketResolutions,
  ticketStatusLabels,
  ticketTransitions,
  ticketTypeLabels,
  ticketTypes,
} from "@inquiry-platform/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { Dialog } from "../components/Dialog";
import { Button, DataState, Field, inputClass, Timestamp } from "../components/primitives";
import { ReplyComposer } from "../components/ReplyComposer";
import { ReportAuthorHistory } from "../components/ReportAuthorHistory";
import { api } from "../lib/api";
import { ContentActions } from "./ReportDetail";
import { TicketBadge, useTicketMasters } from "./Tickets";

const eventLabels: Record<string, string> = {
  TICKET_CREATED: "受付",
  STATUS_CHANGED: "状態を変更",
  TYPE_CHANGED: "種別を変更",
  PRIORITY_CHANGED: "優先度を変更",
  ACKNOWLEDGED: "ACK・確認済み",
  ASSIGNMENT_CHANGED: "担当を変更",
  MESSAGE_RECEIVED: "受信",
  MESSAGE_SENT: "返信を送信",
  INTERNAL_NOTE_ADDED: "内部メモ",
  SERVICE_CHANGED: "対象サービスを変更",
  CATEGORY_CHANGED: "分類を変更",
  RESOLVED: "解決",
  CLOSED: "クローズ",
  REOPENED: "再開",
  RELATION_ADDED: "関連を追加",
  MERGED: "統合",
  NEXT_ACTION_CHANGED: "次の対応を変更",
  REPORT_ACTION: "通報への対応",
  LEGACY_EVENT: "移行前の履歴",
  DETAILS_CHANGED: "情報を更新",
};
function EventBody({ event }: { event: TicketEvent }) {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(event.metadata);
  } catch {}
  const status = (v: unknown) =>
    typeof v === "string"
      ? (ticketStatusLabels[v as keyof typeof ticketStatusLabels] ?? v)
      : String(v ?? "—");
  return (
    <div className="text-xs text-ink-soft space-y-1">
      {Boolean(data.previousStatus || data.newStatus) && (
        <p>
          {status(data.previousStatus)} → {status(data.newStatus)}
        </p>
      )}
      {Boolean(data.field) && (
        <p>
          {String(data.field)}: {status(data.from)} → {status(data.to)}
        </p>
      )}
      {Boolean(data.resolution) && (
        <p>
          処理結果:{" "}
          {typeof data.resolution === "object"
            ? `${status((data.resolution as Record<string, unknown>).from)} → ${status((data.resolution as Record<string, unknown>).to)}`
            : String(data.resolution)}
        </p>
      )}
      {Boolean(data.reason) && <p>理由: {String(data.reason)}</p>}
      {Boolean(data.note) && <p className="whitespace-pre-wrap">{String(data.note)}</p>}
      {Boolean(data.legacyType) && (
        <p>
          {String(data.legacyType)} {status(data.from)} → {status(data.to)}
        </p>
      )}
      {Boolean(data.action) && <p>{String(data.action)}</p>}
      {data.data !== undefined && (
        <details>
          <summary>変更内容</summary>
          <pre className="whitespace-pre-wrap break-words">
            {JSON.stringify(data.data, null, 2)}
          </pre>
        </details>
      )}
      {Boolean(data.source) && (
        <Link className="text-accent" to={`/tickets/${data.source}`}>
          統合元の履歴を開く →
        </Link>
      )}
      {Boolean(data.target) && (
        <Link className="text-accent" to={`/tickets/${data.target}`}>
          関連Ticketを開く →
        </Link>
      )}
      {event.event_type === "PRIORITY_CHANGED" && (
        <p>
          {status(data.from)} → {status(data.to)} / Impact {String(data.impact)} / Urgency{" "}
          {String(data.urgency)}
        </p>
      )}
    </div>
  );
}
type TimelineItem = Detail["timeline"][number];
type TicketStatus = Ticket["status"];

/**
 * The shortest way through `ticketTransitions` to `to`, never through a state
 * `allowed` refuses. NEW cannot jump straight to 返信待ち; somebody clicking
 * 返信待ち should not have to know that.
 */
export function statusPath(
  from: TicketStatus,
  to: TicketStatus,
  allowed: (s: TicketStatus) => boolean = () => true,
): TicketStatus[] | null {
  if (from === to) return [];
  const previous = new Map<TicketStatus, TicketStatus>();
  const queue: TicketStatus[] = [from];
  while (queue.length) {
    const at = queue.shift() as TicketStatus;
    for (const next of ticketTransitions[at]) {
      if (next === from || previous.has(next) || !allowed(next)) continue;
      previous.set(next, at);
      if (next === to) {
        const path: TicketStatus[] = [to];
        let step = at;
        while (step !== from) {
          path.unshift(step);
          step = previous.get(step) as TicketStatus;
        }
        return path;
      }
      queue.push(next);
    }
  }
  return null;
}

/** The handful of states an operator actually moves a ticket between. */
const quickStatuses: Array<{ status: TicketStatus; label: string; also?: TicketStatus[] }> = [
  { status: "ACKNOWLEDGED", label: "確認済み", also: ["TRIAGE"] },
  { status: "IN_PROGRESS", label: "対応中", also: ["WAITING_INTERNAL"] },
  { status: "WAITING_CUSTOMER", label: "返信待ち" },
  { status: "RESOLVED", label: "解決", also: ["CLOSED"] },
];

function useMoveStatus(ticket: Ticket | undefined, onChanged: () => void) {
  return useMutation({
    mutationFn: async (to: TicketStatus) => {
      if (!ticket) return;
      // Reports are finished by the moderation decision, never from here.
      const allowed = (s: TicketStatus) => !ticket.report_id || !["RESOLVED", "CLOSED"].includes(s);
      // ACK has its own endpoint, which also records who acknowledged it.
      if (to === "ACKNOWLEDGED" && ["NEW", "TRIAGE"].includes(ticket.status)) {
        await api.post(`/api/tickets/${ticket.id}/ack`, {});
        return;
      }
      const path = statusPath(ticket.status, to, allowed);
      if (!path) throw new Error("この状態には変更できません。");
      let revision = ticket.revision;
      for (const status of path) {
        const changed = await api.patch<Detail>(`/api/tickets/${ticket.id}`, {
          id: ticket.id,
          revision,
          status,
          ...(status === "RESOLVED" ? { resolution: ticket.resolution ?? "RESOLVED" } : {}),
        });
        revision = changed.ticket.revision;
      }
    },
    onSettled: onChanged,
  });
}

function StatusBar({ ticket: t, onChanged }: { ticket: Ticket; onChanged: () => void }) {
  const move = useMoveStatus(t, onChanged);
  const options = quickStatuses.filter(
    (o) => !t.report_id || !["RESOLVED", "CLOSED"].includes(o.status),
  );
  const current = (o: (typeof quickStatuses)[number]) =>
    o.status === t.status || Boolean(o.also?.includes(t.status));
  return (
    <>
      <fieldset className="ops-status-bar">
        <legend className="sr-only">状態を変更</legend>
        <span aria-hidden="true">状態</span>
        {t.status === "NEW" && (
          <button type="button" aria-pressed="true" disabled>
            未確認
          </button>
        )}
        {options.map((o) => (
          <button
            type="button"
            key={o.status}
            aria-pressed={current(o)}
            disabled={move.isPending || current(o) || Boolean(t.merged_into)}
            onClick={() => move.mutate(o.status)}
          >
            {o.label}
          </button>
        ))}
        {t.status === "CLOSED" && (
          <button type="button" aria-pressed="true" disabled>
            クローズ
          </button>
        )}
      </fieldset>
      {move.error && (
        <p role="alert" className="text-danger text-sm -mt-4 mb-4">
          {move.error.message}
        </p>
      )}
    </>
  );
}

function MessageBubble({ item }: { item: Extract<TimelineItem, { kind: "message" }> }) {
  const m = item.value;
  const kind =
    m.visibility === "INTERNAL"
      ? "conv-note"
      : m.direction === "INBOUND"
        ? "conv-in"
        : m.is_automatic
          ? "conv-auto"
          : "conv-out";
  const label =
    m.visibility === "INTERNAL"
      ? "内部メモ（送信なし）"
      : m.direction === "INBOUND"
        ? (m.sender ?? "ユーザー")
        : m.is_automatic
          ? "自動受付メール"
          : "運営から送信";
  return (
    <article className={`conv-msg ${kind}`}>
      <header>
        <strong>{label}</strong>
        <Timestamp value={m.created_at} />
        {m.direction !== "INBOUND" && m.recipient && <span>→ {m.recipient}</span>}
      </header>
      <pre>{m.body}</pre>
      {m.legacy_message_id && m.attachments?.length ? (
        <p className="mt-2">
          {m.attachments.map((a) => (
            <a
              className="text-accent text-xs mr-3"
              key={a.id}
              href={`/api/support/messages/${m.legacy_message_id}/attachments/${a.id}`}
            >
              {a.originalFilename ?? "添付ファイル"}
            </a>
          ))}
        </p>
      ) : null}
    </article>
  );
}

export function TicketDetail() {
  const { id = "" } = useParams(),
    client = useQueryClient(),
    masters = useTicketMasters();
  const [offset, setOffset] = useState(0);
  const [showEvents, setShowEvents] = useState(false);
  const [waitAfterReply, setWaitAfterReply] = useState(true);
  const detail = useQuery({
    queryKey: ["tickets", "detail", id, offset],
    refetchOnWindowFocus: false,
    queryFn: () => api.get<Detail>(`/api/tickets/${id}?offset=${offset}`),
  });
  const t = detail.data?.ticket;
  const context = useQuery({
    queryKey: ["tickets", "reply-context", id],
    queryFn: () => api.get<SupportThreadDetail>(`/api/tickets/${id}/reply-context`),
    enabled: Boolean(t?.thread_id),
  });
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () =>
      api.get<{ mailConfigured: boolean; role?: string; permissions?: string[] }>("/api/session"),
  });
  const report = useQuery({
    queryKey: ["tickets", "report", t?.report_id],
    queryFn: () => api.get<ReportDetail>(`/api/reports/${t?.report_id}`),
    enabled: Boolean(t?.report_id),
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["tickets"] });
  };
  const afterReply = useMoveStatus(t, refresh);
  const backTo =
    t?.type === "REPORT" ? "/reports" : t?.type === "INQUIRY" ? "/support" : "/tickets";
  // The API pages newest first; a conversation reads oldest first.
  const timeline = [...(detail.data?.timeline ?? [])]
    .reverse()
    .filter((item) => showEvents || item.kind === "message");
  const hiddenEvents = (detail.data?.timeline ?? []).filter((i) => i.kind === "event").length;
  const open = Boolean(t && !t.merged_into && t.status !== "CLOSED");
  return (
    <section className="ops-page">
      <DataState loading={detail.isLoading} error={detail.error} empty={false} emptyMessage="">
        {t && detail.data && (
          <>
            <header className="ops-header">
              <div>
                <Link className="text-accent text-xs" to={backTo}>
                  ← 一覧
                </Link>
                <p className="ops-eyebrow mt-4">
                  {t.ticket_number} · {t.service_name} / {ticketTypeLabels[t.type]}
                </p>
                <h1>{t.subject}</h1>
                <div className="flex gap-2 mt-3">
                  <TicketBadge value={t.status} />
                  {["P1", "P2"].includes(t.priority) && <TicketBadge value={t.priority} />}
                  {t.sla_state !== "OK" && !t.report_id && <TicketBadge value={t.sla_state} />}
                </div>
              </div>
            </header>
            {!t.merged_into && <StatusBar ticket={t} onChanged={refresh} />}
            {t.merged_into && (
              <p className="ops-panel mb-5">
                このTicketは統合済みです。履歴は保持しています。{" "}
                <Link className="text-accent" to={`/tickets/${t.merged_into}`}>
                  統合先を開く →
                </Link>
              </p>
            )}
            <div className="ops-detail">
              <div>
                {t.summary && (
                  <div className="ops-panel mb-5">
                    <h2 className="font-medium mb-2">概要</h2>
                    <p className="whitespace-pre-wrap text-sm">{t.summary}</p>
                  </div>
                )}
                {report.error && (
                  <p role="alert" className="text-danger">
                    {report.error.message}
                  </p>
                )}
                {report.data && (
                  <div className="ops-panel mb-5">
                    <h2 className="font-medium mb-3">通報対象</h2>
                    <ReportAuthorHistory report={report.data} />
                    <p className="text-xs text-ink-soft">
                      {report.data.contentType} · {report.data.reasonCode} · 受付ID{" "}
                      {report.data.externalReportId}
                    </p>
                    <p className="whitespace-pre-wrap text-sm mt-3">
                      {report.data.snapshotText ?? "本文なし"}
                    </p>
                    {report.data.detail && (
                      <p className="whitespace-pre-wrap text-sm mt-3">
                        通報者の補足: {report.data.detail}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 my-4">
                      {report.data.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={`/api/reports/${report.data?.id}/attachments/${a.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            className="max-w-40 rounded border border-line"
                            src={`/api/reports/${report.data?.id}/attachments/${a.id}`}
                            alt="通報の証跡"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                    {!t.merged_into && (
                      <ContentActions
                        report={report.data}
                        onChanged={refresh}
                        canDecide={
                          session.data?.permissions?.includes("moderation:decide") ??
                          session.data?.role === "admin"
                        }
                      />
                    )}
                  </div>
                )}
                <div className="conv-toolbar">
                  <h2 className="ops-section-title !m-0">
                    やりとり{" "}
                    <span className="text-xs text-ink-faint font-normal">
                      {detail.data.totalTimeline}件
                    </span>
                  </h2>
                  <label>
                    <input
                      type="checkbox"
                      checked={showEvents}
                      onChange={(e) => setShowEvents(e.target.checked)}
                    />
                    操作履歴も表示{!showEvents && hiddenEvents ? `（${hiddenEvents}件）` : ""}
                  </label>
                </div>
                {offset + 50 < detail.data.totalTimeline && (
                  <div className="mt-3">
                    <Button onClick={() => setOffset(offset + 50)}>さらに前を表示</Button>
                  </div>
                )}
                <div className="conv">
                  {timeline.map((item) =>
                    item.kind === "message" ? (
                      <MessageBubble key={`message:${item.value.id}`} item={item} />
                    ) : (
                      <div key={`event:${item.value.id}`} className="conv-event">
                        <strong>
                          {eventLabels[item.value.event_type] ?? item.value.event_type}
                        </strong>{" "}
                        <Timestamp value={item.value.created_at} />
                        {item.value.actor_id && <span> · {item.value.actor_id}</span>}
                        <EventBody event={item.value} />
                      </div>
                    ),
                  )}
                  {!timeline.length && (
                    <p className="text-sm text-ink-faint">
                      {showEvents ? "履歴はありません。" : "メッセージはまだありません。"}
                    </p>
                  )}
                </div>
                {offset > 0 && (
                  <div className="mb-6">
                    <Button onClick={() => setOffset(Math.max(0, offset - 50))}>
                      新しいやりとりに戻る
                    </Button>
                  </div>
                )}
                {open && (
                  <div>
                    {context.data ? (
                      <ReplyComposer
                        key={t.id}
                        thread={context.data}
                        ticketId={t.id}
                        mailConfigured={session.data?.mailConfigured ?? false}
                        onSent={() => {
                          if (waitAfterReply && t.status !== "WAITING_CUSTOMER")
                            afterReply.mutate("WAITING_CUSTOMER");
                        }}
                        sendOptions={
                          t.status !== "WAITING_CUSTOMER" ? (
                            <label className="inline-flex items-center gap-2 text-xs text-ink-soft">
                              <input
                                type="checkbox"
                                checked={waitAfterReply}
                                onChange={(e) => setWaitAfterReply(e.target.checked)}
                              />
                              送信後「返信待ち」にする
                            </label>
                          ) : null
                        }
                      />
                    ) : t.thread_id ? (
                      <DataState
                        loading={context.isLoading}
                        error={context.error}
                        empty={false}
                        emptyMessage=""
                      >
                        {null}
                      </DataState>
                    ) : (
                      <div className="ops-panel">
                        <StandaloneNote id={t.id} onChanged={refresh} />
                      </div>
                    )}
                    {afterReply.error && (
                      <p role="alert" className="text-danger text-xs mt-2">
                        送信しましたが、状態を変更できませんでした: {afterReply.error.message}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <aside className="ops-sidebar">
                <section className="ops-panel">
                  <h2 className="font-medium mb-3">情報</h2>
                  <dl className="ops-facts">
                    <dt>差出人</dt>
                    <dd>{t.requester_email ?? "返信先なし"}</dd>
                    <dt>サービス</dt>
                    <dd>{t.service_name}</dd>
                    <dt>種別</dt>
                    <dd>{ticketTypeLabels[t.type]}</dd>
                    <dt>受付</dt>
                    <dd>
                      <Timestamp value={t.created_at} />
                    </dd>
                    <dt>更新</dt>
                    <dd>
                      <Timestamp value={t.updated_at} />
                    </dd>
                    {t.assignee_id && (
                      <>
                        <dt>担当</dt>
                        <dd>
                          {masters.data?.assignees.find((a) => a.id === t.assignee_id)?.name ??
                            t.assignee_id}
                        </dd>
                      </>
                    )}
                    {t.next_action && (
                      <>
                        <dt>次の対応</dt>
                        <dd>
                          {t.next_action}
                          {t.next_action_at && (
                            <>
                              {" "}
                              · <Timestamp value={t.next_action_at} />
                            </>
                          )}
                        </dd>
                      </>
                    )}
                  </dl>
                </section>
                <details className="ops-panel ops-secondary">
                  <summary>詳細設定（分類・優先度・担当・次の対応）</summary>
                  <div className="mt-4">
                    {masters.data && (
                      <TicketEditor
                        key={`${t.id}:${t.revision}`}
                        ticket={t}
                        masters={masters.data}
                        onChanged={refresh}
                      />
                    )}
                  </div>
                </details>
                <details className="ops-panel ops-secondary">
                  <summary>
                    対応期限 <TicketBadge value={t.sla_state} />
                  </summary>
                  {t.report_id ? (
                    <p className="text-xs text-ink-soft">通報は審査の状態で管理します。</p>
                  ) : (
                    <SlaPanel ticket={t} />
                  )}
                </details>
                <details className="ops-panel ops-secondary">
                  <summary>関連チケット</summary>
                  <Relations data={detail.data} onChanged={refresh} />
                </details>
              </aside>
            </div>
          </>
        )}
      </DataState>
    </section>
  );
}
function TicketEditor({
  ticket: t,
  masters: m,
  onChanged,
}: {
  ticket: Ticket;
  masters: TicketMasters;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState(t.status),
    [type, setType] = useState(t.type),
    [service, setService] = useState(t.service_id);
  const mutation = useMutation({
    mutationFn: (body: unknown) => api.patch(`/api/tickets/${t.id}`, body),
    onSuccess: onChanged,
  });
  const disabled = Boolean(t.merged_into) || mutation.isPending;
  const select = (
    name: string,
    label: string,
    options: Array<{ id: string; name: string }>,
    value: string | null,
    optional = true,
  ) => (
    <Field label={label}>
      <select name={name} defaultValue={value ?? ""} className={inputClass}>
        {optional && <option value="">未設定</option>}
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const body: Record<string, unknown> = { id: t.id, revision: t.revision };
        const get = (k: string) => String(f.get(k) ?? "").trim();
        for (const k of [
          "status",
          "type",
          "service_id",
          "component_id",
          "category_id",
          "assignment_group_id",
          "assignee_id",
          "subject",
          "summary",
          "next_action",
        ] as const) {
          const v = get(k);
          if ((v || null) !== (t[k] || null)) body[k] = v || null;
        }
        const resolution = get("resolution");
        if (resolution && ["RESOLVED", "CLOSED"].includes(status)) body.resolution = resolution;
        const next = get("next_action_at");
        const nextIso = next ? new Date(next).toISOString() : null;
        if (nextIso !== t.next_action_at) body.next_action_at = nextIso;
        if (
          get("impact") !== t.impact ||
          get("urgency") !== t.urgency ||
          get("priority") !== (t.priority_override ? t.priority : "") ||
          get("override_reason") !== (t.priority_override ?? "")
        ) {
          body.impact = get("impact");
          body.urgency = get("urgency");
          if (get("priority")) body.priority = get("priority");
          body.override_reason = get("override_reason") || null;
        }
        mutation.mutate(body);
      }}
    >
      <fieldset disabled={disabled} className="space-y-3">
        {!t.report_id && t.status === "CLOSED" && (
          <p className="text-xs text-ink-soft">
            編集するには状態を「対応中」に変更して再開してください。
          </p>
        )}
        {t.report_id && (
          <p className="text-xs text-ink-soft">
            判定・再審査は、この画面の「通報対象」にある「コンテンツへの対応」で行います。
          </p>
        )}
        <Field label="状態">
          <select
            name="status"
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value={t.status}>{ticketStatusLabels[t.status]}</option>
            {ticketTransitions[t.status]
              .filter(
                (s) =>
                  !t.report_id ||
                  (!["RESOLVED", "CLOSED"].includes(s) &&
                    !["RESOLVED", "CLOSED"].includes(t.status)),
              )
              .map((s) => (
                <option key={s} value={s}>
                  {ticketStatusLabels[s]}
                </option>
              ))}
          </select>
        </Field>
        {!t.report_id &&
          ["RESOLVED", "CLOSED"].includes(status) &&
          select(
            "resolution",
            "処理結果",
            ticketResolutions.map((id) => ({ id, name: id })),
            t.resolution,
          )}
        <Field label="件名">
          <input
            className={inputClass}
            name="subject"
            defaultValue={t.subject}
            required
            maxLength={500}
          />
        </Field>
        <Field label="Type">
          <select
            className={inputClass}
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
          >
            {ticketTypes
              .filter((id) => (id === "REPORT") === (t.type === "REPORT"))
              .map((id) => (
                <option key={id} value={id}>
                  {ticketTypeLabels[id]}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Service">
          <select
            className={inputClass}
            name="service_id"
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            {m.services
              .filter((s) => s.id === t.service_id)
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>
        </Field>
        <div key={service}>
          {select(
            "component_id",
            "Component",
            m.components.filter((c) => c.service_id === service),
            service === t.service_id ? t.component_id : null,
          )}
        </div>
        <div key={type}>
          {select(
            "category_id",
            "Category",
            m.categories.filter((c) => c.type === type),
            type === t.type ? t.category_id : null,
          )}
        </div>
        {select(
          "impact",
          "Impact",
          ticketLevels.map((id) => ({ id, name: id })),
          t.impact,
          false,
        )}
        {select(
          "urgency",
          "Urgency",
          ticketLevels.map((id) => ({ id, name: id })),
          t.urgency,
          false,
        )}
        <Field label="Priority（自動算出 / 上書き）">
          <select
            className={inputClass}
            name="priority"
            defaultValue={t.priority_override ? t.priority : ""}
          >
            <option value="">Impact × Urgencyで算出</option>
            {ticketPriorities.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="上書き理由">
          <input
            className={inputClass}
            name="override_reason"
            defaultValue={t.priority_override ?? ""}
          />
        </Field>
        {select("assignment_group_id", "担当グループ", m.groups, t.assignment_group_id)}
        {select("assignee_id", "担当者", m.assignees, t.assignee_id)}
        <Field label="概要（内部向け）">
          <textarea className={inputClass} name="summary" defaultValue={t.summary ?? ""} />
        </Field>
        <Field label="次の対応">
          <textarea className={inputClass} name="next_action" defaultValue={t.next_action ?? ""} />
        </Field>
        <Field label="次の対応期限（端末のタイムゾーン）">
          <input
            type="datetime-local"
            className={inputClass}
            name="next_action_at"
            defaultValue={localDate(t.next_action_at)}
          />
        </Field>
        <Button type="submit" variant="primary" disabled={disabled}>
          運用情報を保存
        </Button>
        {mutation.error && (
          <p role="alert" className="text-danger text-sm">
            {mutation.error.message}
          </p>
        )}
      </fieldset>
    </form>
  );
}
function localDate(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function SlaPanel({ ticket: t }: { ticket: Ticket }) {
  return (
    <section className="ops-panel">
      <h2 className="font-medium mb-3">対応期限</h2>

      {[
        ["ACK", t.acknowledged_at, t.sla_ack_minutes],
        ["初回返信", t.first_response_at, t.sla_response_minutes],
        ["解決", t.resolved_at, t.sla_resolution_minutes],
      ].map(([label, completed, minutes]) => {
        const c = slaClock(
          t.created_at,
          (completed as string | null) ?? t.closed_at,
          minutes as number | null,
        );
        return (
          <div className="text-xs border-t border-line py-3" key={label}>
            <div className="flex justify-between">
              <strong>{label}</strong>
              <TicketBadge value={c.state} />
            </div>
            <p className="mt-1">
              {completed ? (
                <Timestamp value={String(completed)} />
              ) : minutes === null ? (
                "Best effort"
              ) : (
                "未完了"
              )}
            </p>
            {c.dueAt && (
              <p className="mt-1 text-ink-faint">
                目標: <Timestamp value={c.dueAt} />
              </p>
            )}
          </div>
        );
      })}
      <p className="text-xs mt-3">
        受付: <Timestamp value={t.created_at} />
      </p>
      {t.closed_at && (
        <p className="text-xs mt-2">
          Close: <Timestamp value={t.closed_at} />
        </p>
      )}
    </section>
  );
}
function Relations({ data, onChanged }: { data: Detail; onChanged: () => void }) {
  const [target, setTarget] = useState(""),
    [kind, setKind] = useState("RELATED"),
    [candidate, setCandidate] = useState<Detail | null>(null);
  const t = data.ticket;
  const relation = useMutation({
    mutationFn: () =>
      api.post(`/api/tickets/${t.id}/relations`, { target_id: target, relation_type: kind }),
    onSuccess: () => {
      setTarget("");
      onChanged();
    },
  });
  const load = useMutation({
    mutationFn: () => api.get<Detail>(`/api/tickets/${encodeURIComponent(target)}`),
    onSuccess: setCandidate,
  });
  const merge = useMutation({
    mutationFn: () =>
      api.post(`/api/tickets/${t.id}/merge`, {
        target_id: candidate?.ticket.id,
        revision: t.revision,
        target_revision: candidate?.ticket.revision,
      }),
    onSuccess: () => {
      setCandidate(null);
      onChanged();
    },
  });
  return (
    <section className="ops-panel">
      <h2 className="font-medium mb-3">関連Ticket</h2>
      <ul className="space-y-2 text-xs mb-4">
        {data.relations.map((r) => (
          <li key={r.id}>
            {r.relation_type} ·{" "}
            <Link
              className="text-accent"
              to={`/tickets/${r.source_ticket_id === t.id ? r.target_ticket_id : r.source_ticket_id}`}
            >
              {r.ticket_number}
            </Link>
          </li>
        ))}
      </ul>
      {!t.merged_into && t.status !== "CLOSED" && (
        <div className="space-y-3">
          <Field label="関連先のTK番号 / UUID">
            <input
              className={inputClass}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </Field>
          <select
            aria-label="関連種別"
            className={inputClass}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          >
            {ticketRelationTypes.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <Button disabled={!target || relation.isPending} onClick={() => relation.mutate()}>
              関連を追加
            </Button>
            <Button
              disabled={Boolean(t.report_id) || !target || load.isPending}
              onClick={() => load.mutate()}
            >
              統合を確認
            </Button>
          </div>
        </div>
      )}
      {(relation.error || load.error) && (
        <p role="alert" className="text-danger text-xs">
          {(relation.error ?? load.error)?.message}
        </p>
      )}
      <Dialog
        open={Boolean(candidate)}
        title="重複Ticketを統合"
        onClose={() => setCandidate(null)}
        footer={
          <Button disabled={merge.isPending} variant="primary" onClick={() => merge.mutate()}>
            統合する
          </Button>
        }
      >
        <p>
          {t.ticket_number} を {candidate?.ticket.ticket_number}「{candidate?.ticket.subject}
          」へ統合します。元のTicketはCLOSED / DUPLICATEとなり、履歴は残ります。
        </p>
        {merge.error && (
          <p role="alert" className="text-danger">
            {merge.error.message}
          </p>
        )}
      </Dialog>
    </section>
  );
}
function StandaloneNote({ id, onChanged }: { id: string; onChanged: () => void }) {
  const [body, setBody] = useState(""),
    [key, setKey] = useState(crypto.randomUUID());
  const note = useMutation({
    mutationFn: () => api.post(`/api/tickets/${id}/notes`, { body, idempotencyKey: key }),
    onSuccess: () => {
      setBody("");
      setKey(crypto.randomUUID());
      onChanged();
    },
  });
  return (
    <div>
      <Field label="内部メモ（ユーザーへ送信されません）">
        <textarea className={inputClass} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Button disabled={!body.trim() || note.isPending} onClick={() => note.mutate()}>
        メモを追加
      </Button>
      {note.error && <p role="alert">{note.error.message}</p>}
    </div>
  );
}
