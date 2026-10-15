# Project専用テーブルへの本番移行（2026-10-16）

基盤v0.9.0（`79375dd0cdb1955a30b319c21ba5c068a5a953eb`）を本番反映した。
D1 `tomokichi-admin`を共有したまま、全7保存先をactiveにし、`project_storage_required=1`で旧表へのfallbackを禁止。
旧データ・ID・番号・履歴・R2キーは保持した。

## 実施内容と検証

0015〜0019、Core/gateway/mail-ingress、デプロイ側0020〜0042の順で適用。
0021〜0027で追従開始、0028〜0034でコピー、全列照合後0035〜0041で各Projectを原子的に切替、0042でsealした。
切替は2026-10-15 23:20:28〜23:20:45 UTC。生成SQLは`deploy/inquiry-platform/storage-migrations`に保管。

| 保存先 | prefix | Supportスレッド | 通報 | cases（結合済みを含む） | 17表の合計行数 |
|---|---|---:|---:|---:|---:|
| unassigned | p_product00 | 0 | 0 | 0 | 0 |
| tmkch-io | p_product01 | 5 | 0 | 5 | 43 |
| remeet | p_product02 | 15 | 7 | 17 | 293 |
| colorvia | p_product03 | 1 | 0 | 1 | 12 |
| yohaku | p_product04 | 0 | 0 | 0 | 0 |
| tomokichi-diary | p_product05 | 1 | 0 | 1 | 11 |
| zakkary | p_product06 | 19 | 3 | 19 | 317 |
| 合計 | 119専用表 | 41 | 10 | 43 | 676 |

件数だけでなく、全119表の全列を双方向EXCEPTで照合して差分0を確認した。
切替の各トランザクションでも全列・列構造・物理FKを再検査。切替後も外部キー違反0、未準備service 0。
ローカル復元の`integrity_check`も正常。本番D1では許可された`foreign_key_check`を使用した。

過去に共通受信箱の案件をRemeet通報へ結合した履歴が1件あり、異なる所有者のFKとしてリハーサルで停止した。
0020で既存の結合先・redirect・元の所有者をassertし、元のcaseとthreadの所属を結合先へ整合させた。
ID・本文・メッセージ・結合・日時を削除せず、metadataのみの監査行を追加。修復後に全工程を再リハーサルした。

本番Service Bindingの認証付き一時previewから次を検証した（応答は件数と検証結果のみ）。

- Studio scoped Core: Ticket一覧22件、Report一覧7件、Support詳細15件、Report詳細、ダッシュボード・監査・配送ジョブ。
- Remeet/Zakkary/DiaryのProjectOperator: 一覧16/19/1件と既存Ticket詳細。Remeetの結合済み1件は通常一覧に出ない。
- StudioからZakkaryのID、RemeetからZakkaryのID、未許可slug、未知slugは拒否。
- 期限内の既存R2証跡1件を取得し、バイト数・SHA-256が移行済みmetadataと一致。
- 配送ジョブはinbound_email 1件、notification_push 1件がcompleted。未完了・失敗0。
- 未認証: Studio APIはAccessへ302、Zakkaryのsessionは401、Zakkary API readyは200。

実際のメール送信・コンテンツ削除を伴う本番テストは実行していない。
受付・返信/受信・冪等性・通知・署名Adapter障害/再試行は基盤CIの356テストで検証。
Studio最終版は管理画面39テストと型検査・build、API125テスト、Zakkary管理画面16テストと型検査・buildを通過。
Diaryは既存SDKとCoreの契約を保ち、既存連携16テストを通過し、ソース変更・再デプロイは不要だった。

StudioのSDK/coreをv0.9.0タグへ固定し、管理UIは通報専用画面・権限・一般Ticketのドメイン制約に対応。
Zakkary管理UIはserverのallowedStatusesに従う。Zakkary APIのSDKは既存のまま互換。
並行更新のStudio main `a312a83`の配送復旧画面・mail-ingressの原文メール復旧bindingも保持した。

## 本番Worker versions

| Worker | Version |
|---|---|
| tomokichi-admin-core | 4e875fa3-e300-43df-82ae-547aa870f115 |
| tomokichi-admin-web | e031772a-0315-4154-a31d-f3b78ea7432b |
| tomokichi-mail-ingress | cc15796f-a692-49da-b4c5-2d5bd7530b4f |
| tomokichi-admin | c5cf30a2-62d1-4fee-8402-22b8bd731709 |
| tomokichi-api | ac5c9bed-d364-4fc9-9e2e-bfe2baf60497 |
| zakkary-admin | f0377193-7aa0-4c04-9e42-9e85dbd2c0dc |

Studio最終コミット`0effc49`の[CI後の既存Deploy workflow](https://github.com/tomoki013/tomokichi-studio/actions/runs/38824092843)も全job成功。
ロックファイル更新により既存設定どおりStudio APIとブランドサイトが再デプロイされ、APIの最終versionを上表に反映した。
その後もStudio APIはAccessへ302、Zakkary sessionは401、Zakkary API readyは200。
一時検証previewは終了済み。

## バックアップと復旧

移行前bookmark: `00001ec4-000002da-00005105-668269929f44ddfea6782fd177930011`。
移行後bookmark: `00001ec4-0000065e-00005105-14b6d524f6800c06e5d9bcd5b682cffa`。
移行前Core: `dcd786ee-c058-434b-b950-bb66f8efa919`。

Owner端末の`~/.local/share/inquiry-platform/backups/20261015T2256Z/`に前後のSQLをAES-256-GCMで保管。
鍵は別の`~/.config/inquiry-platform/backup-keys/`に0600、両ディレクトリは0700。manifestにhash、復旧bookmark、形式、鍵パスを記録。
移行前バックアップの復号・hashと移行後バックアップの復元を検証し、一時平文SQL/SQLiteは削除した。
保持期限は2026-11-16。継続保管の要否を判断してからバックアップと対応鍵を一緒に管理する。
SQL本文や鍵はGitへ入れていない。表別の全列照合結果（metadataのみ）はこの実行記録と同じディレクトリのJSONに保存。

**active後の正は専用表。旧タグへ戻して書き込まない。** 対応releaseを修正して前進復旧する。
DB全体のTime Travelは他Projectも巻き戻すため、停止・差分保全・復旧レビューなしに実行しない。
新Projectやschema変更は[デプロイ側手順](../../deploy/inquiry-platform/STORAGE-MIGRATION.md)と基盤の運用手順に従う。
