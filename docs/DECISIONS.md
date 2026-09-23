# Decisions

最終更新: 2026-09-24

設計判断の索引。根拠がコードや文書にあるものだけ Decision と書く。無いものは `Reason unknown` / `Current implementation suggests …`。

## ADR-001 Admin は 3 Worker に分け、D1/R2 を持つ Core を公開しない

- **Context**: 管理画面のバグが DB に届くのを防ぎたい。通報を送るアプリにスキーマを知らせたくない。
- **Decision**: `admin-web`（公開、Access）/ `admin-core`（route 無し、Service Binding のみ、D1/R2）/ `mail-ingress`。境界は `packages/admin-contracts`。
- **Alternatives**: 設計文書は `packages/db` / `packages/validation` を別に置く案。Core の中に畳んだ（`admin-core/README.md` Packages）。
- **Source**: `admin-core/README.md` Why three Workers。

## ADR-002 Access の JWT を Worker でも検証する

- **Decision**: Access が前段にあっても `worker/access.ts` で aud / iss / exp / 署名を再検証。未設定なら全拒否（fail-closed）。
- **Source**: `worker/access.ts`, `identity.ts` コメント、`admin-core/README.md` step 6。

## ADR-003 変更系 API は Origin 一致 + JSON のみ、CORS を出さない

- **Source**: `worker/security.ts` コメント。

## ADR-004 監査行は変更と同じ `db.batch()` で書く、削除 API は無い

- **Source**: `db/audit.ts` コメント、`operations-tickets.md` Integrity。

## ADR-005 通報の削除はラベルではなく署名付き操作でしか行えない

- **Context**: データは利用者の iCloud。運営は触れない。Worker が侵害されても削除指示を作れないようにする。
- **Decision**: Core が操作案 → Mac の Keychain 鍵で署名 → api が検証して manifest 公開 → 成功後に状態更新。Status / resolution の変更だけでは何も消えない。
- **Source**: `admin-report-workflow.md`、`tickets.test.ts` `requires signed moderation…`。

## ADR-006 通報の id は仮名化して保存する

- **Decision**: 通報者・投稿者の ID は `HASH_PEPPER` で SHA-256。元 ID は持たない。`HASH_PEPPER` は永久。
- **Consequences**: 「同じ人か」は仮名の一致でしか言えない。投稿者履歴（0007）は仮名単位。
- **Source**: `reports.test.ts` `pseudonymises…`、`admin-core/README.md` step 3。

## ADR-007 Legacy 表（support_threads / reports）を残し、統合 Ticket はトリガで同期する

- **Context**: 既存の入口（api、mail-ingress）とメール transport を壊さず、運営画面だけ Ticket に寄せたい。
- **Decision**: `0006_ticket_core.sql`。legacy への INSERT/UPDATE をトリガが `tickets*` に写す。Ticket 側の変更は `TicketService` が legacy の status を書き戻す。旧 URL は redirect。
- **Consequences**: 二重表現（監査 P-5 の監査ログ二重化もここから）。
- **Source**: `operations-tickets.md` Rollout、`0006_ticket_core.sql`。

## ADR-008 Ticket の優先度は impact × urgency、SLA はスナップショット

- **Decision**: P1〜P4 の行列、override には理由必須。SLA 分は作成時に `tickets` に写し、設定変更は遡及しない。営業日計算は無し。
- **Source**: `operations-tickets.md` Priority and SLA。

## ADR-009 自動クローズを入れない

- **Source**: `operations-tickets.md` Operator workflow（"There is no automatic close scheduler in this release"）。

## ADR-010 内部メモはメール送信能力を持たないサービスで書く

- **Decision**: `INTERNAL` メッセージは `recipient IS NULL` の CHECK と、mail provider を持たない notes サービス。
- **Source**: `0006` の CHECK、`tickets.test.ts` `writes private notes… without reaching mail`。

## ADR-011 通報の複製は outbox、お問い合わせの複製は best-effort

- **Decision**: 通報は失えないので api 側 outbox + 5 分 cron。お問い合わせはメールが従来経路にあるので best-effort。
- **Consequences**: Core 停止中のアプリからの「返信不要」問い合わせは Ticket にならない（監査 P-7）。
- **Source**: `admin-bridge.ts` コメント。

## ADR-012 メールの相関は Message-ID → References → 件名の通報 ID + 送信者、の順。件名だけでは統合しない

- **Source**: `support.test.ts` `never merges two threads on subject alone`、`admin-report-workflow.md` 受付メール件名。

## ADR-013 送信専用 Resend キーでは Message-ID が取れないので、件名に `[通報ID:UUID]` を入れる

- **Source**: `admin-report-workflow.md` 2026-09-15。

## ADR-014 Turnstile は Web フォームだけ、アプリは共有キー

- **Context**: アプリにブラウザが無い。
- **Decision**: `X-Support-Client` / `X-Remeet-Client`。「フィルタであって認証ではない」。未設定なら未強制、アプリを先に更新。
- **Source**: README Support form、`routes/support.ts` `fromKnownClient` コメント。

