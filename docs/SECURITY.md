# Security

最終更新: 2026-09-26。秘密の値は書かない。問い合わせ・通報基盤（admin.tmkch.io、Core、mail-ingress、Access、通知、監査ログ）のセキュリティは [inquiry-platform](https://github.com/tomoki013/inquiry-platform) `docs/security/overview.md` が正本。ここはこの Repository（ブランドサイトと `tomokichi-api`）の分。

## Threat surface

| 面 | 入口 | 守っているもの（コードで確認） |
|---|---|---|
| ブランドサイト | 静的アセット | 攻撃面なし。`seoAssets()` の robots / sitemap |
| `POST /api/v1/support` | 誰でも（Web / アプリ） | Turnstile（Web、`action` + hostname）/ `X-Support-Client`（アプリ、定数時間比較、未設定なら未強制）、honeypot、20KB 上限、Cloudflare Rate Limiting（IP）、CORS は許可 origin のみ |
| `/remeet/v1/invites*` | Remeet アプリ | `X-Remeet-Client`、経路ごとの Rate Limiting（create / resolve / code / revoke）、cron で期限切れを掃除 |
| `/remeet/v1/reports` | Remeet アプリ | `X-Remeet-Client`、Rate Limiting、`external_report_id` で冪等、証跡は R2 |
| `/remeet/v1/moderation/manifest.json` | 誰でも（読み取り） | Ed25519 署名。**署名は運営 Mac、Worker は検証・公開のみ** |
| `INQUIRY` binding（api → 基盤） | この Worker のみ | 基盤の `Intake` entrypoint（登録のみ、読み取りなし）。`props.projects` でこの Worker が登録できる Project を固定。`AdminCore` には bind しない（`src/inquiry-binding.test.ts`） |
| 運営 Mac の署名サービス | `127.0.0.1:47831` | `https://admin.tmkch.io` の Origin のみ許可、ローカルネットワーク |
| CI / Deploy | GitHub Actions | `CLOUDFLARE_API_TOKEN` は repository secret。deploy は CI 成功後の `workflow_run` のみ、`CLOUDFLARE_DEPLOY_ENABLED` で停止可 |

## Secret handling

- リポジトリに秘密は無い。`.dev.vars` は gitignore（`.dev.vars.example` のみ）。
- Worker secrets は `wrangler secret put`。一覧は [DEVELOPMENT.md](DEVELOPMENT.md) Environment。
- **モデレーションの秘密鍵は Mac の Keychain だけ**（service `remeet-moderation` / `-dev`）。公開鍵は Remeet の `project.yml`。Worker・CI・D1 のどこにも無い。ローテーションは Remeet 側で新旧 2 鍵を積んだビルドを出してから。
- `SUPPORT_CLIENT_KEY` / `REMEET_INVITE_CLIENT_KEY` はアプリのバイナリに入る「フィルタ」。**アプリを先に更新してから API に設定**（README Support form）。

## Authentication / Authorization

- 公開 API に利用者認証は無い（意図的。アプリは client key、Web は Turnstile）。
- 参加者側（通報者・問い合わせ者）は自分の Ticket を **読めない**（公開 read API は無い。受付の成否だけ返す）。この Worker 自身も基盤の Ticket を読めない（`Intake` に読み取りメソッドが無い）。
- 運営の認証・権限（Access、viewer / operator / admin）は基盤側。

## Data protection

| データ | 場所 | 扱い |
|---|---|---|
| お問い合わせ（名前・メール・本文） | この Worker は保存しない。基盤へそのまま渡す | 基盤の扱いは inquiry-platform `docs/security/overview.md` |
| 通報（対象本文・画像・理由・ID） | api D1 + R2（outbox）→ 基盤 | 生の ID は基盤側で `HASH_PEPPER` により仮名化されて保存。R2 の証跡は lifecycle で 30 日 |
| 招待トークン | api D1 | 期限付き。cron で掃除。参加後は失効 |

## Encryption

- 通信: HTTPS（Cloudflare）。Service Binding は Cloudflare 内部。
- 保存: D1 / R2 の暗号化は Cloudflare 既定。
- 署名: Ed25519（manifest）。ハッシュ: SHA-256 + pepper（仮名）。

## Logging policy

- 構造化 JSON（`console.log(JSON.stringify({ event, … }))`）。`admin_bridge.failed` / `admin_bridge.support_rejected` / `admin_bridge.report_rejected` / `request.failed`。
- **本文・件名・メールアドレス・IP を書かない**。基盤から返ったエラーもコードだけを書く。
- Workers Logs の保持は Cloudflare 既定。長期保存は無い。

## User content

- 通報された本文・画像は「運営が見て判断するため」だけに基盤へ渡す。この Worker からメールで送らない。

## Reporting process

- 利用者: 各サイトの `/support`、`support@tmkch.io`、アプリ内フォーム。
- 脆弱性: 同じ窓口。bug bounty は無い。
- 受け取ったら管理画面で Ticket（type=PRIVACY / BUG / INCIDENT）として扱う（inquiry-platform `docs/operations/tickets.md`）。

## 既知の課題

- api D1 のバックアップが手動。
- Dependabot 未設定。
- 基盤側の課題（受信メールの DKIM/SPF 未検証など）は inquiry-platform `docs/security/overview.md`。
