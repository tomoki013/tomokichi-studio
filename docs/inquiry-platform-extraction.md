# Inquiry Platform 独立化 — Phase 1 棚卸し

調査日: 2026-09-24。

> **状態（2026-09-26）**: Phase 1〜5 完了。基盤は [tomoki013/inquiry-platform](https://github.com/tomoki013/inquiry-platform)（private）からデプロイされ、この Repository の旧コードは削除済み。tomokichi-api は `INQUIRY` binding（基盤の `Intake`）と vendored SDK（`packages/inquiry-sdk`）で基盤を使う。以下は Phase 1 時点の棚卸しの記録で、パスは当時のもの。

対象: `apps/admin-core`、`apps/admin-web`、`apps/mail-ingress`、`apps/api`（support / reports / admin-bridge）、`packages/admin-{contracts,mail,push}`。コードは変更していない。

## 0. 結論（先に）

- 現行の管理基盤は **すでに境界がかなり綺麗**。呼び出し側は `@tomokichi/admin-contracts` しか知らず、Core は Service Binding でしか到達できず、D1 スキーマは Core に閉じている（`docs/ARCHITECTURE.md` §3）。
- Tomokichi Studio 固有の混入は主に **ブランド文字列・設定値・シード** で、Core Logic そのものへの混入は少ない。例外は **Remeet モデレーション連携**（Core が `app_slug === "remeet"` で分岐し、`RemeetModeration` を直接呼ぶ）。
- 指示書のモデル（4 ステータス・5 種別）は現行（8 ステータス・7 種別・SLA・優先度・統合）より **小さい**。置き換えると機能と既存データの意味が失われるので、**現行モデルを正とし、指示書の語彙は API 層の写像で吸収する** ことを推奨（§3）。
- 独立化で **D1 / R2 を移動しなければデータ移行は不要**。新 Repository から同じ Cloudflare アカウントの同じ D1 にデプロイすれば、件数・日時・状態は構造的に保存される。これを Phase 2〜4 の安全策の軸にする。

## 1. 移動対象と残留対象

| 区分 | 現在地 | 行き先 |
|---|---|---|
| Ticket / Report / Support / Reply / Notification / Audit / Dashboard | `apps/admin-core` | inquiry-platform `apps/api`（Core） |
| 管理画面 + Access 検証 + CSP | `apps/admin-web` | inquiry-platform `apps/admin` |
| 受信メール | `apps/mail-ingress` | inquiry-platform（`apps/mail-ingress` のまま、または `apps/api` の email handler） |
| 型・zod・`AdminCoreApi`・エラー語彙 | `packages/admin-contracts` | inquiry-platform `packages/core` + `packages/sdk` |
| メール送信 | `packages/admin-mail` | inquiry-platform `packages/notification` |
| Web Push | `packages/admin-push` | inquiry-platform `packages/notification` |
| 公開お問い合わせ受付（Turnstile / client key / rate limit） | `apps/api/src/routes/support.ts`, `src/support/*` | inquiry-platform 公開 API（`POST /v1/tickets`）。Phase 3 まで現位置で併存 |
| 通報受付（Remeet） | `apps/api/src/routes/remeet/reports.ts`, `services/remeet/report-*` | 受付の汎用部分は `POST /v1/reports` へ。Remeet 固有の検証・証跡形式は Remeet 側（=tomokichi-api）に残す |
| **残留**: Remeet 招待・モデレーション manifest・Mac 署名 CLI | `apps/api/src/services/remeet/{invite-*,moderation-*}`, `scripts/moderation.ts` | tomokichi-studio（アプリ側の Business Logic） |
| **残留**: ブランドサイトの `/support` フォーム | `apps/main` | tomokichi-studio。送信先を SDK 経由に差し替えるだけ |

## 2. 依存箇所一覧（分類別）

### Core Logic

| 箇所 | 内容 | 対応 |
|---|---|---|
| `apps/admin-core/src/domain/report-service.ts:51,159,340` | `RemeetModerationApi` を直接保持し `row.app_slug === "remeet"` で分岐 | `ModerationAdapter`（project ごとに登録）へ。Core は adapter の有無だけを見る |
| `apps/admin-core/src/domain/ticket-service.ts:354` | `report?.slug === "remeet"` | 同上（adapter の capability で判定） |
| `apps/admin-core/src/domain/reply-service.ts:273` | `appId ?? "studio"` を監査 targetId に使用 | Project 未指定を表す定数（例 `null` / `"platform"`）へ |
| `apps/admin-core/src/domain/reply-service.ts:288-292` | 署名に `Tomokichi Studio` / `tmkch.io` / `support@tmkch.io` を直書き | `app_mail_settings`（既存）または Project branding へ |
| `packages/admin-contracts/src/signature.ts:3-7` | 既定署名（社名・URL・電話番号）を契約パッケージに直書き | Branding 設定へ。契約から削除 |
| `packages/admin-contracts/src/moderation.ts:23` | `RemeetModerationApi` という名前の型が共有契約に存在 | `ModerationAdapter` に一般化し、Remeet 実装は tomokichi-api 側 |
| `apps/admin-core/src/domain/identity.ts` | Remeet の CloudKit ID をハッシュ化する前提の説明 | ロジックは汎用（ハッシュ化）。コメントのみ一般化 |

### Branding

| 箇所 | 内容 |
|---|---|
| `apps/admin-core/src/domain/notification-service.ts:107` | 件名 `[Tomokichi Studio] 新しい…があります` |
| `packages/admin-mail/src/html.ts:15,23` | 署名ロゴ URL `https://tmkch.io/assets/mail-logo.png`、alt `Tomokichi Studio` |
| `apps/admin-core/migrations/0004_report_mail.sql:7-11` | 署名文字列（電話番号含む）をデータとして投入 — データなので残してよい |
| `apps/admin-core/seed/reply-templates.ts:58,61,65-215` | 返信テンプレ本文・`studio_*` キー — 運用データ。Tomokichi Studio 側の seed として分離 |
| `apps/admin-core/seed/apps.ts` | Remeet / Colorvia / Yohaku の台帳 — Project 初期データとして分離 |
| `apps/admin-web/src/client/components/Layout.tsx:46`、`pages/Dashboard.tsx:22`、`pages/Apps.tsx:19`、`pages/SupportThread.tsx:23`、`components/ReplyComposer.tsx:237` | 画面上の `Tomokichi Studio` / `support@tmkch.io` |
| `apps/admin-web/public/manifest.webmanifest:2-4`、`public/sw.js:17,56`、`index.html:9,18` | PWA 名・タイトル |
| `apps/admin-web/src/client/pages/ReplyTemplates.tsx:103,174`、`ReplyComposer.tsx:94` | 「studio 共通」 |

### Notification

- 本文を含めず Ticket 番号・種別・アプリ名・リンクのみ（`notification-service.ts:95-120`、`renderPushPayload`）— **指示書 §12 を既に満たす**。変更は件名のブランド化のみ。
- `MailProvider`（Resend / unconfigured）と Web Push は既に adapter 形。`packages/notification` に統合し `NotificationAdapter` インターフェースを明示するだけでよい。
- 例外: `apps/api` が Resend を直接使う（manifest 期限警告 = Remeet 側に残る。受付メールは Core 側）。

### Admin UI

- `apps/admin-web/src/client/pages/Tickets.tsx:428` — 新規作成時の既定サービスが `"studio"`。
- `apps/admin-web/src/client/pages/ReportDetail.tsx:169,179,358` — `appSlug === "remeet"` で署名付き削除 UI を出し分け、Mac 署名サービスの起動コマンド（`pnpm --filter @tomokichi/api moderation serve`）を表示。→ adapter capability（`supportsSignedRemoval` 等）で出し分け、コマンド文言は Project 設定へ。
- 画面は Tickets / Reports / Support / Apps / Templates / Notifications / Dashboard / Activity。**Project フィルタは Tickets 一覧に `service` として既にある**。

### Database（D1 `tomokichi-admin`）

- Ticket コアは `0006_ticket_core.sql`。旧表（`support_threads`, `reports`, `support_messages`, `report_events`, `support_reply_sends`）への INSERT を **トリガで `tickets*` に同期** する構造。旧 ID は `ticket_sources(source_type, source_id)` に保持 = 指示書 §19 の `legacyId` 相当が既にある。
- Project 相当が 2 つある: `apps`（台帳・メール設定・リンク）と `services`（Ticket の分類。`apps` からトリガで複製）。`services` に `('studio','tmkch.io','tmkch-io')` が固定投入（`0006_ticket_core.sql:10`）。
- 内部メモは `ticket_messages.visibility='INTERNAL'` と旧 `support_messages.direction='internal_note'`。インターネットから読む経路はない。ただし tomokichi-api の `ADMIN_CORE` binding は `AdminCore` entrypoint 全体に届く（コード上は `createReport` / `createSupportThread` / `fetch` のみ使用）。Phase 3 で受付専用 entrypoint に絞る。
- `audit_logs` は変更と同一 batch、`ticket_events` はトリガ。

### Auth

- Cloudflare Access JWT を `admin-web/src/worker/{access,identity}.ts` で検証し、Core には `ActorRef` のみ渡す（良い境界）。
- Role は `"owner"` のみ（`packages/admin-contracts/src/core.ts` `AdminRole`）。**Core 側に Authorization Layer は無い** — Service Binding に到達できる = 全権限。指示書 §16 の viewer / operator / admin は未実装。
- 公開 API の認証は Web: Turnstile、アプリ: `X-Support-Client` / `X-Remeet-Client` の共有鍵。Project を識別する鍵ではない（1 本の鍵で全アプリ）。

### API

- 公開: `tomokichi-api` の `/api/v1/support`、`/remeet/v1/reports`（Remeet 名前空間）。汎用 `/v1/tickets` `/v1/reports` は無い。
- 管理: `admin-web` の `/api/*`（Access 背後）→ Service Binding RPC（`AdminCoreApi`）。管理 API と公開 API は **Worker 単位で既に分離** されている。
- `apps/api/src/services/admin-bridge.ts` が Core 呼び出しの唯一の窓口。Phase 3 でこれを SDK 呼び出しに差し替えるのが最小変更。

### Environment Variables / Infra 名

| Worker | 変数 | Tomokichi 固有値 |
|---|---|---|
| admin-core | `SUPPORT_EMAIL`, `SUPPORT_FROM_NAME`, `NOREPLY_EMAIL`, `REPORT_EMAIL`, `DEFAULT_SUPPORT_URL`, `ADMIN_ORIGIN`, `VAPID_SUBJECT` / secrets `MAIL_API_KEY`, `NOTIFICATION_EMAIL`, `VAPID_PRIVATE_KEY` | `*@tmkch.io`, `Tomokichi Studio Support`, `https://admin.tmkch.io` |
| admin-web | `ADMIN_ORIGIN`, `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN`, route `admin.tmkch.io` | 同上 |
| mail-ingress | `SUPPORT_EMAIL` / secret `SUPPORT_FORWARD_EMAIL` | `support@tmkch.io` |
| api | `SUPPORT_CLIENT_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_API_KEY`, `SUPPORT_FROM_EMAIL` | `Tomokichi Support <support@tmkch.io>` |
| 資源名 | Worker `tomokichi-admin-core` / `-admin-web` / `-mail-ingress`、D1 `tomokichi-admin`、R2 `tomokichi-admin-files` | 名前に `tomokichi` |

`SUPPORT_*` は単一ブランド前提（全アプリが support@tmkch.io から返信）。Project ごとの送信元は `app_mail_settings` に一部あるが env が既定値。

## 3. 指示書と現行の差分（判断が必要）

| 論点 | 指示書 | 現行 | 推奨 |
|---|---|---|---|
| Status | OPEN / IN_PROGRESS / RESOLVED / CLOSED | NEW / TRIAGE / ACKNOWLEDGED / IN_PROGRESS / WAITING_CUSTOMER / WAITING_INTERNAL / RESOLVED / CLOSED + resolution | 現行を維持（Tomokichi 固有名ではなく汎用 ITSM 語彙。SLA がこれに依存）。SDK / 公開 API では 4 値に写像（NEW,TRIAGE,ACK→OPEN、WAITING_*→IN_PROGRESS） |
| Type | contact / report / bug / feedback / abuse | INQUIRY / REPORT / BUG / INCIDENT / BILLING / PRIVACY / OTHER | 現行を維持し `contact↔INQUIRY` を写像。`feedback`/`abuse` は必要時に追加 |
| Incident | ガイド §15: Ticket と Incident を分ける | `INCIDENT` が Ticket type | 既存行があるか確認してから、独立化の範囲外として据え置き（削除はしない） |
| Project | `Project` 1 概念 | `apps` と `services` の 2 表、`services.studio` 固定 | `apps` を Project の正にし、`studio` 行は `tomokichi-studio` Project として通常データ扱い。表名変更は後回し（ビューで吸収） |
| Role | viewer / operator / admin | owner のみ、Core に認可層なし | Core の RPC 入口に `authorize(actor, action, project?)` を置き、当面は owner=admin の 1 ロール |
| Report 拡張 | targetType / targetId / targetOwnerId / reason / evidence | `contentType` / `content_external_id` / `author_ref_hash` / `reason_code` / R2 証跡 | 同義。フィールド名の写像のみ。`targetOwnerId` はハッシュ化 ID のまま（生 ID を持たない現設計の方が安全） |
| 表示 ID | `RMT-000123` 等 | `ticket_numbers.seq` による連番 | Project prefix は表示層で付与可能。後回し |

## 4. Phase 2 以降の提案（安全策込み）

1. **Repository 作成**: `tomokichi-studio` の履歴を `git filter-repo` で対象パスだけ抽出して `inquiry-platform` を作る（Repository Policy の「履歴保存」）。
2. **Cloudflare 資源名は変えない**: Worker 名・D1・R2・`admin.tmkch.io` をそのまま新 Repo からデプロイ。Service Binding は Worker 名で解決するので `tomokichi-api` 側は無変更で動く。資源名の中立化は独立化完了後の別タスク。
3. **デプロイ権限の一本化**: 移行期間中に両 Repo から同じ Worker をデプロイしないよう、切り替え時に `tomokichi-studio` の `deploy.yml` から admin 3 Worker を外す（同一 PR で）。
4. **ブランド外出し**: §2 の Branding / 署名 / 件名 / PWA 名を Project 設定 + デプロイ時設定へ。
5. **ModerationAdapter**: Remeet 分岐を adapter に置換。Remeet 実装（Service Binding `RemeetModeration`）は設定で登録。
6. **認可層**: Core 入口に追加。既存テスト（`apps/admin-core/tests/*`）はそのまま移して PASS を維持。
7. **Phase 3**: `admin-bridge.ts` を SDK 呼び出しに差し替え、公開受付（`/api/v1/support`）を新基盤の `/v1/tickets` に移すのはその後。

## 5. Owner 承認が必要な操作（Development Rules `APPROVAL_FLOW.md`）

- 新 Repository `inquiry-platform` の作成（ローカル + GitHub）
- CI/CD 構成の変更（admin 3 Worker のデプロイ元の移動）
- Dependency 追加（`git filter-repo` 等）
- Production D1 への migration（Project / 認可関連のスキーマ変更がある場合）
