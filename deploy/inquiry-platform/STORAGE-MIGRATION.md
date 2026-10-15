# 共通D1のProject専用テーブルへの移行

2026-10-16にv0.9.0（基盤79375dd）で本番適用済み。
結果と復旧上の注意は [実行記録](../../docs/inquiry-platform/storage-isolation-2026-10-16.md)。

`storage-plan.json` がこのデプロイのslugとprefixの許可リスト。slugをテーブル名に変換しない。
`storage-migrations/0020..0042` は基盤のオフラインgeneratorから生成し、レビューしたSQL。
0020だけは復旧用serviceと、過去の結合の所有者を整合させるデプロイ固有の前進修復。
基盤の共有migrationに実在のProject名を入れない。

## 再現手順

バックアップ・復元リハーサル後、基盤0015〜0019 → 対応Core/gateway/mail-ingress → 古い返信RPCのドレイン
→ 次の各段階、の順。各段階の結果を確認して次へ進む。すでに適用済みの段階は再適用しない。

```sh
export INQUIRY_PLATFORM_CHECKOUT=/path/to/verified/inquiry-platform-v0.9.0
node deploy/inquiry-platform/storage-apply.mjs apply preflight
node deploy/inquiry-platform/storage-apply.mjs apply prepare
node deploy/inquiry-platform/storage-apply.mjs apply copy
STORAGE_VERIFICATION_OUTPUT=/private/path/verification.json node deploy/inquiry-platform/storage-apply.mjs verify
node deploy/inquiry-platform/storage-apply.mjs apply cutover
# 切替後の読取、スコープ、受信/送信経路、配送ジョブを確認してからseal
node deploy/inquiry-platform/storage-apply.mjs apply seal
```

ランナーは適用履歴を照会し、各SQLとその`d1_migrations`マーカーを1つのD1 file importで原子的に適用する。
prepareは約115KBなので、100KBのinline query上限を避けてfile importを使う。
cutoverの全53statementも分割しない。[Cloudflareのimport/export仕様](https://developers.cloudflare.com/d1/best-practices/import-export-data/)を参照。
applyは適用済みmigrationをスキップする。未適用ファイルの失敗は当該ファイル全体を戻し、原因を修復して再実行する。

copy後に新着の親子追従が保留されて照合が失敗した場合、copying状態のProjectだけにgeneratorの表別copyを再実行する。
生成SQL自体は冪等で、activeのProjectでは何もコピーしない。履歴マーカーは書き直さない。
`verify`は切替前の照合用。active後の正は専用表なので、新着があれば旧表と一致しなくてよい。

SQL生成はオフラインでもできる。

```sh
node deploy/inquiry-platform/storage-plan.mjs prepare remeet > prepare.sql
node deploy/inquiry-platform/storage-plan.mjs copy remeet support_threads 1000 > copy-threads.sql
node deploy/inquiry-platform/storage-plan.mjs verify remeet > verify.sql
node deploy/inquiry-platform/storage-plan.mjs cutover remeet > cutover.sql
```

新Projectはapps/service登録、seed、許可リストと新しいprefix、次の未使用migration番号で
prepare/copy/verify/cutover、Binding props登録の順。seal後は未準備Projectへの受付を拒否する。
既存migrationを編集・再利用せず、基盤のschema変更も全active prefixへforward-onlyで適用する。

## 復旧

active後は専用表を正として前進修復する。旧releaseへの書込rollback、stateをcopyingへ戻す操作、旧表からの上書きをしない。
DB全体をTime Travelで戻すと全Projectを巻き戻す。全受付・ジョブを止め、移行後の変更を保全してから別途復旧計画を作る。
R2の既存オブジェクトは移動・削除していない。旧`reports/`の30日lifecycleも維持し、新しい証跡はCoreの保持処理で管理する。

詳細は対応releaseの`docs/operations/project-storage.md`。
