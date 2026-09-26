# Development

最終更新: 2026-09-26。矛盾したらコードと `package.json` が正。問い合わせ・通報基盤（admin.tmkch.io）の開発手順は [inquiry-platform](https://github.com/tomoki013/inquiry-platform) の `apps/api/README.md`。

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

問い合わせ・通報を受け付ける経路（`apps/api` → 基盤）をローカルで試すときは、`INQUIRY` binding の先として inquiry-platform の `apps/api` を `wrangler dev` で起動する（同 Repository の README）。この Repository のテストは binding を stub で置き換えるので、基盤を起動しなくても通る。

## Environment

| 場所 | 変数 | 種類 |
|---|---|---|
| `apps/api/wrangler.jsonc` | `MAIN_SITE_ORIGIN`, `MAIN_SITE_WORKERS_ORIGIN`, `SUPPORT_*_EMAIL`, cron `17 3 * * *`（招待掃除 + manifest 期限警告）と `*/5 * * * *`（通報 outbox） | vars |
| `apps/api` secrets | `RESEND_API_KEY`, `TURNSTILE_SECRET_KEY`, `SUPPORT_CLIENT_KEY`, `REMEET_INVITE_CLIENT_KEY`, … | `pnpm -w cf secret put <NAME>` |
| `apps/api/wrangler.jsonc` `services` | `INQUIRY`（基盤の `Intake`、`props` で Project を限定） | Service Binding |
| GitHub | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`（secrets）、`CLOUDFLARE_DEPLOY_ENABLED`, `PUBLIC_TURNSTILE_SITE_KEY`（variables） | Actions |

ブランドサイトは環境変数を持たない（`PUBLIC_TURNSTILE_SITE_KEY` のみビルド時）。

## Development server

```bash
pnpm dev                                  # turbo: 全アプリの persistent dev
pnpm --filter @tomokichi/main dev         # http://localhost:4321
pnpm --filter @tomokichi/remeet dev       # :4322
pnpm --filter @tomokichi/tripory dev      # :4323
pnpm --filter @tomokichi/api dev          # :8787
```

## Build

```bash
pnpm build                                # turbo（依存順）
pnpm build:review                         # apps/review（yohaku の wrangler で deploy する特殊経路）
```

## Debug

| 目的 | 手段 |
|---|---|
| CI の何が落ちたか | GitHub Actions のジョブ名 = アプリ名。ローカルは `pnpm --filter <app> check/test` |
| Worker のログ | Cloudflare Dashboard → Workers Logs（全 Worker `observability.enabled`）。api は `admin_bridge.failed` / `admin_bridge.support_rejected` 等の構造化 JSON |
| モデレーション署名 | Mac の `~/Library/Logs/RemeetModeration/`、LaunchAgent `io.tmkch.remeet-moderation-signer` |
| SEO | `pnpm build && pnpm check:seo`（dist の sitemap / canonical） |

## Common commands

```bash
pnpm run ci                  # 全部
pnpm check                   # 型 + wrangler types
pnpm test                    # vitest（api は cloudflare:test の D1）
pnpm fix                     # biome --write
pnpm check:links / check:seo
pnpm create:app-site         # 新ブランドサイトの雛形
pnpm -w cf whoami            # wrangler（api を対象）
```

## Troubleshooting

| 症状 | 対処 |
|---|---|
| `wrangler: command not found` | ルートに無い。`pnpm -w cf …` か `pnpm --filter <app> exec wrangler …` |
| 通報・問い合わせが管理画面に出ない | api の `INQUIRY` binding / outbox（5 分 cron）。`admin_bridge.failed` / `*_rejected` の `code` を検索（`FORBIDDEN` なら binding の `props.projects` に漏れ） |
| 管理画面そのものの不具合 | inquiry-platform 側（同 Repository `docs/operations/`） |
| アプリからの問い合わせが弾かれる | `SUPPORT_CLIENT_KEY` をアプリより先に設定した。**アプリを先に**（README Support form） |
| テストで `duplicate column name` | harness が冪等に処理する。他のスキーマエラーは本物 |

## 関連

- [ARCHITECTURE.md](ARCHITECTURE.md)、[TESTING.md](TESTING.md)、[SECURITY.md](SECURITY.md)、[RELEASE.md](RELEASE.md)、[OPERATIONS.md](OPERATIONS.md)
- ブランドサイトの約束: [app-brand-sites.md](app-brand-sites.md)、`AGENTS.md`
