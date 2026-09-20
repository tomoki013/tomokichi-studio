# Release

最終更新: 2026-09-21。`ci.yml` / `deploy.yml` / `deploy-worker.yml` / `preview-app-sites.yml` と、`operations-tickets.md`・`admin-report-workflow.md` の反映記録から。

## Branch strategy

- `main` 1 本。機能ブランチ（`feat/*`, `fix/*`, `chore/*`, `codex/*`）から PR（履歴上 #1〜#24）。
- タグ・バージョン番号は無い（`package.json` は `0.0.0`）。**Worker の version id** が「何が出ているか」の記録（`operations-tickets.md` の Production release 節に残す）。
- `main` への push = deploy 候補。CI が緑のときだけ `deploy.yml` が走る。

## Versioning

- API は URL に `/api/v1` / `/remeet/v1`（`/api/support` は旧ビルドのため serve 継続、廃止予定なし）。
- D1 migration は `apps/admin-core/migrations/000N_*.sql` と `apps/api/migrations/000N_*.sql`。**forward-only、追加のみ**。コードより先に当てる。
- `packages/admin-contracts` の zod schema は追加の任意フィールドで進める（例: 通報の `reporterEmail`、`dismissedReports`。旧アプリの通報を受け続ける）。

## Build

```bash
pnpm run ci                      # biome + check + test + build + links + seo
pnpm --filter @tomokichi/admin-web build
pnpm --filter @tomokichi/admin-core build   # wrangler deploy --dry-run
```

## Test（出す前）

1. `pnpm run ci` green（CI と同内容）。
2. Core / api の migration を含むなら **ローカルでリハーサル**: 本番 export を復元し migration を 2 回当てて差分ゼロを確認（`operations-tickets.md` Migration rehearsal の手順と表）。
3. 管理画面を触るなら fixture データで表示確認。**本番で顧客にメールを送るテストはしない**。
4. Remeet 連携を触るなら、Remeet の該当ビルドが配布済みか（API が先か後か）を確認。

## Release（自動）

```
push main → CI（変更アプリだけ）→ 成功 → Deploy (workflow_run)
   affected-apps.json を読み → main/remeet/tripory/colorvia/yohaku/quiet-solitaire/api を並列
                            → admin-core → admin-web, mail-ingress（needs:）
```

- 手動: Actions → Deploy → Run workflow → `apps: all` か `admin-core,admin-web`。
- `CLOUDFLARE_DEPLOY_ENABLED != 'true'` なら全 deploy job が skip（CI は赤くならない）。
- 各 job は `deploy-worker.yml` を呼ぶ（`secrets: inherit`、`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`）。

## Release（migration を伴うとき、手動の順序）

`admin-report-workflow.md` 反映順序と `operations-tickets.md` Deployment and recovery を一般化:

```
1. 本番 D1 を export（private）し、現行 Worker の version id を控える
2. api の migration → pnpm --filter @tomokichi/api exec wrangler d1 migrations apply <db> --remote
3. api を deploy（新 entrypoint / route を先に用意する）
4. Core の migration → pnpm admin:migrate:remote
5. Core を deploy → admin-web を deploy（Service Binding の向き先が先）
6. 件数・外部キーを本番で比較、未認証エンドポイントが 401 であること、認証後の画面
7. アプリ側（Remeet）の対応版を配布
8. 記録を docs に残す（version id、件数、確認した範囲）
```

## Rollback

| 対象 | 方法 |
|---|---|
| Worker | `pnpm --filter <app> exec wrangler rollback`（前の version）または前のコミットで `Deploy → Run workflow` |
| D1（追加のみの migration） | 戻さない。新しい表・列は放置しても旧コードは動く |
| D1（データ） | Time Travel（30 日）。ただし **新しいメッセージが届いた後に古い export を戻すとそれを失う**（`operations-tickets.md`: forward fix を優先） |
| Access | Zero Trust ダッシュボード。`ACCESS_AUD` を空にすると全拒否（fail-closed） |
| Email Routing | ダッシュボードで転送先を元に戻す |
| モデレーション manifest | 新しい revision を署名して公開（古い revision は api が拒否） |

## Hotfix

`main` へ PR → CI → Deploy。変更アプリだけが出る（path filter）。緊急時に CI を待てない場合は `Deploy → Run workflow` で **CI 成功済みの sha** を指定できるが、`workflow_dispatch` は `GITHUB_SHA`（main の先頭）を使うので、先に main を戻すこと。

## Remeet との足並み

Remeet のクライアントキー・通報スキーマ・manifest 鍵は **アプリのビルドが先、API の強制が後**。順序を逆にすると App Store 公開中のビルドが弾かれる（README Support form、`project.yml` の Remeet 側コメント）。
