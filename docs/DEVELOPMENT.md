# Development

最終更新: 2026-09-21。ルート `README.md` と `apps/admin-core/README.md` に散っていた手順を 1 か所に。矛盾したらコードと `package.json` が正。

## Requirements

| もの | 版 | 出所 |
|---|---|---|
| Node | **24** | `mise.toml`（`package.json` `engines` は `24.x`） |
| pnpm | **11.11.0** | `mise.toml` / `packageManager` |
| mise | 推奨 | `mise install`。タスク: `mise run dev`（全アプリ + API）、`mise run create-app-site` |
| Turborepo | devDependency | `pnpm dev/build/check/test` は `turbo run` |
| Biome | devDependency | `pnpm fix` / `pnpm lint` / `pnpm format`（Prettier は使わない） |
| wrangler | **各アプリの devDependency**。ルートには無い | `pnpm -w cf …`（api を対象に実行）か `pnpm --filter <app> exec wrangler …` |
| Cloudflare アカウント | deploy する人だけ | `wrangler login`（Turnstile scope が要る。`pnpm -w cf whoami` で確認） |

## Setup

```bash
git clone <repo> tomokichi-studio && cd tomokichi-studio
mise install
pnpm install
pnpm run ci        # biome ci + check + test + build + check:links + check:seo（ローカル = CI の内容）
```

Admin をローカルで動かす（`apps/admin-core/README.md` Local development）:

```bash
pnpm admin:migrate:local
pnpm admin:seed > /tmp/seed.sql
pnpm --filter @tomokichi/admin-core exec wrangler d1 execute tomokichi-admin --local --file /tmp/seed.sql
# 3 つのターミナル
pnpm --filter @tomokichi/admin-core dev     # :8788
pnpm --filter @tomokichi/admin-web dev      # :4330 (Vite)
pnpm --filter @tomokichi/mail-ingress dev   # :8789
```

`apps/admin-web/.dev.vars` に `ENVIRONMENT=local` と `DEV_ADMIN_EMAIL=<you>` を置くと Access 無しでサインインできる（本番 vars は `production` なので効かない。`worker/identity.ts`）。

## Environment

| 場所 | 変数 | 種類 |
|---|---|---|
| `apps/api/wrangler.jsonc` | `MAIN_SITE_ORIGIN`, `MAIN_SITE_WORKERS_ORIGIN`, `SUPPORT_*_EMAIL`, cron `17 3 * * *`（招待掃除 + manifest 期限警告）と `*/5 * * * *`（通報 outbox） | vars |
| `apps/api` secrets | `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `SUPPORT_CLIENT_KEY`, `REMEET_INVITE_CLIENT_KEY`, … | `pnpm -w cf secret put <NAME>` |
| `apps/admin-web/wrangler.jsonc` | `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_ORIGIN`, `ENVIRONMENT` | vars（非秘密） |
| `apps/admin-core` secrets | `HASH_PEPPER`（**永久。変えると仮名が繋がらない**）, `MAIL_API_KEY`（無ければ送信ボタンだけ無効）, `SUPPORT_FORWARD_EMAIL`, `NOTIFICATION_EMAIL`（新着通知の宛先）, `VAPID_PRIVATE_KEY`（Web Push。`pnpm --filter @tomokichi/admin-core run vapid:generate`） | `wrangler secret put` |
| `apps/admin-core/wrangler.jsonc` | `ADMIN_ORIGIN`, `VAPID_PUBLIC_KEY`, `VAPID_SUBJECT` | vars（非秘密）。`docs/support-notifications.md` |
| `apps/mail-ingress/wrangler.jsonc` | `SUPPORT_EMAIL`, `MAX_STORED_BYTES` | vars |
| GitHub | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`（secrets）、`CLOUDFLARE_DEPLOY_ENABLED`, `PUBLIC_TURNSTILE_SITE_KEY`（variables） | Actions |

