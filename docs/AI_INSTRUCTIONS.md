# AI Instructions — Tomokichi Studio

AI コーディングエージェント向け。最終更新: 2026-09-21。ブランドサイトを触るなら `AGENTS.md` と `docs/app-brand-sites.md` も読む。

## Project goal

tmkch.io 配下のブランドサイト群・公開 API・管理基盤（Ticket / 通報 / 返信）を 1 つの monorepo で運用する。管理基盤は「Studio 全プロダクトの内部運用基盤」へ育てる方向（`audit/tomokichi-studio-platform-audit.md`: Incident・監視・Role・MCP）。

## 最初に読むもの

1. `docs/ARCHITECTURE.md`（3 Worker の分離、データの流れ）
2. `docs/operations-tickets.md`（Ticket の規則）、`docs/admin-report-workflow.md`（通報と署名）、`docs/support-notifications.md`（通知・PWA・Push）
3. `apps/admin-core/README.md`（Cloudflare 側の設定手順）
4. `docs/DECISIONS.md`、`docs/audit/tomokichi-studio-platform-audit.md`

## Architecture rules

- **Core だけが D1 / R2 を触る**。`admin-web` / `api` / `mail-ingress` は `@tomokichi/admin-contracts` の `AdminCoreApi` を呼ぶ。スキーマを contracts に漏らさない。
- 新しい Admin API は `admin-web/worker/routes/api.ts` に足し、Core の service メソッド + contracts の zod schema を対にする。**変更系は必ず `ActorRef` を受け取り、`ticket_events` か `audit_logs` に同一 batch で書く**（`audit-trail.test.ts` が横断で検査）。
- Ticket の状態は `TicketService.change()` の遷移規則を通す。legacy の `/api/reports/:id/status` 等は 409（迂回路を作らない）。
- 通報の削除・解除は署名経路（prepare → Mac → complete）だけ。status / resolution で内容を消す道を作らない。
- migration は `migrations/000N_*.sql` を追記。`CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ADD COLUMN`、トリガの `END;` 行を単独に（harness と wrangler の splitter）。
- 秘密は `wrangler secret`。`.dev.vars` は gitignore。`ACCESS_AUD` 等の vars は非秘密。
- **通知（メール / Push）に本文・氏名・アドレスを入れない**。`TicketNotificationEvent` にフィールドを足さない。本文入りの運営メールを復活させない（`docs/support-notifications.md`、ADR-019）。
- Service Worker（`admin-web/public/sw.js`）で Cache Storage を使わない（ADR-021）。
- ブランドサイトは `AppSiteShell.astro` / `AppHeroChrome.astro` を使う。別のシェルを作らない（`AGENTS.md`）。

## Naming / Directory

- Worker 名は `tomokichi-<app>`。パッケージ名は `@tomokichi/<app>`。
- Core: `src/domain/<name>-service.ts`（規則）、`src/db/<name>.ts`（repository）、`tests/<name>.test.ts`。
- contracts: `src/<area>.ts` に型 + zod + エラーコード。
- 表・列は snake_case、id は UUID 文字列、時刻は UTC ISO 文字列。
- 文言（UI・メール）は日本語。docs は日本語本文 + 英語識別子。

## Testing

- `pnpm test`（turbo）か `pnpm --filter <app> test`。Core は `cloudflare:test` の実 D1 に全 migration。
- `tests/harness.ts` の `harness()` / `seedApp()` / `admin` / `FakeMailProvider` を使う。手書きの `CREATE TABLE` を書かない。
- **本番で顧客にメールを送るテストをしない**。
- 「本物の不具合を捕まえられないテスト」を書かない（2026-09 精査の基準）。未実装の契約は `it.fails`。
- `docs/testing/test-gap-analysis.md` を更新する。

## Security

- ログに本文・件名・メールアドレス・IP を出さない。`admin.authenticated` の email だけ例外。
- `worker/security.ts` の CSP に外部 origin を足さない（`connect-src` の `127.0.0.1:47831` は署名サービス）。
- `admin-core` に route / `workers_dev` を付けない。
- `HASH_PEPPER` を変えない。
- 公開 API の新経路には Rate Limiting binding を付ける（`apps/api/wrangler.jsonc`）。

## Do not

- ルートで `wrangler` を実行しようとしない（`pnpm -w cf …`）。
- `pnpm ci` は pnpm 11 の組込み clean-install で、`package.json` の `ci` スクリプトを **隠す**。全検査は `pnpm run ci`（Diary と同じ）。
- `SUPPORT_CLIENT_KEY` / `REMEET_INVITE_CLIENT_KEY` をアプリより先に強制しない。
- `deploy.yml` の順序（Core → Web / Ingress）を崩さない。
- legacy 表（`support_threads`, `reports`, `support_messages`）を削除・改名しない（メール transport とトリガの依存）。
- Ticket / event / message の delete API を足さない。
- 監査ログの `actor_id` にメールアドレスを入れない（`sub` を使う）。

## Commands

```bash
mise install && pnpm install
pnpm run ci
pnpm --filter @tomokichi/admin-core test
pnpm --filter @tomokichi/admin-core dev   # :8788
pnpm --filter @tomokichi/admin-web dev    # :4330
pnpm --filter @tomokichi/api dev          # :8787
pnpm admin:migrate:local
pnpm -w cf whoami
```

## Definition of Done

- [ ] `pnpm run ci` green
- [ ] 変更系 API に監査行（`audit-trail.test.ts` を拡張）
- [ ] migration は追記のみ・リハーサル済み（本番 export → 2 回適用 → 差分ゼロ）
- [ ] contracts の zod と Core の検証が一致
- [ ] `docs/operations-tickets.md` / `admin-report-workflow.md` / `DECISIONS.md` を更新
- [ ] 反映したら version id と確認範囲を docs に記録
