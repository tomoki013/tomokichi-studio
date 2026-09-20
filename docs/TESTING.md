# Testing

最終更新: 2026-09-21

## Philosophy

- **出荷するスキーマで試す**: Core のテストは `cloudflare:test` の D1 に `migrations/*.sql` を全部流す（`tests/harness.ts`。手書きの `CREATE TABLE` fixture を使わない）。
- **外部は fake、内部は本物**: `FakeMailProvider`、Service Binding は plain object、Access は署名済みトークンを自作。ドメインサービスと SQL は本物。
- **本番でテスト送信しない**: メールの往復は fake provider。実メール確認は運用記録（`admin-report-workflow.md`）に残す。
- 2026-09 の精査で「本物の不具合を捕まえられないテスト」は削除・統合済み（`git log` `chore/test-audit`）。同じ基準で足す。
- 未実装の契約は `it.fails`（`audit-trail.test.ts` の from/to）。

## Unit / Integration（vitest、336 + 2）

| パッケージ | 実行環境 | 何を見るか |
|---|---|---|
| `apps/admin-core/tests/*.test.ts`（9 ファイル） | `@cloudflare/vitest-pool-workers`（実 D1・R2） | Ticket 遷移 / SLA / merge / 監査横断、通報の冪等・署名・受付メール・相関、支援スレッド化、返信の Message-ID と署名、添付の認証、アプリ台帳、実 MIME パーサ経由の受信 |
| `apps/admin-web/src/worker/worker.test.ts` | workers pool（`vitest.worker.config.ts`） | JWT の全拒否条件、Access 未設定で全拒否、local bypass、Origin/JSON ガード、CORS 無し、`no-store`、404 の形 |
| `apps/admin-web/src/client/**/*.test.tsx` | jsdom | 画面の表示・操作 |
| `apps/api/src/**/*.test.ts` | node | support の検証・honeypot・429・502・Admin 複製・CORS、Turnstile（action / hostname / client key）、招待の暗号・store・rate limit、通報 service、モデレーション digest/service |
| `apps/mail-ingress/src/index.test.ts` | node | 転送優先、Core 失敗時も転送、サイズ上限、ログに本文を書かない |
| `packages/admin-contracts`, `packages/admin-mail` | node | zod 契約、HTML テンプレ（color-scheme、署名） |

## UI / E2E

ブラウザ自動化は無い。管理画面の表示は React Testing Library（jsdom）。本番画面の確認は Access 越しに人が行い、`operations-tickets.md` の Production release 節に記録する。

## Running tests

```bash
pnpm test                                             # turbo で全パッケージ
pnpm --filter @tomokichi/admin-core test
pnpm --filter @tomokichi/admin-core exec vitest run tests/audit-trail.test.ts
pnpm --filter @tomokichi/admin-web test               # worker + client の 2 config
pnpm --filter @tomokichi/api test
```

## CI

`ci.yml`: `dorny/paths-filter` で変更アプリを判定し、そのアプリの `check` / `test` / `build` を並列ジョブで実行。`global`（workflow / biome / scripts / lockfile）が変わると全アプリ。成功時に `affected-apps` artifact を出し、`deploy.yml` がそれを読んで deploy する（[RELEASE.md](RELEASE.md)）。

## Mock / Fixture

- `tests/harness.ts`: `harness()`（migrate + reset + services）、`seedApp()`、`admin` / `appActor`（`ActorRef`）、`FakeMailProvider`、`splitMigration`（wrangler と同じ SQL 分割）。
- `worker.test.ts`: RSA 鍵を生成して Access 証明書エンドポイントを差し替え。
- `apps/api`: `createApp({ rateLimit, mail, adminCore })` の依存注入。
- 通報 fixture の digest は Remeet リポジトリの `moderation-vectors.json` と同じ値（cross-language）。

## Critical test areas（壊れたら困る順）

1. `worker.test.ts` — 未認証 / 期限切れ / 誤 aud で入れないこと。
2. `tickets.test.ts` `requires signed moderation instead of closing a report with a label` / `reports.test.ts` 同 — ラベルだけで通報を閉じられないこと。
3. `reports.test.ts` 冪等・`leaves the report open when publishing fails`・遅延 RPC。
4. `audit-trail.test.ts` — 全変更に actor 付きイベント。
5. `tickets.test.ts` merge / stale revision。
6. `index.test.ts`（api）— honeypot、429、Admin 複製が失敗してもメールは出る。
7. `mail-ingress` — Core が落ちても転送する。

詳細と未着手は [testing/test-gap-analysis.md](testing/test-gap-analysis.md)。
