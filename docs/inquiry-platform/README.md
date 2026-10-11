# inquiry-platform の Tomokichi 環境

最終更新: 2026-10-11。

お問い合わせ・通報・運営 API（`admin.tmkch.io`）は、公開 OSS の [tomoki013/inquiry-platform](https://github.com/tomoki013/inquiry-platform) を Tomokichi の設定でデプロイしたものです。基盤は API とセキュリティの共通部分だけを提供し、Studio の管理画面 UI はこの Repository の `apps/admin` にあります。基盤には Tomokichi 固有の値は無く、それらはすべてこの Repository に置いています（ADR-023）。

## どこに何があるか

| パス | 何か |
|---|---|
| `apps/api/package.json` の `@inquiry-platform/sdk` | 使う release tag（例 `#v0.2.0`）。SDK とデプロイする Worker の版をこの 1 行で決める |
| `deploy/inquiry-platform/api.jsonc` | Core（`tomokichi-admin-core`）。D1 `tomokichi-admin`、R2 `tomokichi-admin-files`、アドレス、`BRANDING`、`SIGNED_MODERATION`（Remeet → `tomokichi-api#RemeetModeration`） |
| `deploy/inquiry-platform/admin.jsonc` | API Gateway（`tomokichi-admin-web`、Access の JWT 検証）。route を持たず、`apps/admin` から Service Binding で呼ばれる。UI の assets は設定しない |
| `apps/admin` | Studio の運営画面（Worker `tomokichi-admin`、`admin.tmkch.io`）。React SPA を配信し、`/api/*` をそのまま Gateway へ渡す |
| `deploy/inquiry-platform/mail-ingress.jsonc` | 受信メール（`tomokichi-mail-ingress`） |
| `deploy/inquiry-platform/seed.ts`, `seed/` | アプリ・定型文・署名、`studio` service と既定値 |
| `deploy/inquiry-platform/run.mjs` | 指定 tag を `.cache/inquiry-platform/<tag>` に取得し、基盤の `scripts/deploy.mjs` を実行 |

Secret（`HASH_PEPPER`、`MAIL_API_KEY`、`NOTIFICATION_EMAIL`、`VAPID_PRIVATE_KEY`、`SUPPORT_FORWARD_EMAIL`）は各 Worker に設定済みで、Repository には無い。

## コマンド

```bash
pnpm deploy:inquiry check                 # 3 Worker の dry-run（何も変えない）
pnpm deploy:inquiry migrate               # D1 migration（remote）
pnpm deploy:inquiry seed --dry-run        # seed の SQL を表示
pnpm deploy:inquiry deploy all            # api → admin → mail-ingress
```

本番に触るコマンド（`migrate`、`seed`、`deploy`）は Owner が手元で実行する。

## 版を上げる

1. inquiry-platform の新しい tag の変更点と `apps/api/migrations` の追加を確認。
2. `apps/api/package.json` の tag を上げて `pnpm install`。`pnpm --filter @tomokichi/api test` と `pnpm deploy:inquiry check` で bindings が変わっていないことを確認して PR。
3. マージ後、D1 を private にバックアップ（下の手順 1）、Worker version を控えて `migrate` → `deploy all` → `tomokichi-api` をデプロイ。

ロールバック: 直前の tag に戻して `deploy all`。D1 は戻さない（migration は forward-only）。

`apps/admin` は `@inquiry-platform/core`（型と定数）と `@inquiry-platform/sdk` を同じ tag で持つ。tag を上げるときは `apps/admin/package.json` と `pnpm-workspace.yaml` の override 説明も合わせ、`pnpm --filter @tomokichi/admin check test` を通す。core の `workspace:*` の SDK 依存は git 由来の subdependency として block されるため、override で外し、`apps/admin` の vite / tsconfig が SDK を自分の依存へ alias している。

## 運営画面（apps/admin）

`admin.tmkch.io` は Worker `tomokichi-admin`（`apps/admin`）が持つ。Access application はこの hostname に付いたまま。`/api/*` は Service Binding `GATEWAY` で `tomokichi-admin-web` へ request をそのまま渡すので、Access の JWT（`Cf-Access-Jwt-Assertion` / cookie）と `Origin: https://admin.tmkch.io` が Gateway に届き、認証・権限・CSRF は従来どおり Gateway が判定する。それ以外は `dist/` の SPA（deep link は `index.html`）に CSP などの header を付けて返す。UI は inquiry-platform v0.1.0 の画面を基にしている。

表示範囲: Studio のブランド（Remeet・Colorvia・Yohaku と、アプリ指定なしの問い合わせが入る `tmkch-io` service）だけ。`admin.jsonc` の `ADMIN_CORE` binding の `props.scope.services` で指定し、inquiry-platform v0.4.0 以降の Core が一覧・件数・ダッシュボード・監査を絞り、範囲外の Ticket・通報・問い合わせ・アプリは `NOT_FOUND` にする（Zakkary・ともきちの旅行日記はそれぞれの管理画面で扱う）。新しい Studio アプリを登録したら slug をこの配列に足す。通知（メール・Push）は範囲と無関係にデプロイ単位のまま。

デプロイ（Owner が手元で、この順）:

```bash
pnpm deploy:inquiry deploy gateway        # admin.jsonc に route が無い Gateway（custom domain を手放す）
pnpm --filter @tomokichi/admin run deploy # tomokichi-admin が admin.tmkch.io を取る
```

1 と 2 の間は `admin.tmkch.io` が応答しない。2 で wrangler が「既に別 Worker に割り当て済み」と聞いてきたら付け替えてよい。ロールバック: `admin.jsonc` に `admin.tmkch.io` の custom domain を戻して `deploy gateway`（UI は無くなり API だけに戻る）。

ローカル: `.cache/inquiry-platform/<tag>/apps/{api,admin}/wrangler.deployment.jsonc` を置き（`pnpm deploy:inquiry check` でコピーされる）、Gateway 側に `.dev.vars`（`ENVIRONMENT=local`、`DEV_ADMIN_EMAIL=…`、空の `ACCESS_TEAM_DOMAIN=` / `ACCESS_AUD=`）を作って、`apps/admin` で `pnpm build && pnpm exec wrangler dev --port 4331 -c wrangler.jsonc -c ../../.cache/inquiry-platform/<tag>/apps/admin/wrangler.deployment.jsonc -c ../../.cache/inquiry-platform/<tag>/apps/api/wrangler.deployment.jsonc`。D1 は `apps/admin/.wrangler/state` に入るので、migration と seed は `--local --persist-to ../../../../apps/admin/.wrangler/state` で当てる。

## v0.3.1 への移行（2026-09-29）

v0.3.0（v0.3.1 は operator id の検証修正）は `ProjectOperator` entrypoint と migration `0012_project_ticket_url.sql` を追加する。Project が自分の管理画面（例: `admin.tomokichidiary.com`、`admin.zakkary.app`）から自分のチケットを扱うときは、その Project の API Worker が `tomokichi-admin-core` の `ProjectOperator` に Service Binding する。`admin.tmkch.io`（API gateway）と Access には何も足さない。通知リンクは seed の `mailSettings[].ticketUrlTemplate` で各 Project の管理画面へ向ける。

手順は「版を上げる」と同じ: バックアップ → `migrate`（0012 のみ）→ `deploy all` → `seed`。そのあと各 Project の API をデプロイする（Core に `ProjectOperator` が無いと binding を作れない）。

## v0.1.0 への移行（2026-09-27 実施済み）

v0.1.0 は migration `0010_default_service_setting.sql` を含む。既存 trigger に埋め込まれていた既定値 `studio` を `platform_settings` に移し、trigger をそれを読む形に置き換える。Project のない問い合わせは引き続き `studio` に入る。Worker のコードの違いはログの `worker` 欄（`admin` / `mail-ingress`）と中立化されたコメントだけ。

1. `pnpm deploy:inquiry check` で bindings・vars が従来どおりか確認。
2. バックアップ: `.cache/inquiry-platform/v0.1.0/apps/api` で `pnpm exec wrangler d1 export DB --remote --config wrangler.deployment.jsonc --output <private path>`（設定は `check` で一度コピーされる）。
3. `pnpm deploy:inquiry migrate`（0010 のみ適用されるはず）。
4. 確認（3 のあと、設定は取得した版の中にコピー済み）:
   `cd .cache/inquiry-platform/v0.1.0/apps/api && pnpm exec wrangler d1 execute DB --remote --config wrangler.deployment.jsonc --command "SELECT * FROM platform_settings"` → `default_service_id | studio`。行が無ければ `pnpm deploy:inquiry seed` で入る。
5. `pnpm deploy:inquiry deploy all`。API の Access・認証・通知件名が従来どおりか確認する。画面やアイコンはこのリリースの対象外。

## v0.2.0（2026-09-27 実施済み）

管理画面 UI を基盤から除去し、`tomokichi-admin-web` を Access 付き API Gateway として再デプロイした。HTML、PWA、静的 assets、SPA fallback は提供しない。SDK の tag も `apps/api/package.json` で `v0.2.0` に固定し、PR #83 の main マージ後に `tomokichi-api` も自動デプロイされた。

本番確認: `admin.tmkch.io` と `/api` は Access のログインへ 302、静的 manifest は Gateway の API-only 応答になった。運営画面、CLI、BFF は利用者側で実装する。

## 記録

- 2026-10-11 v0.6.0（migration なし）: Project ごとの通報受付メール文面（`reportReceiptTemplate`、Zakkary は `zakkary_report_receipt`）と、お客様向けの不透明な受付ID。`deploy all`: core `89484c12`、gateway `99ddaff1`、mail-ingress `ac6bb6d1`。Studio アプリの受付メールは従来どおり。ロールバック: `v0.5.1` に戻して `deploy all`（Zakkary API も前版 `0afb0aa5` へ）。
- 2026-10-11 v0.5.1（migration なし）: ヘッダーの無い返信も受付番号＋送信者一致で同じチケットへ。`deploy all`: core `50a45819`、gateway `40e171cc`、mail-ingress `878e84b0`。続けて `seed` で Zakkary の `fromName` を「Zakkaryカスタマーサポート」に（`app_mail_settings` 2 行）。ロールバック: `v0.5.0` に戻して `deploy all`。
- 2026-10-11 v0.5.0（migration なし）: `ProjectOperator` に Project 所有の返信テンプレート操作を追加（Zakkary の管理画面が使う）。`deploy all`: core `ce83ece9`、gateway `e63f67e7`、mail-ingress `15895e8e`。`admin.tmkch.io` は Access へ 302 のまま。ロールバック: `apps/api` / `apps/admin` を `v0.4.0` に戻して `deploy all`（Zakkary API も前版 `7e544f60` へ）。
- 2026-10-11 運営画面と v0.4.0: `admin.tmkch.io` を `tomokichi-admin`（`apps/admin`、version `6810ee6c`）に付け替え、Gateway は route なし（`0e0f6492`）。続けて v0.4.0（migration なし）を `deploy all`: core `d3a1d3d1`、admin `857e9981`（`ADMIN_CORE` の `props.scope.services` = remeet / colorvia / yohaku / tmkch-io）、mail-ingress `56d3d322`。未ログインは Access へ 302 のまま。ロールバック: `apps/api/package.json` を `v0.3.4` に戻して `deploy all`（scope は無視され全件表示に戻る）。

- 2026-09-27 v0.1.0: 事前バックアップ `tomokichi-admin-2026-09-27-pre-v0.1.0.sql`（Owner の手元）。バックアップのコピーで 0010 を予行演習（未適用は 0010 のみ、外部キー違反なし、再実行で変化なし）。本番に 0010 を適用し、`default_service_id = studio`、trigger は新形式、Ticket 23 件は不変。Worker version: core `dc5ef595`、admin `e88b6c5d`、mail-ingress `6c157e52`。`admin.tmkch.io` は Access のログインへ 302、manifest は「Tomokichi Studio Admin / Tomokichi Admin」、アイコンは `admin-assets` と同一。`tomokichi-api` は deploy workflow（`f10b151`）で反映。ロールバック先: tag `v0.0.0` が無いため、inquiry-platform `0bbd0d2` の Tomokichi 設定で再デプロイ。

- [独立化の棚卸し](extraction.md)、[Cutover](cutover.md)（ADR-022）
- [通報対応とメール返信（Remeet）](report-workflow.md)
- [Ticket モデル移行の結果](tickets-migration-2026-09-18.md)
