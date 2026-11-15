import { useState } from "react";
import { api } from "../lib/api";
import { Button, inputClass } from "./primitives";

export interface ShareMessage {
  id: string;
  speaker: "customer" | "support";
  text: string;
}

export function InquiryShare({ source, endpoint }: { source: ShareMessage[]; endpoint: string }) {
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

  async function run(action: "create" | "revoke") {
    setError("");
    setPending(true);
    try {
      if (action === "create") {
        setShare(
          await api.post(endpoint, {
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

  function update(id: string, text: string) {
    setMessages((items) => items.map((item) => (item.id === id ? { ...item, text } : item)));
    setReviewed(false);
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
            {m.speaker === "customer" ? "問い合わせ者" : "運営"}の原文を確認
          </summary>
          <p className="whitespace-pre-wrap text-sm">{m.text}</p>
          <Button
            disabled={pending || Boolean(share) || messages.some(({ id }) => id === m.id)}
            onClick={() => {
              setMessages([...messages, { id: m.id, speaker: m.speaker, text: "" }]);
              setReviewed(false);
            }}
          >
            この発言の共有欄を追加
          </Button>
        </details>
      ))}
      {messages.map((m, i) => (
        <div className="space-y-2" key={m.id}>
          <label className="block">
            <span className="text-sm">
              {i + 1}. {m.speaker === "customer" ? "問い合わせ者" : "運営"}の共有文
            </span>
            <textarea
              className={inputClass}
              value={m.text}
              maxLength={6000}
              disabled={pending || Boolean(share)}
              id={`share-text-${m.id}`}
              onChange={(e) => update(m.id, e.target.value)}
            />
          </label>
          <Button
            disabled={pending || Boolean(share) || !m.text}
            onClick={() => {
              const field = document.getElementById(`share-text-${m.id}`);
              if (!(field instanceof HTMLTextAreaElement)) return;
              const { selectionStart: start, selectionEnd: end } = field;
              if (start === end) return;
              update(m.id, `${m.text.slice(0, start)}[非公開]${m.text.slice(end)}`);
              field.focus();
            }}
          >
            選択範囲をマスク
          </Button>
          <Button
            disabled={pending || Boolean(share) || Boolean(m.text)}
            onClick={() => {
              update(
                m.id,
                maskContactDetails(source.find((item) => item.id === m.id)?.text ?? "").slice(
                  0,
                  6000,
                ),
              );
            }}
          >
            原文から連絡先をマスクして取り込む
          </Button>
        </div>
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

export function maskContactDetails(text: string) {
  return text
    .replace(
      /[\p{L}\p{N}_.+%-]+[ \t]*[@＠][ \t]*[\p{L}\p{N}.-]+[.．][\p{L}]{2,}/giu,
      "[メールアドレス]",
    )
    .replace(
      /(?<![0-9０-９])[+＋]?[0-9０-９](?:[ \t().（）.ー–-]*[0-9０-９]){8,}(?![0-9０-９])/gu,
      "[電話番号・識別番号]",
    );
}
