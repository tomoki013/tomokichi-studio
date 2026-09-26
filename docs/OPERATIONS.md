# Operations

最終更新: 2026-09-26。この Repository（ブランドサイトと `tomokichi-api`）の運用の入口。問い合わせ・通報・管理画面（admin.tmkch.io）の運用、Ticket の規則、Core D1 のバックアップ・復元、障害対応は [inquiry-platform](https://github.com/tomoki013/inquiry-platform) の `docs/operations/` が正本。

## Deploy

[RELEASE.md](RELEASE.md)。自動（CI 成功後）と、migration を伴う手動順序。

## Monitoring

現状、**自動監視は無い**（監査 §7 で `monitors` 表と Cron を提案）。人が見るもの:

| 見るもの | どこ | 頻度 |
|---|---|---|
| 未対応 Ticket・通報 | `admin.tmkch.io`（運用は inquiry-platform 側） | 日次 |
| Worker のエラー | Cloudflare → Workers & Pages → 各 Worker → Logs。検索語: `admin_bridge.failed`, `admin_bridge.support_rejected`, `admin_bridge.report_rejected`, `request.failed` | 週次、障害時 |
| API 疎通 | `curl https://api.tmkch.io/api/v1/health` → `{"ok":true}` | 障害時 |
| manifest 期限 | 30 日前から日次メール（api の cron `17 3 * * *`） | 届いたら |
| 通報 outbox の滞留 | api cron `*/5 * * * *` が再送。滞留は Logs の `admin_bridge.failed` | 週次 |
| Deploy | GitHub Actions Deploy の履歴、`wrangler versions list` | リリース時 |

## Logging

- 全 Worker `observability.enabled`。構造化 JSON。本文・アドレス・IP は書かない（[SECURITY.md](SECURITY.md)）。
- 基盤への受け渡しの失敗は `admin_bridge.*`（`code` は基盤のエラー語彙。`FORBIDDEN` なら `INQUIRY` binding の `props.projects` に漏れ）。

## Backup

- **Core D1**（問い合わせ・通報）: inquiry-platform 側。
- **api D1**: 同様に `wrangler d1 export`（招待・通報・モデレーション決定）。
- **R2**: 証跡は `expired_at` で消える設計。バックアップしない。
- **署名鍵**: Mac の Keychain。失っても新鍵でローテーション可能（Remeet 側で 2 鍵ビルド）。
- **Cloudflare 設定**（Rate Limiting、Turnstile widget）: ダッシュボードのみ。README の Support form 節で再現できる。Access・Email Routing は inquiry-platform `apps/api/README.md`。

## Incident

障害の記録は管理画面で `type=INCIDENT` の Ticket を作る（inquiry-platform `docs/operations/tickets.md`）。

| 症状 | 最初に疑う | 手順 |
|---|---|---|
| 管理画面が開かない / 500 | 基盤側 | inquiry-platform `docs/operations/` |
| 通報が届かない | api → 基盤の outbox、`INQUIRY` binding | Logs `admin_bridge.failed` / `admin_bridge.report_rejected`、5 分待つ、R2 の `report-outbox/` |
| 問い合わせが 502 | 基盤に届かない / 拒否された | Logs `admin_bridge.unavailable` / `admin_bridge.support_rejected` の `code` |
| アプリからの問い合わせが 403 | `SUPPORT_CLIENT_KEY` をアプリより先に設定した | secret を削除して未強制に戻す |
| 返信メール・受信メールの不具合 | 基盤側 | inquiry-platform `docs/operations/` |
| Remeet で削除が反映されない | manifest の期限切れ / 署名サービス停止 | `curl …/remeet/v1/moderation/manifest.json` の `expiresAt`、Mac の LaunchAgent |
| 招待リンクが解決しない | api の rate limit / D1 | Logs、`REMEET_INVITE_*_LIMITER` |
| CI は緑なのに deploy されない | `CLOUDFLARE_DEPLOY_ENABLED` / artifact / `workflow_run` は push のみ | Actions → Deploy の `affected` job |

## Restore

- Ticket・通報・Core D1 の復元は inquiry-platform 側。
- 通報の「対応なし」を取り消す: 新しい決定を署名して公開（revision が上がる）。

## Troubleshooting（運営 Mac）

- 署名サービス: `~/Library/LaunchAgents/io.tmkch.remeet-moderation-signer.plist`。手動起動は `pnpm --filter @tomokichi/api moderation serve`（常駐と二重起動しない）。ログ `~/Library/Logs/RemeetModeration/`。
- Turnstile widget の作成、secret の設定: README の Support form 節。
- `pnpm -w cf whoami` で token の scope を確認。