ブランドサイトは環境変数を持たない（`PUBLIC_TURNSTILE_SITE_KEY` のみビルド時）。

## Development server

```bash
pnpm dev                                  # turbo: 11 の persistent dev（concurrency 20）
pnpm --filter @tomokichi/main dev         # http://localhost:4321
pnpm --filter @tomokichi/remeet dev       # :4322
pnpm --filter @tomokichi/tripory dev      # :4323
pnpm --filter @tomokichi/api dev          # :8787
```

## Build

```bash
pnpm build                                # turbo（依存順）
pnpm --filter @tomokichi/admin-web build  # Vite → dist（worker は wrangler が bundle）
pnpm build:review                         # apps/review（yohaku の wrangler で deploy する特殊経路）
```

## Debug

| 目的 | 手段 |
|---|---|
| CI の何が落ちたか | GitHub Actions のジョブ名 = アプリ名。ローカルは `pnpm --filter <app> check/test` |
| Worker のログ | Cloudflare Dashboard → Workers Logs（全 Worker `observability.enabled`）。Core は `admin_core.error`、api は `admin_bridge.failed` 等の構造化 JSON |
| Ticket のイベント | `ticket_events`（`/api/tickets/:id` の timeline） |
| メール往復 | `support_messages` / `support_reply_sends`。実メールの試験は `admin-report-workflow.md` の記録を参照（本番でテスト送信しない） |
| モデレーション署名 | Mac の `~/Library/Logs/RemeetModeration/`、LaunchAgent `io.tmkch.remeet-moderation-signer` |
| D1 を直接見る | `pnpm --filter @tomokichi/admin-core exec wrangler d1 execute tomokichi-admin --remote --command "SELECT …"` |
| SEO | `pnpm build && pnpm check:seo`（dist の sitemap / canonical） |

## Common commands

```bash
pnpm run ci                  # 全部
pnpm check                   # 型 + wrangler types
pnpm test                    # vitest（Core は cloudflare:test の D1）
pnpm fix                     # biome --write
pnpm check:links / check:seo
pnpm admin:migrate:remote    # D1 migration を本番へ（deploy の前）
pnpm create:app-site         # 新ブランドサイトの雛形
pnpm -w cf whoami            # wrangler（api を対象）
```

## Troubleshooting

| 症状 | 対処 |
|---|---|
| `wrangler: command not found` | ルートに無い。`pnpm -w cf …` か `pnpm --filter <app> exec wrangler …` |
| Admin が 401 だけ返す | `ACCESS_AUD` / `ACCESS_TEAM_DOMAIN` 未設定 = 設計どおりの fail-closed（`admin-core/README.md` step 6） |
| ローカルで Admin にサインインできない | `.dev.vars` の `ENVIRONMENT=local` と `DEV_ADMIN_EMAIL` |
| 送信ボタンが無効 | Core の `MAIL_API_KEY` 未設定（下書き・テンプレ・メモは動く） |
| 通報が Admin に出ない | api の `ADMIN_CORE` binding / outbox（5 分 cron）。`admin_bridge.failed` を検索 |
| アプリからの問い合わせが弾かれる | `SUPPORT_CLIENT_KEY` をアプリより先に設定した。**アプリを先に**（README Support form） |
| テストで `duplicate column name` | harness が冪等に処理する。他のスキーマエラーは本物 |
| migration の split で落ちる | トリガ内の `CASE … END;` の空白が wrangler の splitter に影響（`operations-tickets.md` 移行リハーサル） |

## 関連

- [ARCHITECTURE.md](ARCHITECTURE.md)、[TESTING.md](TESTING.md)、[SECURITY.md](SECURITY.md)、[RELEASE.md](RELEASE.md)、[OPERATIONS.md](OPERATIONS.md)
- ブランドサイトの約束: [app-brand-sites.md](app-brand-sites.md)、`AGENTS.md`
