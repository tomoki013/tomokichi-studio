# 配送・取り込みの復旧

inquiry-platform v0.8.0をAPI・AdminのSDK/core参照に固定する。`deploy/inquiry-platform/mail-ingress.jsonc`にはCoreと同じ既存のprivate R2 bucketを追加する。Worker・D1・bucketを分割する変更ではない。

反映順序はD1 private backupと現在のWorker version記録 → `pnpm deploy:inquiry check` → `pnpm deploy:inquiry migrate`（0014）→ `pnpm deploy:inquiry deploy all` → Admin UIの反映。seedは不要。

横断管理画面の「配送・取り込みの失敗」からProject・処理種別・状態・試行回数を確認できる。operator/adminは手動再処理が可能で、viewerは閲覧だけ。受信原本の30日期限が過ぎた処理は再処理できない。新着通知と受信取り込みを最大8回試し、原本は取り込み完了後に削除する。

マスタ設定の履歴には変更前・変更後を表示する。旧形式の履歴も閲覧できる。メール本文・アドレス・添付・生の応答は失敗一覧や障害通知に出さない。

復旧時は前のWorker versionへ戻す。D1追加テーブルと未処理原本は削除しない。詳細な再試行間隔・lease・R2障害やサイズ上限の扱いは基盤の`docs/operations/delivery-jobs.md`を参照。
