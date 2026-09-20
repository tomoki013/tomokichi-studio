# Security

最終更新: 2026-09-21。秘密の値は書かない。監査: `audit/tomokichi-studio-platform-audit.md` §10。

## Threat surface

| 面 | 入口 | 守っているもの（コードで確認） |
|---|---|---|
| ブランドサイト | 静的アセット | 攻撃面なし。`seoAssets()` の robots / sitemap |
| `POST /api/v1/support` | 誰でも（Web / アプリ） | Turnstile（Web、`action` + hostname）/ `X-Support-Client`（アプリ、定数時間比較、未設定なら未強制）、honeypot、20KB 上限、Cloudflare Rate Limiting（IP）、CORS は許可 origin のみ |
| `/remeet/v1/invites*` | Remeet アプリ | `X-Remeet-Client`、経路ごとの Rate Limiting（create / resolve / code / revoke）、cron で期限切れを掃除 |
| `/remeet/v1/reports` | Remeet アプリ | `X-Remeet-Client`、Rate Limiting、`external_report_id` で冪等、証跡は R2 |
| `/remeet/v1/moderation/manifest.json` | 誰でも（読み取り） | Ed25519 署名。**署名は運営 Mac、Worker は検証・公開のみ** |
| `admin.tmkch.io` | 運営 | Cloudflare Access（hostname）+ Worker で JWT 再検証（`worker/access.ts`: aud / iss / exp / 署名）+ Origin と JSON の変更ガード + CSP `script-src 'self'` + `X-Frame-Options DENY` + `no-store`。CORS ヘッダを一切出さない |
| `tomokichi-admin-core` | Service Binding のみ | route / workers.dev 無し。D1 / R2 を持つ唯一の Worker |
| `support@tmkch.io` | 誰でもメールを送れる | Email Routing → `mail-ingress`。サイズ上限、転送優先。**DKIM/SPF 結果を読まない**（監査 §10） |
| 運営 Mac の署名サービス | `127.0.0.1:47831` | `https://admin.tmkch.io` の Origin のみ許可、ローカルネットワーク |
| CI / Deploy | GitHub Actions | `CLOUDFLARE_API_TOKEN` は repository secret。deploy は CI 成功後の `workflow_run` のみ、`CLOUDFLARE_DEPLOY_ENABLED` で停止可 |

## Secret handling

- リポジトリに秘密は無い。`.dev.vars` は gitignore（`.dev.vars.example` のみ）。
- Worker secrets は `wrangler secret put`。一覧は [DEVELOPMENT.md](DEVELOPMENT.md) Environment。
- **`HASH_PEPPER`（Core）はローテーション不能**: 通報者・投稿者の仮名ハッシュがこれで作られ、変えると過去と繋がらない。
- **モデレーションの秘密鍵は Mac の Keychain だけ**（service `remeet-moderation` / `-dev`）。公開鍵は Remeet の `project.yml`。Worker・CI・D1 のどこにも無い。ローテーションは Remeet 側で新旧 2 鍵を積んだビルドを出してから。
- Access の `ACCESS_AUD` / team domain は vars（トークンの claim なので秘密ではない、と `admin-core/README.md` step 6）。
- `SUPPORT_CLIENT_KEY` / `REMEET_INVITE_CLIENT_KEY` はアプリのバイナリに入る「フィルタ」。**アプリを先に更新してから API に設定**（README Support form）。

## Authentication

- 運営: Cloudflare Access（Cloudflare IdP、アカウントメンバー限定）。Worker は JWT を再検証し `AdminIdentity { id: sub, email, role: "owner" }` に落とす。ログアウト・セッション期限は Access 側。
- `ENVIRONMENT=local && DEV_ADMIN_EMAIL` の bypass は本番 vars では成立しない。
- 公開 API に利用者認証は無い（意図的。アプリは client key、Web は Turnstile）。

## Authorization

- 単一ロール `owner`。運営が 1 人のため。2 人目の前に `admin_identities.role` を導入する計画（監査 §9）。
- Core の各 service は `ActorRef` を受け取り監査に刻むが、権限判定はしていない（全員 owner）。
- 参加者側（通報者・問い合わせ者）は自分の Ticket を **読めない**（公開 read API は無い。受付 ID だけ返す）。

## Data protection

| データ | 場所 | 扱い |
|---|---|---|
| お問い合わせ（名前・メール・本文） | Core D1 `support_threads` / `support_messages` + `tickets*` | Admin でのみ閲覧。メールは Resend 経由で運営にも届く |
| 通報（対象本文・画像・理由・通報者/投稿者の仮名ハッシュ） | api D1 + R2 → Core D1 + R2（private） | 証跡に `expired_at`。仮名は `HASH_PEPPER` で作り、元 ID は保存しない |
| 返信・下書き・テンプレ | Core D1 | 下書きは監査しない（`reply-service.ts` コメント: 書きかけの記録を残さない） |
| 監査ログ | `audit_logs` / `ticket_events` | actor は Access の `sub`（メールアドレスを永久保存しない）。削除 API 無し |
| 招待トークン | api D1 | 期限付き。cron で掃除。参加後は失効 |
| メール受信の生データ | `mail-ingress` → Core | 転送が優先、`MAX_STORED_BYTES` 超は解析しない |

保持期限: 通報証跡以外は無期限（未決定、`DECISIONS.md`）。バックアップは手動 export（監査 §10 で定期化を提案）。

## Encryption

- 通信: HTTPS（Cloudflare）。Service Binding は Cloudflare 内部。
- 保存: D1 / R2 の暗号化は Cloudflare 既定。
- 署名: Ed25519（manifest）。ハッシュ: SHA-256 + pepper（仮名）。

## Logging policy

- 構造化 JSON（`console.log(JSON.stringify({ event, … }))`）。`admin_core.error` / `admin_bridge.failed` / `admin.authenticated` / `admin.unauthorized`。
- **本文・件名・メールアドレス・IP を書かない**（`mail-ingress` のテスト `never writes the sender, subject or body to the log` が守る）。`admin.authenticated` の email だけが例外（運営自身）。
- Workers Logs の保持は Cloudflare 既定。長期保存は無い。

## User content

- 通報された本文・画像は「運営が見て判断するため」だけに保持。受付メールに含めない（`admin-report-workflow.md`）。
- 管理画面は本文を **テキスト**として描画（`dangerouslySetInnerHTML` 無し）。
- メール HTML は運営が送る側だけ生成（`packages/admin-mail/src/html.ts`）。

## Reporting process

- 利用者: 各サイトの `/support`、`support@tmkch.io`、アプリ内フォーム。
- 脆弱性: 同じ窓口。bug bounty は無い。
- 受け取ったら Ticket（type=PRIVACY / BUG / INCIDENT）として扱う（`operations-tickets.md`）。

## 既知の課題（監査より）

- 偽装 `From` の受信メールで CLOSED Ticket が再開する（DKIM/SPF を読んでいない）。
- 単一ロール。
- お問い合わせの Core 複製が best-effort（Core 停止中に消える）。
- D1 バックアップが手動。
- Dependabot 未設定。
