# Operations

最終更新: 2026-09-21。日々の運用の入口。Ticket の運用ルールは `operations-tickets.md`、通報の流れは `admin-report-workflow.md` が正本で、ここは「どこを見るか」。

## Deploy

[RELEASE.md](RELEASE.md)。自動（CI 成功後）と、migration を伴う手動順序。

## Monitoring

現状、**自動監視は無い**（監査 §7 で `monitors` 表と Cron を提案）。人が見るもの:

| 見るもの | どこ | 頻度 |
|---|---|---|
| 未対応 Ticket、SLA risk、期限超過 | `admin.tmkch.io` Dashboard（`/api/tickets/dashboard`: open / unacknowledged / urgent / slaRisk / overdue / waitingCustomer） | 日次 |
| 通報 | Tickets の 通報 ビュー | 日次 |
| Worker のエラー | Cloudflare → Workers & Pages → 各 Worker → Logs。検索語: `admin_core.error`, `admin_bridge.failed`, `request.failed`, `admin.unauthorized` | 週次、障害時 |
| API 疎通 | `curl https://api.tmkch.io/api/v1/health` → `{"ok":true}` | 障害時 |
| manifest 期限 | 30 日前から日次メール（api の cron `17 3 * * *`） | 届いたら |
| 通報 outbox の滞留 | api cron `*/5 * * * *` が再送。滞留は Logs の `admin_bridge.failed` | 週次 |
| Email Routing | Cloudflare → Email → Routing の配信ログ | メールが来ないとき |
| Deploy | GitHub Actions Deploy の履歴、`wrangler versions list` | リリース時 |

## Logging

- 全 Worker `observability.enabled`。構造化 JSON。本文・アドレス・IP は書かない（[SECURITY.md](SECURITY.md)）。
- Core の重要な失敗は `admin_core.error` に operation scope 付き。
- Ticket の変更は `ticket_events`、それ以外は `audit_logs`。Activity 画面は後者。

## Backup

- **Core D1**: `pnpm --filter @tomokichi/admin-core exec wrangler d1 export tomokichi-admin --remote --output <private path>`。migration の前に必ず。定期化は未実施（監査 §10 提案: 週次で private R2 へ）。
- **api D1**: 同様に `wrangler d1 export`（招待・通報・モデレーション決定）。
- **R2**: 証跡は `expired_at` で消える設計。バックアップしない。
- **署名鍵**: Mac の Keychain。失っても新鍵でローテーション可能（Remeet 側で 2 鍵ビルド）。
- **Cloudflare 設定**（Access アプリ、Email Routing、Rate Limiting、Turnstile widget）: ダッシュボードのみ。`admin-core/README.md` の手順で再現できる。

## Incident

`type=INCIDENT` の Ticket を作り、関連する問い合わせ Ticket を `CHILD` で結ぶ（`operations-tickets.md` Relations）。Incident 固有の列（状態、影響範囲、更新、事後分析）は未実装（監査 §6）。

| 症状 | 最初に疑う | 手順 |
|---|---|---|
| Admin が 401 | Access の設定変更、`ACCESS_AUD` の不一致 | Zero Trust → Applications で AUD を確認 → `admin-web/wrangler.jsonc` と一致させて deploy |
| Admin は開くが API が 500 | Core のエラー | Core の Logs `admin_core.error` |
| 通報が届かない | api → Core の outbox、`ADMIN_CORE` binding | Logs `admin_bridge.failed`、5 分待つ、api の D1 の outbox 表 |
| アプリからの問い合わせが 403 | `SUPPORT_CLIENT_KEY` をアプリより先に設定した | secret を削除して未強制に戻す |
| メールが届かない / 返信できない | Resend のキー、`MAIL_API_KEY`、Email Routing | Resend ダッシュボード、Core の secrets、Routing のログ |
| Remeet で削除が反映されない | manifest の期限切れ / 署名サービス停止 | `curl …/remeet/v1/moderation/manifest.json` の `expiresAt`、Mac の LaunchAgent |
| 招待リンクが解決しない | api の rate limit / D1 | Logs、`REMEET_INVITE_*_LIMITER` |
| CI は緑なのに deploy されない | `CLOUDFLARE_DEPLOY_ENABLED` / artifact / `workflow_run` は push のみ | Actions → Deploy の `affected` job |

## Restore

- Core D1 の復元は **forward fix を優先**（新しいメッセージが届いた後に古い export を戻すと消える。`operations-tickets.md` Deployment and recovery）。
- 統合してしまった Ticket: 元は残る（source Ticket は CLOSED/DUPLICATE、メッセージは source に残る）。取り消し API は無いので、target に内部メモで経緯を残す。
- 誤ってクローズ: reopen（IN_PROGRESS）。resolution は履歴に残る。
- 通報の「対応なし」を取り消す: 新しい決定を署名して公開（revision が上がる）。

## Troubleshooting（運営 Mac）

- 署名サービス: `~/Library/LaunchAgents/io.tmkch.remeet-moderation-signer.plist`。手動起動は `pnpm --filter @tomokichi/api moderation serve`（常駐と二重起動しない）。ログ `~/Library/Logs/RemeetModeration/`。
- Turnstile widget の作成、secret の設定: README の Support form 節。
- `pnpm -w cf whoami` で token の scope を確認。
