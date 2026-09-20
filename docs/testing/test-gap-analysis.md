# Test Gap Analysis — Tomokichi Studio（admin / api / mail-ingress）

作成日: 2026-09-21
前提: `docs/audit/tomokichi-studio-platform-audit.md` の発見を「壊れたときの影響が大きい順」にテストへ落とす。Coverage は目標にしない。既存 336 テストの思想（実 migration を Miniflare D1 に流す `tests/harness.ts`、fake mail provider、Service Binding を plain object で渡す）を踏襲する。

## 1. Current Test（2026-09-21 時点、`pnpm test` 336 件）

| 層 | ファイル | 守っているもの |
|---|---|---|
| admin-web worker | `apps/admin-web/src/worker/worker.test.ts`（19） | JWT 無し/壊れ/aud 違い/iss 違い/**期限切れ**を拒否、cookie 受理、Access 未設定で全拒否（bundle 含む）、local bypass の条件、Origin 無し/他 origin/form content-type 拒否、CORS 無し、`no-store`、404 の形、Service Binding の直列化 |
| admin-web UI | `Tickets.test.tsx`, `TicketDetail.test.tsx`, `ReportDetail.test.tsx`, `ReplyComposer.test.tsx`, `ReportAuthorHistory.test.tsx` | 画面の表示と主要操作 |
| admin-core tickets | `tests/tickets.test.ts`（17） | 優先度行列、SLA 計算、全状態遷移と履歴、不正遷移/resolution 欠落/stale revision、override 理由、内部メモがメールに出ない、受付メール＝初回応答、顧客返信で再開、merge の関連と履歴、一覧が本文を持たない、backfill の冪等、署名なしで REPORT を閉じられない、legacy status の写像、同時更新で幽霊イベントを書かない、requester 違いの merge 拒否 |
| admin-core reports | `tests/reports.test.ts`（29） | 冪等（`external_report_id`）、仮名化、未登録 app 拒否、上限、SQL を値として扱う、review スキップ拒否、reopen イベント、受付メール 1 回 + 署名、アドレス無し、送信失敗の保持と再試行、操作の binding、公開失敗時の状態維持、遅延 RPC の上書き防止、メール相関（ID/送信者/引用）、投稿者履歴 |
| admin-core support / reply / apps / attachments | `tests/{support,reply,apps,attachments}.test.ts` | スレッド化（Message-ID/References、件名だけでは統合しない）、重複配信、上限、返信先無し、状態遷移、既読、署名、テンプレ、添付の認証アクセス |
| admin-core mail | `tests/report-mail-ingress.test.ts` | 実 MIME パーサ経由の日本語件名・HTML 引用・別送信者分離 |
| mail-ingress | `src/index.test.ts`（10） | 転送優先、Core 拒否/例外時も転送、サイズ上限、送信者無し、ログに本文を書かない |
| api | `src/index.test.ts`（22）+ `support/turnstile.test.ts` + `routes/remeet/*.test.ts` + `services/remeet/*.test.ts` | support の検証/honeypot/JSON/20KB/429/502、Admin 複製、CORS、Resend、Turnstile の action/hostname、client key（403）、招待/通報/モデレーション |

## 2. Risk Map

| 領域 | 機能 | P | I | Risk | 現状 |
|---|---|---|---|---|---|
| Auth | 未認証 / 期限切れ / 誤 aud | 低 | 高 | High | ✅ |
| Admin | CSRF（Origin + JSON） | 低 | 高 | High | ✅ |
| Ticket | 状態遷移・resolution・楽観ロック | 中 | 高 | High | ✅ |
| Ticket | 統合（merge）の条件 | 中 | 高 | High | ✅ |
| Report | 冪等・署名なしで閉じられない・公開失敗で状態維持 | 中 | 高 | High | ✅ |
| Report | 重複通報 | 中 | 中 | Medium | ✅ |
| **Audit** | **全 Ticket 変更に actor 付きイベントが残る**（監査の前提。1 メソッドでも抜けると「誰が」が消える） | 中 | 高 | High | △ 個別テストが副次的に見ているだけ。横断テスト無し |
| **Audit** | `saveMaster` のイベントに from/to が無い（P-5/§8） | 高 | 低 | Medium | 無し |
| Mail | 偽装 `From` で CLOSED Ticket が再開する（§10 事故シナリオ 1） | 中 | 中 | Medium | 「顧客返信で再開」は ✅（= 現状の仕様を固定）。**認証結果を見る実装が無い**ので、望ましい挙動のテストは実装と同時 |
| API | rate limit / Turnstile / client key | 中 | 中 | Medium | ✅ |
| Incident | state transition | — | — | — | 未実装（§6 と同時に） |
| RBAC | role ごとの拒否 | — | — | — | 未実装（§9 と同時に） |
| Ops | D1 バックアップの復元 | 低 | 高 | High | 手順のみ。自動テスト対象外（運用） |

## 3. Missing Test → Recommended Test

| # | Risk | テスト | 場所 | 状態 |
|---|---|---|---|---|
| S-1 | High | **監査の横断テスト**: `TicketService` の全変更メソッド（create / change ×3 / ack / note / relation / merge / saveMaster）を 1 本の流れで呼び、(a) 変更ごとに `ticket_events` か `audit_logs` に **その actor の id** を持つ行が増える、(b) 読み取り（list / detail / dashboard）は 1 行も増やさない、(c) 失敗した変更（stale revision）は 1 行も増やさない | `apps/admin-core/tests/audit-trail.test.ts` | **追加済み** |
| S-2 | Medium | `saveMaster` の監査行が `from` / `to` を持つ | 同上に `it.fails` | **追加済み（`it.fails`。§8-5 の実装で反転）** |
| S-3 | Medium | mail-ingress: `Authentication-Results` が pass でないメールは Ticket を再開しない | `apps/admin-core/tests/tickets.test.ts` | 未着手（実装 M-7 と同時） |
| S-4 | — | Incident: DETECTED→…→RESOLVED の遷移、子 Ticket の一括関連付け、postmortem の 1:0..1 | `apps/admin-core/tests/incidents.test.ts` | 未着手（M-2 と同時） |
| S-5 | — | RBAC: `viewer` は change/note/merge/saveMaster を拒否、`support` は署名操作を拒否 | `apps/admin-core/tests/authorization.test.ts` + `worker.test.ts` | 未着手（M-4 と同時） |
| S-6 | Low | `apps/api` support の Core 複製が outbox 化されたら「Core 停止中の問い合わせが次の cron で届く」 | `apps/api/src/index.test.ts` | 未着手（M-6 と同時） |

## 4. Edge cases の扱い

- empty / null / unexpected: 既存（本文上限、送信者無し、JSON 不正、SQL 文字列）。
- duplicate: 既存（`external_report_id`、Message-ID、冪等キー）。
- timeout / network: 既存（Resend 失敗、Core 例外、公開失敗）。
- unauthorized: 既存（worker.test）。
- partial failure: 既存（変更 + イベントが同一 batch。S-1 が「失敗時は 0 行」を横断で固定）。
- concurrency: 既存（stale revision、遅延 RPC）。

## 5. Definition of Done

- [x] Critical path（認証・Ticket 遷移・通報の署名・冪等）は既存テストで自動化されている
- [x] 監査の横断不変条件（S-1）が `pnpm --filter @tomokichi/admin-core test` で走る
- [x] flaky なし（時刻は `nowIso()` 相対、外部 I/O は fake）
- [x] 意図は本ファイルとテスト内コメントに記載
- [ ] S-3〜S-6 は対応する実装と同じ PR で追加する
