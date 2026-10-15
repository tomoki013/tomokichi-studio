# 共通D1のProject専用テーブルへの移行

`storage-plan.json` がこのデプロイの識別子の許可リスト。slug からテーブル名を生成しない。
既存seedにある5 Projectと既定service、unassignedを含む。実DBに追加のserviceがあれば、承認された
読み取りで棚卸しし、計画にも追加する。基盤コードに運営固有の値を置かない。

移行対応releaseのCore/gateway/mail-ingressを先に検証する。SDKの受付・ProjectOperatorの公開契約は維持される。
この作業では本番DB操作・デプロイを実行しない。

SQL生成はオフラインでできる（例のパスは実際のローカルcheckoutに合わせる）。

```sh
INQUIRY_PLATFORM_CHECKOUT=/path/to/inquiry-platform node deploy/inquiry-platform/storage-plan.mjs prepare remeet > prepare.sql
INQUIRY_PLATFORM_CHECKOUT=/path/to/inquiry-platform node deploy/inquiry-platform/storage-plan.mjs copy remeet > copy.sql
INQUIRY_PLATFORM_CHECKOUT=/path/to/inquiry-platform node deploy/inquiry-platform/storage-plan.mjs verify remeet > verify.sql
INQUIRY_PLATFORM_CHECKOUT=/path/to/inquiry-platform node deploy/inquiry-platform/storage-plan.mjs cutover remeet > cutover.sql
```

出力はデプロイ側で番号付きSQLとしてversion管理する。prepareとcopyは段階的に適用し、全列照合結果を保存する。
cutoverは全チェックとstate更新を必ず1つのD1 migration/batchで適用する。全serviceの切替後に基盤generatorの
`seal` を使って旧保存先へのfallbackを禁止する。生成結果を本番に適用する前に、バックアップ、復旧bookmark、
previewでの件数・FK・メール・署名操作・ID照合、移行中の再送を確認し、明示的な承認を得る。

詳細は対応releaseの `docs/operations/project-storage.md`。実際のデータ量に応じてcopyを表ごとに分割する。
新Projectはapps登録・seed・storage-plan追加・prepare/copy/verify/cutoverの順。新Workerや別D1は増やさない。
切替後は旧releaseに戻して書き込まず、専用表を正に前進修復する。R2の既存オブジェクトは移動しない。
