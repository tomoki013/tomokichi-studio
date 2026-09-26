# Release

最終更新: 2026-09-26。`ci.yml` / `deploy.yml` / `deploy-worker.yml` / `preview-app-sites.yml` から。問い合わせ・通報基盤（`tomokichi-admin-core` / `-admin-web` / `-mail-ingress`）のリリースは [inquiry-platform](https://github.com/tomoki013/inquiry-platform) `docs/operations/cutover.md`。

## Branch strategy

- `main` 1 本。機能ブランチ（`feat/*`, `fix/*`, `chore/*`, `codex/*`）から PR（履歴上 #1〜#24）。
- タグ・バージョン番号は無い（`package.json` は `0.0.0`）。**Worker の version id** が「何が出ているか」の記録（PR か運用記録に残す）。
- `main` への push = deploy 候補。CI が緑のときだけ `deploy.yml` が走る。

## Versioning

- API は URL に `/api/v1` / `/remeet/v1`（`/api/support` は旧ビルドのため serve 継続、廃止予定なし）。
- D1 migration は `apps/api/migrations/000N_*.sql`。**forward-only、追加のみ**。コードより先に当てる。
- 基盤との契約は vendored の `packages/inquiry-sdk`。更新は inquiry-platform の `scripts/vendor-sdk.mjs` で取り込む（手で編集しない）。基盤側の変更は追加の任意フィールドで進める。

## Build

```bash
pnpm run ci                      # biome + check + test + build + links + seo
pnpm --filter @tomokichi/api build         # wrangler deploy --dry-run（bindings を確認）
```

## Test（出す前）

1. `pnpm run ci` green（CI と同内容）。
2. api の migration を含むなら **ローカルでリハーサル**: 本番 export を復元し migration を 2 回当てて差分ゼロを確認。
3. **本番で顧客にメールを送るテストはしない**。
4. Remeet 連携を触るなら、Remeet の該当ビルドが配布済みか（API が先か後か）を確認。

## Release（自動）

```
push main → CI（変更アプリだけ）→ 成功 → Deploy (workflow_run)
   affected-apps.json を読み → main/remeet/tripory/colorvia/yohaku/quiet-solitaire/api を並列
```

- 手動: Actions → Deploy → Run workflow → `apps: all` か `main,api`。
- `CLOUDFLARE_DEPLOY_ENABLED != 'true'` なら全 deploy job が skip（CI は赤くならない）。
- 各 job は `deploy-worker.yml` を呼ぶ（`secrets: inherit`、`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`）。

## Release（migration を伴うとき、手動の順序）

```
1. 本番 D1 を export（private）し、現行 Worker の version id を控える
2. api の migration → pnpm --filter @tomokichi/api exec wrangler d1 migrations apply <db> --remote
3. api を deploy
4. 件数・外部キーを本番で比較、未認証エンドポイントの挙動を確認
5. アプリ側（Remeet）の対応版を配布
6. 記録を残す（version id、件数、確認した範囲）
```

基盤（`Intake`）の新機能を使う変更は、**基盤のデプロイが先**、この Repository の `apps/api` が後。

## Rollback

| 対象 | 方法 |
|---|---|
| Worker | `pnpm --filter <app> exec wrangler rollback`（前の version）または前のコミットで `Deploy → Run workflow` |
| D1（追加のみの migration） | 戻さない。新しい表・列は放置しても旧コードは動く |
| D1（データ） | Time Travel（30 日）。ただし **新しいデータが入った後に古い export を戻すとそれを失う**（forward fix を優先） |
| モデレーション manifest | 新しい revision を署名して公開（古い revision は api が拒否） |

## Hotfix

`main` へ PR → CI → Deploy。変更アプリだけが出る（path filter）。緊急時に CI を待てない場合は `Deploy → Run workflow` で **CI 成功済みの sha** を指定できるが、`workflow_dispatch` は `GITHUB_SHA`（main の先頭）を使うので、先に main を戻すこと。

## Remeet との足並み

Remeet のクライアントキー・通報スキーマ・manifest 鍵は **アプリのビルドが先、API の強制が後**。順序を逆にすると App Store 公開中のビルドが弾かれる（README Support form、`project.yml` の Remeet 側コメント）。
