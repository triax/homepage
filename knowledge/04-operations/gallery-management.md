# ギャラリー管理・運用手順書

## 概要
フォトギャラリーセクションの画像追加・更新・管理手順をまとめた運用ガイド。

## 📸 新しい画像を追加する手順

### 1. 画像の準備
1. 新しい画像を`docs/assets/gallery/`にコピー
2. ファイル名は任意でOK（後で自動リネーム）

### 2. 画像の最適化とリネーム
```bash
# スクリプトを実行
./scripts/optimize-gallery.sh
```

このスクリプトが自動的に：
- 画像を連番（01.jpg, 02.jpg...）にリネーム
- 最大幅1920pxにリサイズ
- 品質85%で圧縮
- プログレッシブJPEG化
- メタデータ削除
- オリジナルを`original/`にバックアップ

### 3. HTMLの更新

#### 方法A: 自動生成（推奨）
```bash
# HTML生成スクリプトを実行
node scripts/generate-gallery-html.js

# 生成されたHTMLをコピー
cat scripts/gallery-html-output.html
```

生成されたHTMLを`docs/index.html`の`<section id="photo-gallery">`と置き換え。

#### 方法B: 手動追加
`docs/index.html`に以下のテンプレートで追加：

```html
<!-- Image XX -->
<div class="gallery-item group relative overflow-hidden shadow-lg">
    <img src="./assets/gallery/XX.jpg"
         alt="Club TRIAX Photo XX"
         class="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110">
    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300"></div>
</div>
```

### 4. 確認
```bash
# ローカルサーバーで確認
npx http-server docs
# http://localhost:8080 にアクセス
```

## 🔧 トラブルシューティング

### 画像が表示されない
- ファイル名が正しいか確認（01.jpg, 02.jpg...）
- パスが正しいか確認（./assets/gallery/）
- ブラウザのキャッシュをクリア

### Lightboxが動作しない
- PC環境（1024px以上）で確認
- JavaScriptエラーがないか開発者ツールで確認
- `initGallery()`が呼ばれているか確認

### 画像が重い
- `optimize-gallery.sh`を実行したか確認
- 元画像が極端に大きくないか確認（推奨: 5MB以下）

## 📊 推奨事項

### 画像選定
- **解像度**: 最低1920x1080px推奨
- **アスペクト比**: 横長推奨（16:9, 4:3など）
- **内容**:
  - チーム活動の様子
  - 試合風景
  - イベント写真
  - 集合写真

### 画像数
- **最小**: 3枚（グリッドレイアウトのため）
- **推奨**: 6-9枚（3の倍数）
- **最大**: 制限なし（パフォーマンスに注意）

### 更新頻度
- シーズン開始時
- 大きなイベント後
- 新メンバー加入時
- 年1-2回の定期更新

## 🛠️ スクリプト一覧

### optimize-gallery.sh
```bash
# 画像の最適化とリネーム
./scripts/optimize-gallery.sh

# 機能:
# - 連番リネーム（01.jpg, 02.jpg...）
# - 画像最適化（リサイズ、圧縮）
# - オリジナルバックアップ
```

### generate-gallery-html.js
```bash
# HTMLコード生成
node scripts/generate-gallery-html.js

# 機能:
# - gallery/内の画像を検出
# - HTMLコードを自動生成
# - 最後の画像の特殊レイアウト対応
```

## 📝 チェックリスト

画像追加時のチェックリスト：

- [ ] 画像を`docs/assets/gallery/`に配置
- [ ] `optimize-gallery.sh`を実行
- [ ] HTMLを更新（自動生成or手動）
- [ ] ローカルで表示確認
- [ ] モバイル表示確認
- [ ] PC表示＆Lightbox動作確認
- [ ] コミット＆プッシュ

## 💡 Tips

### パフォーマンス最適化
- 画像は必ず最適化スクリプトを通す
- 1ページあたり9-12枚程度を上限とする
- 必要に応じて遅延読み込みを検討

### デザインのカスタマイズ
- 高さ変更: `h-64`を`h-48`や`h-72`に
- 間隔変更: `gap-4`を`gap-2`や`gap-6`に
- エフェクト変更: `group-hover:scale-110`を調整

### バックアップ
- オリジナル画像は`gallery/original/`に自動保存
- 定期的に別の場所にもバックアップ推奨

## 関連ドキュメント
- [GALLERY.md](/knowledge/01-requirements/functional/pages/GALLERY.md) - 仕様書
- [docs/index.html](/docs/index.html) - 実装箇所
- [docs/index.js](/docs/index.js) - JavaScript実装