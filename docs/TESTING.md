# Testing

最終更新: 2026-09-26。問い合わせ・通報基盤のテストは [inquiry-platform](https://github.com/tomoki013/inquiry-platform) 側。

## Philosophy

- **出荷するスキーマで試す**: api のテストは `cloudflare:test` の D1 に `migrations/*.sql` を流す。
- **外部は fake、内部は本物**: 基盤への `INQUIRY` binding は `submitContact` / `submitReport` / `fetch` を持つ plain object。rate limit・mail も注入。
- **本番でテスト送信しない**: 問い合わせ・通報を本番に流して確かめない（Ticket と運営通知が実際にできる）。
- 2026-09 の精査で「本物の不具合を捕まえられないテスト」は削除・統合済み（`git log` `chore/test-audit`）。同じ基準で足す。

## Unit / Integration（vitest）

| パッケージ | 実行環境 | 何を見るか |
|---|---|---|
| `apps/api/src/**/*.test.ts` | `@cloudflare/vitest-pool-workers` | support の検証・honeypot・429・502・基盤への受け渡し・CORS、Turnstile（action / hostname / client key）、招待の暗号・store・rate limit、通報 service と outbox、モデレーション digest / service |
| `apps/api/src/inquiry-binding.test.ts` | 同上 | `INQUIRY` が `Intake` にしか届かないこと、`props.projects` がサポートフォームの全アプリを含むこと |
| `packages/app-site` | node | asset cache worker など |

## UI / E2E

ブラウザ自動化は無い。ブランドサイトは `pnpm build` 後の `check:links` / `check:seo` で静的に検査する。

## Running tests

```bash
pnpm test                                  # turbo で全パッケージ
pnpm --filter @tomokichi/api test
pnpm --filter @tomokichi/api exec vitest run src/inquiry-binding.test.ts
```

## CI

`ci.yml`: `dorny/paths-filter` で変更アプリを判定し、そのアプリの `check` / `test` / `build` を並列ジョブで実行。`global`（workflow / biome / scripts / lockfile）が変わると全アプリ。`packages/inquiry-sdk` の変更は API check を動かす。成功時に `affected-apps` artifact を出し、`deploy.yml` がそれを読んで deploy する（[RELEASE.md](RELEASE.md)）。

## Mock / Fixture

- `apps/api`: `createApp({ rateLimit, … })` の依存注入と、`env` の `INQUIRY` を fake に差し替え。
- `vitest.config.ts` の `Intake` stub: binding 先の Worker が無いと workerd が起動しないため、メソッドを持たない entrypoint を置く（基盤が落ちている状態でのテストにもなる）。
- 通報 fixture の digest は Remeet リポジトリの `moderation-vectors.json` と同じ値（cross-language）。

## Critical test areas（壊れたら困る順）

1. `index.test.ts` — honeypot、429、基盤に届かないときは 502（受け付けたふりをしない）、冪等キーが request id。
2. `routes/remeet/reports.test.ts` / `report-outbox.test.ts` — 通報は outbox に入れば 201、基盤停止中も失わず再送。
3. `inquiry-binding.test.ts` — binding の範囲。
4. モデレーション digest / service — 署名対象の一致（Remeet と cross-language）。

詳細と未着手（移行前の記録）は [testing/test-gap-analysis.md](testing/test-gap-analysis.md)。
