# 実装計画 - テーブルコピー Chrome拡張

## タスク一覧

- [x] tasks/todo.md 作成
- [x] tasks/lessons.md 作成
- [x] manifest.json 作成
- [x] src/formatter.js 作成
- [x] src/content.js 作成
- [x] src/content.css 作成
- [x] src/background.js 作成
- [x] popup/popup.html, popup.js, popup.css 作成
- [x] icons/ プレースホルダPNG生成
- [x] README.md 作成
- [x] node --check で構文検証
- [x] JSON.parse で manifest.json 検証

## 完了レビュー

- 全ファイル作成済み
- node --check: formatter.js, content.js, background.js, popup.js すべてOK
- JSON.parse: manifest.json OK
- アイコン: 16/48/128px 青色プレースホルダPNG生成済み
- バグ修正済み (2026-05-30):
  - mousedown の無条件 preventDefault を除去。インタラクティブ要素除外、ドラッグ時のみ選択抑制に変更
  - 結合セル座標を展開後グリッド座標に統一 (buildCellMap 導入)
  - テーブル離脱時の copytables-cell-hover 残留を修正

## v1.1.0 レビュー (2026-05-30)

- [x] 非連続な複数行/列/セルの Cmd/Ctrl+クリック トグル選択
- [x] getGridForSelection を行/列index集合方式に変更(非連続→詰めて出力)
- [x] UI文言を全て英語化 (manifest, popup, toast, context menu, README)
- [x] 機能ON/OFF (デフォルトOFF, storage, badge, popup toggle)
- [x] node --check 全JS OK, manifest.json JSON.parse OK
- [x] 非連続グリッド出力を Node で検証済み

## v1.2.0 レビュー (2026-05-30)

- [x] セレクタバー(Excel風ガター)で行/列選択を可視化
- [x] 旧5pxハンドル判定を廃止、バークリックでトグル選択(修飾キー不要)
- [x] 左上コーナーボタンで全体選択(旧⊞ボタン統合)
- [x] ポップアップ廃止→アイコンクリックでON/OFFトグル
- [x] バッジ: ON=緑"ON", OFF=グレー"OFF"
- [x] 初回ON時ヒントトースト表示(hintShown で1回のみ)
- [x] scroll/resize でバー位置再計算
- [x] popup/ 削除、manifest から dangling 参照なし
- [x] node --check 全JS OK, manifest.json JSON.parse OK

## v1.2.1 修正 (2026-05-30)

- [x] フローティングツールバーが行/列バーと重なる問題を修正(選択範囲のバウンディングボックス基準で下側配置、はみ出し時のみ上側にバー高さ14pxを避けて配置)