## ADR-015 Deploy は CI 成功後の `workflow_run`、順序は `needs:`

- **Source**: `deploy.yml` コメント、README Cloudflare deployment。

## ADR-016 wrangler をルートに置かない

- **Decision**: 各アプリの devDependency。`pnpm -w cf` は api を対象に実行。
- **Source**: README Cloudflare CLI。

## ADR-017 AI 学習クローラは `packages/app-site/src/seo.ts` の `aiTraining` 1 か所で `allow`

- **Source**: README SEO。

## ADR-018 tmkch.io は「アプリ一覧」ではなく Journal

- **Source**: README Journal。

## ADR-019 運営への通知は Ticket 番号だけ。本文は Support DB と管理画面にしか置かない

- **Context**: `apps/api` が問い合わせ本文・通報本文を運営の Gmail へメールしていた。Gmail に繋がる AI サービス等から本文が読める構成になる。
- **Decision**: 本文入りメールを廃止。受付は Core への保存（問い合わせ）/ R2 outbox（通報）が成立した時点とし、通知は Core の `NotificationService` が Ticket 番号・種別・アプリ・受付日時・リンクだけをメールと Web Push で送る。通知 DTO（`TicketNotificationEvent`）に本文フィールドを持たせない。通知失敗は Ticket 作成を失敗させない。
- **Consequences**: `ADMIN_CORE` 無しでは問い合わせ・通報を受け付けない（502）。運営は内容を必ず管理画面で読む。受信メール（`mail-ingress`）の Gmail 転送は今回の対象外で残っている。
- **Source**: `docs/support-notifications.md`、`admin-bridge.ts` `recordSupportMessage` コメント。

## ADR-020 Web Push は `web-push` npm ではなく Web Crypto で自前実装

- **Context**: Core は Cloudflare Workers。`web-push` は Node の `crypto.createECDH` / `hkdfSync` に依存する。
- **Decision**: `packages/admin-push` に RFC 8291 + RFC 8292 を `crypto.subtle` だけで実装。RFC 8291 Appendix A のベクタをテストで照合。VAPID 秘密鍵は Core の secret、公開鍵は var。
- **Source**: `packages/admin-push/src/index.ts` コメント。

## ADR-021 管理画面の Service Worker は何もキャッシュしない

- **Decision**: PWA 化の目的はホーム画面起動と Push だけ。Cache Storage は使わず、オフライン時はインライン HTML の 1 画面のみ。`/manifest.webmanifest` と `/icons/*` だけ Worker の JWT ゲートを通さない（ブラウザが cookie 無しで取りに来るため）。
- **Source**: `apps/admin-web/public/sw.js`、`worker/index.ts` `isInstallAsset`。

## ADR-022 問い合わせ・通報管理基盤を `inquiry-platform` として独立させる

- **Context**: Admin（Core / Web / mail-ingress / contracts / mail / push）は Tomokichi Studio の一部として作られたが、Remeet・Colorvia・Yohaku も同じ基盤を使う。Studio は利用者の 1 つであるべき。
- **Decision**: 別 Repository `inquiry-platform`（GitHub private、履歴付きで切り出し）へ段階移行する。Ticket の状態・種別は現行（8 状態・7 種別・SLA）を正とし、SDK / 公開 API で簡易語彙（OPEN / IN_PROGRESS / RESOLVED / CLOSED、contact / report）に写像する。Cloudflare 資源名（Worker、D1 `tomokichi-admin`、R2、`admin.tmkch.io`）は変えず、新 Repository から同じ資源へデプロイする（データ移行なし）。資源名の中立化は独立化完了後の別作業。
- **Approval**: Owner（tomoki013）が 2026-09-24 に承認。対象: Repository 作成（ローカル + GitHub private）、モデル方針、資源名方針。CI/CD のデプロイ元移動・Dependency 追加・Production migration は各 Phase で別途承認。
- **Source**: [inquiry-platform-extraction.md](inquiry-platform-extraction.md)。

## 根拠が文書に無いもの

| 判断 | 状態 |
|---|---|
| 単一ロール `owner` | 「Phase 1–3 は 1 ロール」と `core.ts` コメント。2 人目の前に拡張する前提（監査 §9） |
| `ticket_assignees` が Access identity と無関係 | **Reason unknown**。Current implementation suggests マスタとして名前だけ管理したかった。監査 P-4 |
| `audit_logs` と `ticket_events` の二重化 | ADR-007 の帰結。統合表示は未実装 |
| Incident は Ticket の一種（固有列なし） | `operations-tickets.md` "INCIDENT tickets … are available on the shared core"。固有の運用は未定義（監査 §6） |
| 監視が無い | **Reason unknown**（優先度の問題と推定）。監査 §7 |
| `mail-ingress` が DKIM/SPF を見ない | **Reason unknown**。監査 §10 |
| docs が英語（`operations-tickets.md`）と日本語（`admin-report-workflow.md`）で混在 | Reason unknown。今後は日本語本文 + 英語識別子 |
| `apps/review` を yohaku の wrangler で deploy | Current implementation suggests 一時的な間借り。`package.json` `deploy:review` |
