# AI Instructions — Tomokichi Studio

AI コーディングエージェント向け。最終更新: 2026-09-26。ブランドサイトを触るなら `AGENTS.md` と `docs/app-brand-sites.md` も読む。

## Project goal

tmkch.io 配下のブランドサイト群と公開 API（`tomokichi-api`）を 1 つの monorepo で運用する。お問い合わせ・通報・返信・管理画面は **問い合わせ基盤 [inquiry-platform](https://github.com/tomoki013/inquiry-platform)（別 Repository）** で、この Repository はその利用者の 1 つ（ADR-022）。

## 最初に読むもの

1. `docs/ARCHITECTURE.md`（サイトと API、基盤との境界）
2. `docs/DECISIONS.md`（ADR-022 まで）
3. 基盤に関わる変更なら inquiry-platform の `AGENTS.md` と `docs/`

## Architecture rules

- **管理画面・Ticket・通報の規則をこの Repository に書かない。** それらは inquiry-platform に足す。
- 基盤との接点は `apps/api/src/services/admin-bridge.ts` と vendored の `packages/inquiry-sdk` だけ。`packages/inquiry-sdk` は **手で編集しない**（inquiry-platform の `scripts/vendor-sdk.mjs` で取り込む）。
- `apps/api` の `INQUIRY` binding は基盤の `Intake` entrypoint にだけ向ける。`AdminCore` に bind しない。サポートフォームにアプリを足したら `props.projects` にも足す（`inquiry-binding.test.ts`）。
- 通報の削除・解除は署名経路（基盤 → `RemeetModeration` prepare → Mac → complete）だけ。
- migration は `apps/api/migrations/000N_*.sql` を追記のみ。
- 秘密は `wrangler secret`。`.dev.vars` は gitignore。
- ブランドサイトは `AppSiteShell.astro` / `AppHeroChrome.astro` を使う。別のシェルを作らない（`AGENTS.md`）。

## Naming / Directory

- Worker 名は `tomokichi-<app>`。パッケージ名は `@tomokichi/<app>`（vendored SDK だけ `@inquiry-platform/sdk`）。
- 表・列は snake_case、id は UUID 文字列、時刻は UTC ISO 文字列。
- 文言（UI・メール）は日本語。docs は日本語本文 + 英語識別子。

## Testing

- `pnpm test`（turbo）か `pnpm --filter <app> test`。
- **本番で問い合わせ・通報を流して試さない**（本物の Ticket と通知ができる）。
- 「本物の不具合を捕まえられないテスト」を書かない（2026-09 精査の基準）。

## Security

- ログに本文・件名・メールアドレス・IP を出さない。基盤のエラーはコードだけ。
- 公開 API の新経路には Rate Limiting binding を付ける（`apps/api/wrangler.jsonc`）。

## Do not

- ルートで `wrangler` を実行しようとしない（`pnpm -w cf …`）。
- `pnpm ci` は pnpm 11 の組込み clean-install で、`package.json` の `ci` スクリプトを **隠す**。全検査は `pnpm run ci`。
- `SUPPORT_CLIENT_KEY` / `REMEET_INVITE_CLIENT_KEY` をアプリより先に強制しない。
- `tomokichi-admin-*` / `tomokichi-mail-ingress` をこの Repository からデプロイしない（inquiry-platform の担当）。

## Commands

```bash
mise install && pnpm install
pnpm run ci
pnpm --filter @tomokichi/api test
pnpm --filter @tomokichi/api dev          # :8787
pnpm -w cf whoami
```

## Definition of Done

- [ ] `pnpm run ci` green
- [ ] migration は追記のみ・リハーサル済み
- [ ] 基盤の契約を変えるなら inquiry-platform 側を先に出し、SDK を vendor し直す
- [ ] `DECISIONS.md` を必要なら更新
