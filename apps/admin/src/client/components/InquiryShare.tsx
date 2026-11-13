import type { SupportThreadDetail } from "@inquiry-platform/core";
import { useState } from "react";
import { api } from "../lib/api";
import { Button, inputClass } from "./primitives";

export function InquiryShare({ thread }: { thread: SupportThreadDetail }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<
    { id: string; speaker: "customer" | "support"; text: string }[]
  >([]);
  const [reviewed, setReviewed] = useState(false);
  const [share, setShare] = useState<{ token: string; expiresAt: string }>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const selected = messages.flatMap(({ speaker, text }) =>
    text.trim() ? [{ speaker, text }] : [],
  );
  const source = thread.messages.filter((m) => m.direction !== "internal_note").slice(-12);

  async function run(action: "create" | "revoke") {
    setError("");
    setPending(true);
    try {
      if (action === "create") {
        setShare(
          await api.post(`/api/support/threads/${encodeURIComponent(thread.id)}/inquiry-share`, {
            reviewed: true,
            messages: selected,
          }),
        );
      } else {
        await api.del("/api/support/inquiry-share");
        setShare(undefined);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "共有設定を更新できませんでした。");
    } finally {
      setPending(false);
    }
  }

  if (!open) return <Button onClick={() => setOpen(true)}>AIへの共有を準備</Button>;

  return (
    <section className="ops-panel mt-4 space-y-3">
      <h2 className="font-medium">この問い合わせをAIに共有</h2>
      <p className="text-sm">
        必要なやり取りだけ選び、氏名・連絡先・住所・注文番号などを共有欄から削除してください。入力欄に残した文章だけを共有します。
      </p>
      {source.map((m) => (
        <details key={m.id}>
          <summary className="cursor-pointer text-sm">
            {m.direction === "inbound" ? "問い合わせ者" : "運営"}の原文を確認
          </summary>
          <p className="whitespace-pre-wrap text-sm">{m.bodyText}</p>
          <Button
            disabled={pending || Boolean(share) || messages.some(({ id }) => id === m.id)}
            onClick={() => {
              setMessages([
                ...messages,
                { id: m.id, speaker: m.direction === "inbound" ? "customer" : "support", text: "" },
              ]);
              setReviewed(false);
            }}
          >
            この発言の共有欄を追加
          </Button>
        </details>
      ))}
      {messages.map((m, i) => (
        <label className="block" key={m.id}>
          <span className="text-sm">
            {i + 1}. {m.speaker === "customer" ? "問い合わせ者" : "運営"}の共有文
          </span>
          <textarea
            className={inputClass}
            value={m.text}
            maxLength={6000}
            disabled={pending || Boolean(share)}
            onChange={(e) => {
              setMessages(
                messages.map((item, index) =>
                  index === i ? { ...item, text: e.target.value } : item,
                ),
              );
              setReviewed(false);
            }}
          />
        </label>
      ))}
      {share ? (
        <div className="space-y-2">
          <p className="text-sm">
            同じアカウントで認証した専用 MCP の <code>read_approved_inquiry</code>{" "}
            に渡す、10分間・1回限りのコードです。
          </p>
          <input className={inputClass} aria-label="共有コード" value={share.token} readOnly />
          <p className="text-xs">
            有効期限 {new Date(share.expiresAt).toLocaleTimeString("ja-JP")}
          </p>
          <Button disabled={pending} onClick={() => void run("revoke")}>
            共有を取り消す
          </Button>
        </div>
      ) : (
        <>
          <label className="flex gap-2 text-sm">
            <input
              type="checkbox"
              checked={reviewed}
              disabled={!selected.length || pending}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            共有する全文を読み直し、本人や第三者を特定できる情報を除いたことを確認しました
          </label>
          <Button
            disabled={
              !reviewed ||
              pending ||
              !selected.length ||
              selected.reduce((n, m) => n + m.text.length, 0) > 12000
            }
            onClick={() => void run("create")}
          >
            確認した文章の共有コードを発行
          </Button>
        </>
      )}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
}
