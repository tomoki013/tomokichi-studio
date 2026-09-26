# Tomokichi Studio 基盤・管理システム全面監査

> **記録用（2026-09-26）**: ここに出てくる管理基盤（`apps/admin-core` / `apps/admin-web` / `apps/mail-ingress` / `packages/admin-*`）は [tomoki013/inquiry-platform](https://github.com/tomoki013/inquiry-platform) に移り、この Repository からは削除した（ADR-022）。パスは執筆時点のもの。

作成日: 2026-09-21
対象: `codex/mail-theme-report-history` @ `4a5374f` + 未コミットの作業ツリー（`0007_report_author_history.sql` / `0008_report_receipt_first_response.sql` / `ReportAuthorHistory.tsx` を含む）。`main` との差分は通報者履歴とメール配色のみで、本監査の結論には影響しない。
範囲: `apps/api`（公開 API）、`apps/admin-core`、`apps/admin-web`、`apps/mail-ingress`、`packages/admin-contracts`、`packages/admin-mail`、`docs/`、`.github/workflows/`。ブランドサイト群（`apps/main` ほか）は「管理基盤」の対象外として構成だけ確認した。

---

## 1. Current Architecture

### 1.1 Worker 構成（コードと `wrangler.jsonc` で確認）

```
                         インターネット
   ┌────────────────────────┬──────────────────────┬─────────────────────────┐
   │ tmkch.io / *.tmkch.io  │ api.tmkch.io         │ admin.tmkch.io          │
   │ Astro 静的 (7 サイト)  │ tomokichi-api (Hono) │ tomokichi-admin-web     │
   │                        │  /api/v1/support     │  Cloudflare Access +    │
   │  /support フォーム ───▶│  /remeet/v1/invites  │  JWT 検証 + CSP +       │
   │  (Turnstile)           │  /remeet/v1/reports  │  same-origin JSON guard │
   │                        │  /remeet/v1/moderation│                        │
   └────────────────────────┴──────────┬───────────┴────────────┬────────────┘
                                       │ Service Binding         │ Service Binding
                                       ▼                         ▼
                              tomokichi-admin-core  ◀── tomokichi-mail-ingress (Email Routing)
                              (route なし / workers.dev なし)
                                  D1 tomokichi-admin ・ R2 tomokichi-admin-files (private)
                                       │ Service Binding (RemeetModeration entrypoint)
                                       ▼
                              tomokichi-api ── D1 REMEET_INVITES_DB ── 署名は運営 Mac (127.0.0.1:47831)
```

- **公開されているのは 3 つ**（サイト群、api、admin-web）。Core は Service Binding からしか届かない。
- `apps/api` は Remeet / Colorvia のアプリ内お問い合わせ・招待・通報・モデレーション manifest を担い、D1（`REMEET_INVITES_DB`）と R2（通報証跡）を持つ。cron 2 本（日次: 招待の掃除 + manifest 期限警告、5 分毎: 通報 outbox 再送）。
- `apps/api` → Admin Core への複製（`admin-bridge.ts`）は **通報は durable outbox、お問い合わせは best-effort**。Core が落ちていても公開側は従来通り動く。

### 1.2 データ層（`apps/admin-core/migrations/0001〜0008`）

| 領域 | テーブル | 備考 |
|---|---|---|
| アプリ台帳 | `apps`, `app_links`, `app_mail_settings` | 削除なし（`archived_at`） |
| 通報（legacy 入口） | `reports`, `report_events`, `report_attachments`, `report_operations` | `external_report_id` UNIQUE で冪等。証跡は `expired_at` で保持期限 |
| お問い合わせ（legacy 入口） | `support_threads`, `support_messages`, `support_attachments`, `support_drafts`, `support_reply_sends`, `support_thread_redirects` | メール transport 層として存続 |
| **統合 Ticket（0006）** | `tickets`, `ticket_numbers`, `ticket_sources`, `ticket_messages`, `ticket_events`, `ticket_reports`, `ticket_relations` | legacy 挿入を **トリガ** で Ticket に同期。`type` に `INCIDENT` を含む 7 種、`status` 8 種、`resolution` 10 種、`priority` P1〜P4（impact × urgency）、SLA スナップショット、`revision` 楽観ロック、`merged_into` |
| マスタ | `services`, `service_components`, `ticket_categories`, `assignment_groups`, `ticket_assignees`, `ticket_sla_settings` | 非アクティブ化のみ |
| 返信 | `reply_templates` | |
| 監査 | `audit_logs`（actor_type / actor_id / action / target / metadata） | 変更と **同一 `db.batch()`** で書く |

### 1.3 認証・認可

- Admin Web: Cloudflare Access（アカウントメンバー限定）→ Worker で JWT を再検証（`access.ts`）→ `AdminIdentity { id: sub, email, role: "owner" }`。`ENVIRONMENT=local && DEV_ADMIN_EMAIL` のときだけ bypass（本番 vars は `production`）。
- 変更系 `/api/*`: Origin が `ADMIN_ORIGIN` と一致 **かつ** `Content-Type: application/json`（DELETE を除く）。CORS ヘッダは一切出さない。
- CSP: `default-src 'self'`、`script-src 'self'`、`connect-src 'self' http://127.0.0.1:47831`（Mac 署名サービス）、`frame-ancestors 'none'`。
- 公開 API: Turnstile（Web フォーム）/ `X-Support-Client` `X-Remeet-Client`（アプリ、フィルタであって認証ではない）/ Cloudflare Rate Limiting binding ×6（support, invite create/resolve/code/revoke, report）。

### 1.4 テストと CI

- vitest 336 テスト（Core 9 ファイル・Web worker/UI・API・mail-ingress・contracts・mail）。D1 はローカル Miniflare で実 SQL を流す（`tests/harness.ts`）。
- CI（`ci.yml`）は path filter で変更アプリだけ検査。Deploy（`deploy.yml`）は CI 成功後 `workflow_run` で起動し、admin-core → admin-web / mail-ingress の順序を `needs:` で保証。
- `pnpm ci` = biome + check + test + build + check:links + check:seo。

---

## 2. Current Support Workflow

`docs/operations-tickets.md` と `ticket-service.ts` で確認した実際の流れ。

```
入口                                  Ticket
─────────────────────────────────    ──────────────────────────────────────────
Web /support (Turnstile)  ─┐          trigger ticket_support_insert → INQUIRY / NEW / P3
アプリ内フォーム (client key) ─┤─▶ api ─▶ support_threads ─┐
support@tmkch.io (mail-ingress) ┘                          ├─▶ tickets
Remeet 通報 (client key, outbox) ─▶ api ─▶ reports ─┬─ support_thread_id ─┘  → type=REPORT, group=moderation
                                                  └─ (アドレス無し) → 単独 REPORT ticket

運営 (admin.tmkch.io)
  Tickets キュー → 詳細（timeline: messages ∪ events）→ ACK → IN_PROGRESS → WAITING_* → RESOLVED(resolution 必須) → CLOSED
  返信: reply-service（Resend、Message-ID/In-Reply-To/References、署名自動挿入、冪等キー）
  内部メモ: notes（mail provider を持たないサービス）
  通報: prepare → Mac 署名 → api が manifest 公開 → complete（成功後に状態更新）
  関連・統合: relations(RELATED/DUPLICATE/PARENT/CHILD), merge（requester email 一致 + 両 revision）
```

Entity の管理状況:

| Entity | 実体 | 状態 |
|---|---|---|
| Ticket | `tickets` + `ticket_numbers`（TK-000001） | ✅ |
| Message | `ticket_messages`（direction × visibility、INTERNAL は recipient 禁止の CHECK） | ✅ |
| Customer | **無い**。`requester_email` / `requester_id`（通報者ハッシュ）が ticket に直接 | △ 同一人物の横断は email 文字列一致のみ |
| App | `apps` → trigger で `services` に複製 | ✅（二重管理は意図的。§7） |
| Status / Resolution / Priority | CHECK 制約 + `ticket-service.ts` の遷移規則 | ✅ |
| Category | `ticket_categories`（type スコープ） | ✅ |
| Assignment | `assignment_groups` / `ticket_assignees`（**Access の identity と無関係な自由入力**） | △ §9 |

---

## 3. Problems

「壊れている」ものは少ない。多くは **設計が先行して運用面がまだ無い** 種類の問題。

| # | 問題 | 場所 | 影響 | 優先度 |
|---|---|---|---|---|
| P-1 | **Incident に「更新の時系列」「影響範囲」「事後分析」が無い**。`type='INCIDENT'` は Ticket の一種で、他 Ticket と同じ列しか持たない | `0006_ticket_core.sql` `tickets` | 複数ユーザー報告を 1 障害に束ねる（PARENT/CHILD）はできるが、「いま何が起きていて、次にいつ更新するか」を運営自身が追えない | High |
| P-2 | **監視の入口が無い**。`/health` は各 Worker にあるが、誰も定期的に叩いていない。Cloudflare の `observability.enabled` はログ保持のみ | 全 Worker | 障害は「ユーザー報告」でしか始まらない。Incident の 90% は検知が先 | High |
| P-3 | **単一ロール**（`AdminRole = "owner"`）。Access のメンバー = 全権限 | `packages/admin-contracts/src/core.ts:68`, `identity.ts` | 2 人目の運営を入れた瞬間に「通報の削除操作」まで全員に開く | Medium（今は 1 人） |
| P-4 | `ticket_assignees` が **Access identity と紐づかない**（`saveMaster` の `self` は `actor.id` を入れるが、それ以外は自由文字列） | `ticket-service.ts:719` | 「誰に割り当てたか」と「誰が操作したか」が別の名前空間 | Medium |
| P-5 | `audit_logs` と `ticket_events` の **二重化**。Ticket 経由の操作は events に、legacy 操作は audit_logs に。Activity 画面は audit_logs を読む | `db/audit.ts`, `ticket-service.ts` | 「誰が・いつ・何を」は追えるが、**二つの表を見ないと全部は分からない** | Medium |
| P-6 | 監査ログの **actor が `sub`（Access の opaque id）のみ**。email は `admin.authenticated` ログにしか無い | `identity.ts`（設計意図: 永久保存に address を置かない） | 数年後に sub → 人 の対応表が無いと誰か分からない | Low（対応表 = `ticket_assignees` に sub を持たせれば解決。P-4 と同じ修正） |
| P-7 | `apps/api` → Core の **お問い合わせ複製が best-effort**（通報は outbox） | `admin-bridge.ts` | Core 停止中のお問い合わせはメールにだけ残り、Ticket にならない。`mail-ingress` 経由の返信で拾える場合もあるが、アプリからの「返信不要」問い合わせは失われる | Medium |
| P-8 | **Customer entity が無い** | schema | 同じ人の複数 Ticket・複数アプリ横断・ブロック履歴が email 一致でしか結べない。通報者は `reporter_ref_hash`（アプリ申告の仮名）で、メールとは結べない設計 | Low（意図的。§4 で最小案） |
| P-9 | docs の分散: `README.md`（ルート）・`apps/admin-core/README.md`・`docs/operations-tickets.md`・`docs/admin-report-workflow.md` に **同じ deploy 順序が 3 回** 書かれている。`admin-core/README.md` の「What is already provisioned」は `ACCESS_AUD` 未設定時の記述のまま（現在は設定済み） | docs | 新しい人が最初に読むものが決まらない | Low |
| P-10 | `docs/operations-tickets.md` は英語、`admin-report-workflow.md` は日本語、UI は日本語 | docs | 一貫性 | Low |
| P-12 | `npx biome ci .` が HEAD でも 10 件の `lint/style/noNonNullAssertion` で赤（`report-threading.ts`, `reports.test.ts`, `report-mail-ingress.test.ts`）。`ci.yml` は biome を走らせていない（path filter に `biome.json` はあるが実行ステップが無い）ので気づかない | `biome.json`, `ci.yml` | ローカルの `pnpm run ci` が最初の `biome ci` で必ず落ちる | Low（`!` を `?? throw` に直すか、テストだけルールを緩める） |
| P-11 | `package.json` の `"ci"` スクリプトは pnpm 11 の組込み `pnpm ci`（clean-install）に **隠される**。`pnpm ci` と打つと検査は走らず `pnpm install` 相当になる | `package.json` | 「全部通した」つもりで何も検査していない | Low（`pnpm run ci` を使う。スクリプト名を `verify` 等に変えるのが確実） |

---

## 4. Proposed Domain Model

現行モデルを **壊さず** に足す。既存 Ticket Core の判断（UUID + 連番、append-only events、楽観ロック、resolution 必須、hard-delete 無し）はそのまま。

```
apps ──────────────── services ──── service_components
  │                        │
  │                        ├──── monitors            ← 新: URL / 種別 / 間隔 / 期待値
  │                        │        └── monitor_checks  ← 新: 1 回の結果（status, latency, at）※ 30 日で prune
  │                        │
  │                        └──── incidents           ← 新: tickets(type=INCIDENT) と 1:1
  │                                 ├── incident_updates   ← 新: 時系列の公開/内部更新（status, body, at, actor）
  │                                 ├── incident_components ← 新: 影響コンポーネントと impact
  │                                 └── incident_postmortem ← 新: 1:0..1（timeline, root cause, actions[]）
  │
  ├── tickets ──┬── ticket_messages
  │             ├── ticket_events        ← 監査の正本（§8 で audit_logs を統合）
  │             ├── ticket_relations     ← 既存。CHILD = 「この報告はこの障害の一部」
  │             ├── ticket_reports → reports（legacy 入口、証跡）
  │             └── customers?           ← 任意: email 正規化 + 通報者ハッシュの alias 表（§4.2）
  │
  ├── releases   ← 新: app × version × build × channel(testflight/appstore/web) × released_at × notes_url
  └── deployments ← 新: worker name × version id × commit × deployed_at × actor（deploy.yml から POST）
```

### 4.1 なぜ `incidents` を `tickets` から分けるか

Ticket は「1 人の要求に 1 つの結論を返す」単位。Incident は「複数の要求の原因で、時間とともに状態が変わる」単位。列（`impact` 範囲、`started_at` / `detected_at` / `mitigated_at` / `resolved_at`、更新履歴、事後分析）が Ticket と噛み合わない。**`tickets.type='INCIDENT'` は残し、`incidents.ticket_id` で 1:1 に結ぶ**ことで、キュー・SLA・関連付け・統合はそのまま Ticket の機能を使い、Incident 固有の列だけ別表に置く。既存の `INCIDENT` 型 Ticket は migration で `incidents` 行を生成できる（今は 0 件と推定）。

### 4.2 Customer の最小案（任意）

`customers(id, email_normalized UNIQUE, display_name?, created_at)` と `customer_aliases(customer_id, kind('email'|'reporter_hash'|'author_hash'), value, app_id)`。Ticket 側は `requester_email` を残したまま `customer_id` を **nullable で追加**。結びつけは「同一 email」と「運営が手動で結ぶ」の 2 経路だけ。仮名ハッシュと email を **自動では結ばない**（通報者の匿名性はプロダクト仕様）。

---

## 5. Ticket Design

現行で十分。変更提案は 3 点のみ。

1. **`ticket_assignees.identity_id`（nullable）** を追加し、Access の `sub` を持てるようにする。`saveMaster(self)` は既にそれを入れているので、あとは UI で「自分を担当にする」を出すだけ。P-4/P-6 の解。
2. **SLA は Core 側で計算済み**（`ticket-service.ts:38-58` の `sla_state` = BREACHED / AT_RISK / OK を SELECT 内で算出、`dashboard()` が `slaRisk` 件数と attention キューを返す）。変更不要。Incident 導入時に「Incident に紐づく子 Ticket の SLA は親で止める」かどうかだけ決める。
3. **自動クローズは入れない**（docs の判断どおり）。代わりに `next_action_at` 超過を Dashboard の先頭に。

---

## 6. Incident Design

### 6.1 ライフサイクル

```
DETECTED ──▶ INVESTIGATING ──▶ IDENTIFIED ──▶ MITIGATED ──▶ RESOLVED ──▶ (POSTMORTEM_DONE)
    ▲              │
    └── MONITORING ┘   （再発監視。RESOLVED の手前で任意）
```

Ticket 側の status には写像する: DETECTED/INVESTIGATING = IN_PROGRESS、MITIGATED = WAITING_INTERNAL、RESOLVED = RESOLVED(resolution=FIXED)。Incident の status が正本で、Ticket の status は派生（trigger か service で同期）。

### 6.2 User Report → Incident の流れ（指示書の例）

```
通報/問い合わせ ×N ─▶ 各 Ticket (INQUIRY/BUG)
   運営が「共通障害」と判断 ─▶ POST /api/incidents（既存 Ticket を CHILD として一括関連付け）
   ─▶ incident_updates に「調査中」（内部）
   ─▶ 原因特定 → 更新
   ─▶ 復旧 → 子 Ticket に一括で公開返信テンプレ（既存 reply-service を Ticket ごとに呼ぶ。1 通ずつ冪等）
   ─▶ 事後分析 → incident_postmortem（timeline は incident_updates から自動生成、root cause / actions は人が書く）
```

### 6.3 テーブル

```sql
CREATE TABLE incidents (
  id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL UNIQUE REFERENCES tickets(id),
  status TEXT NOT NULL CHECK(status IN ('DETECTED','INVESTIGATING','IDENTIFIED','MITIGATED','MONITORING','RESOLVED')),
  severity TEXT NOT NULL CHECK(severity IN ('SEV1','SEV2','SEV3')),
  detected_by TEXT NOT NULL CHECK(detected_by IN ('monitor','user_report','operator')),
  started_at TEXT, detected_at TEXT NOT NULL, mitigated_at TEXT, resolved_at TEXT,
  public_summary TEXT, revision INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE incident_updates (
  id TEXT PRIMARY KEY, incident_id TEXT NOT NULL REFERENCES incidents(id),
  status TEXT NOT NULL, visibility TEXT NOT NULL CHECK(visibility IN ('PUBLIC','INTERNAL')),
  body TEXT NOT NULL, actor_id TEXT, created_at TEXT NOT NULL
);
CREATE TABLE incident_components (
  incident_id TEXT NOT NULL REFERENCES incidents(id), component_id TEXT NOT NULL REFERENCES service_components(id),
  impact TEXT NOT NULL CHECK(impact IN ('DOWN','DEGRADED','MAINTENANCE')), PRIMARY KEY(incident_id, component_id)
);
CREATE TABLE incident_postmortems (
  incident_id TEXT PRIMARY KEY REFERENCES incidents(id),
  root_cause TEXT, contributing_factors TEXT, detection_gap TEXT, actions_json TEXT NOT NULL DEFAULT '[]',
  written_by TEXT, written_at TEXT
);
```

`incident_updates` の `PUBLIC` 行は、将来 `status.tmkch.io` を作るときの唯一のデータ源にする（今は作らない）。

### 6.4 やらないこと

オンコール、エスカレーション、SLA の営業日計算、自動 Incident 生成（監視が 2 回連続で失敗したら **候補** を出すまで。作るのは人）。

---

## 7. Monitoring Integration

「巨大な Observability Platform を作らない」前提での最小構成。

| 信号 | 取り方 | 置き場 |
|---|---|---|
| Site status（7 サイト） | Cloudflare **Health Checks**（ダッシュボード、無料枠）または Core の Cron が 5 分毎に `HEAD /` | `monitor_checks` |
| API status | `GET api.tmkch.io/api/v1/health` を同上 | 同 |
| App backend status | Remeet の manifest URL（`/remeet/v1/moderation/manifest.json`）の 200 + 署名期限（api の日次 cron が既にメールで警告） | 同 + 既存 |
| Error count | Cloudflare **Workers Logs** の `admin_core.error` / `admin_bridge.failed` / `request.failed`（構造化ログは既にある）。Logpush は有料なので、Core の Cron が **GraphQL Analytics API** で 1 時間分の 5xx 件数を取る | `monitor_checks(kind='errors')` |
| User reports | Ticket の作成数（type 別、1 時間窓） | 既存 `tickets` を集計 |
| Deploy / Release | `deploy.yml` の最後に `POST /internal/deployments`（Core に Service Binding は無いので、**api 経由**か、GitHub OIDC → Cloudflare API token で D1 に直接 INSERT）。Release は App Store Connect MCP（`asc_release_sync`）の結果を手で入れる | `deployments`, `releases` |

**Dashboard に出すのは 4 枚だけ**: (1) 直近 24h の monitor 失敗、(2) 未 ACK Ticket と SLA risk、(3) 進行中 Incident、(4) 直近 7 日の deploy。これで「Incident の兆候 = monitor 失敗 + 同時刻の Ticket 増加 + 直前の deploy」が 1 画面で見える。

実装場所: `apps/admin-core` に `scheduled()` を追加（今は `fetch` + RPC のみ）。監視対象 URL は `monitors` テーブルで管理し、UI は Settings に 1 タブ。

---

## 8. Audit Log

### 8.1 現状

- `audit_logs`（legacy: reports / support / apps / templates / masters）と `ticket_events`（Ticket: STATUS_CHANGED, PRIORITY_CHANGED, DETAILS_CHANGED with `{field, from, to}`, MERGED, RELATION_ADDED, INTERNAL_NOTE_ADDED, REOPENED, MESSAGE_*）。
- 両方とも **変更と同じ batch** で書かれ、削除 API は無い。
- actor: `ActorRef { type: 'admin'|'system'|…, id: sub }`。
- UI: `ActivityList`（`/api/activity`）= audit_logs のみ。Ticket 詳細の timeline = ticket_events + messages。

### 8.2 提案

1. **`ticket_events` を正本にし、`audit_logs` は「Ticket 以外の対象」専用**と定義を明文化する（今は暗黙）。Activity 画面は両方を UNION して時刻順に出す（読み取りだけの変更）。
2. **actor の解決表**: `admin_identities(sub PRIMARY KEY, email, display_name, first_seen_at, last_seen_at)` を Core に持ち、`resolveIdentity` 成功時に upsert（email は Access 側が消えても残る）。監査行の `actor_id` はそのまま `sub`。
3. **保持**: 無期限（現状どおり）。`monitor_checks` だけ 30 日 prune。
4. **改ざん検知は入れない**（D1 は運営者 1 人が root。ハッシュチェーンはコストに見合わない）。代わりに **D1 の Time Travel**（30 日）を運用手順に書く。
5. `ticket_events.metadata` に `from/to` が入るのは `change()` の 6 フィールドと priority だけ。`saveMaster` は `{kind}` のみで **前後の値が無い**（`ticket-service.ts:786`）→ from/to を足す。

---

## 9. Authorization

### 9.1 現状

`AdminRole = "owner"` の 1 種。Access ポリシー「アカウントメンバー」= 全権。

### 9.2 提案（2 人目が入る前に）

| Role | 読む | Ticket 更新 / 返信 | 通報の削除操作（署名） | マスタ / 設定 | Apps / Releases |
|---|---|---|---|---|---|
| owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅（アプリ削除除く） |
| support | ✅ | ✅ | ❌ | ❌ | ❌ |
| viewer | ✅（証跡画像は ❌） | ❌ | ❌ | ❌ | ❌ |

実装の最小形:
- Role の **正本は Core の `admin_identities.role`**（Access のグループ claim に依存しない。IdP を変えても残る）。初期値は owner の sub だけ手で INSERT。未登録の sub は `viewer`。
- `identity.ts` は `role` を Core から引く（1 RPC、`/api/session` で既に identity を返している）。
- チェックは **Core の各 service メソッド入口**（`ActorRef` に `role` を足す）。Web 側のルート単位ではなく Core 側で拒否する — Web は「ボタンを出すか」だけ判断。
- `AdminRole` は union に拡張するだけ（コメントに「この行と checks だけ変える」とあるとおり）。

---

## 10. Security

管理画面として重点確認。**全体として良い**。指摘は運用寄り。

| 項目 | 状態 | 指摘 |
|---|---|---|
| Authentication | Access + Worker 側 JWT 再検証（aud/iss/exp/署名）。workers.dev 無効 | ✅ |
| Session | Access cookie（Worker は状態を持たない）。ログアウトは Access 側 | ✅ |
| CSRF | Origin 一致 + JSON 限定 + CORS ヘッダ無し | ✅ |
| XSS | CSP `script-src 'self'`。React。`apps/admin-web/src/client` に `dangerouslySetInnerHTML` / `innerHTML` は **無い**（確認済み）。受信メールは `body_text`（テキスト）として表示され、HTML は描画しない | ✅ |
| Injection | D1 prepared statement。`change()` の `UPDATE tickets SET ${keys}` は **キー名がスキーマ由来のホワイトリスト**（`ticketChangeSchema` を通った field 名のみ）なので安全 | ✅ |
| IDOR | 単一テナント。証跡は Access 越しに Worker が R2 を読む。署名 URL 無し | ✅ |
| RBAC | 単一ロール | §9 |
| Rate limit | 公開 API 6 経路に binding。Admin API は Access 越しなので無し（許容） | ✅ |
| Turnstile | Web フォームのみ。`action` / hostname 検査は `turnstile.ts`（251 行のテストあり） | ✅ |
| Admin route | `/api/*` も静的アセットも同じゲート | ✅ |
| API authorization | Core は Service Binding のみ。`RemeetModeration` entrypoint も同様 | ✅ |
| Secret handling | `wrangler secret`。`ACCESS_AUD` / `ADMIN_ORIGIN` は vars（非秘密で正しい）。**`HASH_PEPPER` はローテーション不能**（README 記載済み） | ✅ |
| 署名鍵 | Mac の Keychain。Worker は公開鍵のみ。manifest 期限切れは日次メール | ✅ |
| Audit | §8 | △ |
| メール受信 | `mail-ingress` は Email Routing からのみ起動。`apps/mail-ingress/src/*.ts` は `Authentication-Results` / DKIM / SPF を **読んでいない**（確認済み）。`from` 偽装は可能で、**受信メールで Ticket の状態が変わる**（WAITING_CUSTOMER → IN_PROGRESS、RESOLVED/CLOSED → 再開、`ticket_message_insert` トリガ）ので、偽装メールで Ticket を再開できる | Medium: `message.headers.get("Authentication-Results")` を見て `dkim=pass`/`spf=pass` 以外は `support_messages` に「未検証」を付け、トリガの再開条件から外す |
| 依存 | `hono`, `zod`, `resend`, `postal-mime`（推定）。Dependabot 設定は `.github/` に無い | Low: `dependabot.yml` |
| ログ | `admin.authenticated` に email。`admin_bridge.failed` は content を出さない | ✅ |
| バックアップ | `docs/operations-tickets.md` に「private export」の手順。**定期化されていない** | Medium: 週次で `wrangler d1 export` を GitHub Actions（OIDC）から private R2 へ |

**事故シナリオ 1（メール偽装で再開）**: 攻撃者が `From:` を顧客に偽装して `support@` に送る → `ticket_message_insert` トリガで CLOSED Ticket が IN_PROGRESS に戻り、運営が偽メッセージに返信する → 顧客の本物のアドレスに運営の返信が届く（漏洩は限定的、混乱が主）。対策は上記フラグ + 未検証メッセージは自動再開しない。

**事故シナリオ 2（Core 停止中の問い合わせ消失）**: P-7。メール転送は生きているので運営は読める。対策: support も outbox 化（reports と同じ表を使う）。

---

## 11. MCP / Agent Integration

### 11.1 前提

Admin は Access の裏。MCP サーバを置くなら **Core に新しい entrypoint** を足し、認証は **Access の Service Token**（`CF-Access-Client-Id/Secret`）で `admin.tmkch.io/mcp` を通す。Agent = 1 つの identity として `admin_identities` に登録し、role は `viewer` から始める。

### 11.2 Tool

| Tool | Role | 内容 | 備考 |
|---|---|---|---|
| `get_open_tickets(type?, service?, limit)` | viewer | 未 ACK / SLA risk を先頭に | `GET /api/tickets` と同じ read model。本文は返さない（一覧 API がそうしている） |
| `get_ticket(id)` | viewer | timeline 付き | メール本文を含む → viewer でも証跡画像は返さない |
| `summarize_ticket(id)` | viewer | LLM 要約 | **Core は LLM を呼ばない**。tool は timeline を返し、要約は Agent 側 |
| `get_incidents(status?)` | viewer | 進行中 Incident と updates | §6 |
| `get_app_status()` | viewer | monitors の最新 + 直近 deploy | §7 |
| `get_recent_reports(days)` | viewer | 件数と reason 分布。**通報本文・証跡は返さない** | プライバシー |
| `add_internal_note(ticket_id, body)` | support | 内部メモ（mail provider 無し） | 書き込み系で最初に許す唯一のもの。`is_automatic=1` + actor=agent を必ず刻む |
| `draft_reply(ticket_id, body)` | support | **下書き保存のみ**。送信は人 | `support_drafts` は既存 |
| `propose_incident(ticket_ids[], summary)` | support | Incident **候補** を作る（status=DETECTED, updates に「AI 提案」） | 人が承認するまで Ticket との関連付けは行わない |

**絶対に tool にしないもの**: 返信送信、通報の削除/クローズ（署名が要る設計なので物理的にも不可能）、Ticket のクローズ、マスタ変更、証跡の取得。

### 11.3 監査

Agent の呼び出しは `ticket_events` / `audit_logs` に `actor_type='agent'`（`AuditActorType` に追加）で残す。読み取りも `audit_logs` に **1 日 1 行の集計**（何を何回読んだか）を残す — 読み取りログを全件残すと表が肥大するため。

---

## 12. Migration Strategy

すべて **additive**（`docs/operations-tickets.md` の Rollout と同じ思想）。

| Step | 変更 | ロールバック |
|---|---|---|
| M-1 | `0009_admin_identities.sql`: `admin_identities`、`ticket_assignees.identity_id`。`resolveIdentity` で upsert | 表を放置しても既存動作に影響なし |
| M-2 | `0010_incidents.sql`: §6.3 の 4 表。`tickets.type='INCIDENT'` から backfill（今は 0 件想定） | 同上 |
| M-3 | `0011_monitoring.sql`: `monitors`, `monitor_checks`, `deployments`, `releases`。Core に `scheduled()` | cron を外せば止まる |
| M-4 | Role: `admin_identities.role` を読む。全 sub の初期値 owner（現在の運営者のみ） | `role` 列を無視すれば旧動作 |
| M-5 | Activity 画面の UNION、`saveMaster` の from/to | 読み取り変更のみ |
| M-6 | `support` の outbox 化（`admin-bridge.ts`） | 既存 best-effort に戻せる |
| M-7 | mail-ingress の認証結果フラグ + 未検証メールの自動再開停止 | トリガ条件を戻す |
| M-8 | MCP entrypoint（viewer tool のみ） | route を外す |

各 Step は 1 PR。M-1〜M-3 は D1 migration を伴うので、既存手順（export → migrate → Core → Web）で。

---

## 13. Implementation Roadmap

| 順 | 項目 | 理由 | 規模 |
|---|---|---|---|
| 1 | **バックアップの定期化**（§10） | 今すぐ・コード変更ほぼ無し | S |
| 2 | M-1 identity 表 + assignee 紐づけ | Role・監査・MCP の前提 | S |
| 3 | M-7 mail-ingress 偽装対策 | 唯一の「外から状態を変えられる」経路 | S |
| 4 | M-6 support outbox | データ消失の可能性を消す | S |
| 5 | M-3 監視（health チェック + deployments 記録）+ Dashboard 4 枚 | Incident を「検知」から始められるようにする | M |
| 6 | M-2 Incident | 監視があって初めて意味を持つ | M |
| 7 | M-4 Role | 2 人目が入るとき。それまでは表だけ | S |
| 8 | M-5 監査の統合表示 | 任意 | S |
| 9 | M-8 MCP（読み取り） | 上記が揃ってから | M |
| 10 | docs 整理（P-9/P-10）: `docs/ARCHITECTURE.md` / `OPERATIONS.md` / `SECURITY.md` に集約し、3 か所の deploy 手順を 1 か所へ | 指示書 05 と同時に | S |

---

## 付録 A. 確認して問題なしとしたこと

- Admin Web は Access 未設定時に全リクエスト 401（fail-closed）。本番 vars は設定済み。
- `requireSafeMutation` は identity 解決の **後** に走るため、サインイン済みでも Origin 不一致は 403。
- `ticket_messages` の CHECK（INTERNAL は recipient NULL）と notes サービスが mail provider を持たないことで、内部メモがメールで出る経路が無い。
- 通報の削除は「Core が操作案を作る → Mac が署名 → api が検証して公開 → 成功後に Core が状態更新」。Worker 侵害では削除指示を作れない。
- `reports.external_report_id` UNIQUE、`support_reply_sends.idempotency_key`、`tickets.mutation_id` で再送・二重送信・同時更新がそれぞれ止まる。
- 証跡（R2）は private、public URL 無し、`expired_at` で期限管理。
- Deploy は CI 成功後のみ、Core → Web/ingress の順序固定、`CLOUDFLARE_DEPLOY_ENABLED` で無効化可能。
- 公開 API の 6 経路すべてに Cloudflare Rate Limiting binding。

## 付録 B. 未確認（運用側でしか分からないもの）

- `admin_core.error` / `admin_bridge.failed` ログの Cloudflare 側の保持期間と、誰がいつ見ているか（Workers Logs の既定は 3 日・有料で延長）。
- Access ポリシーの実際の設定（「アカウントメンバー限定」か、特定メールか）。

## 付録 C. クロスレビュー（2026-09-21）

- `docs/ARCHITECTURE.md`（新規）は本監査 §1 と同じ図。`operations-tickets.md` の Rollout / Integrity / API と矛盾なし。
- `pnpm ci` は pnpm 11 の組込み clean-install で `package.json` の `ci` スクリプトを隠す（P-11 として追記）。docs は全て `pnpm run ci` に統一した。
- `TESTING.md` の Critical test areas は本監査 §10 の「良い点」と同じ順序（認証 → 署名 → 冪等 → 監査 → merge）。`audit-trail.test.ts` を追加して §8 の前提（全変更に actor）を横断で固定し、§8-5（`saveMaster` の from/to）は `it.fails` で契約だけ先に置いた。
- `SECURITY.md` の既知課題は §10 の指摘（偽装 From、単一ロール、best-effort 複製、手動バックアップ）と一致。
- `RELEASE.md` の migration 手順は `admin-report-workflow.md` 反映順序（api migration → api → Core migration → Core → Web → アプリ配布）を一般化したもので、§12 の M-1〜M-8 も同じ順序で適用できる。
- Incident（§6）・監視（§7）・Role（§9）・MCP（§11）は全て additive で、現行の Ticket Core・Access・Service Binding を変えずに載る。
