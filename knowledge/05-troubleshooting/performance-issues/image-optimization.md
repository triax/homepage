# 画像最適化のトラブルシューティング

## 概要
Webサイトのパフォーマンス問題の多くは画像に起因します。このガイドでは画像関連の問題と解決方法を説明します。

## よくある問題と解決方法

### 問題1: ページの読み込みが遅い

#### 症状
- 初回読み込みに10秒以上かかる
- 画像が段階的に表示される
- モバイルで特に遅い

#### 原因
- 画像ファイルサイズが大きい（1MB以上）
- 最適化されていない画像

#### 解決方法
```bash
# ギャラリー画像の最適化
./scripts/optimize-gallery.sh

# 手動で最適化（ImageMagick使用）
convert input.jpg -resize "1920>" -quality 85 -strip output.jpg
```

### 問題2: 画像が表示されない

#### 症状
- 画像の代わりに壊れたアイコン
- 404エラー

#### 原因
- パスの間違い
- ファイル名の不一致
- 大文字小文字の違い

#### 解決方法
1. ファイル名を確認
```bash
ls -la docs/assets/gallery/
```

2. HTMLのパスを確認
```html
<!-- 正しい -->
<img src="./assets/gallery/01.jpg">

<!-- 間違い -->
<img src="/assets/gallery/01.jpg">
<img src="assets/gallery/01.JPG">
```

### 問題3: モバイルで画像が大きすぎる

#### 症状
- 横スクロールが発生
- レイアウトが崩れる

#### 原因
- レスポンシブ対応の不足
- 固定幅の指定

#### 解決方法
```html
<!-- Tailwind CSSクラスを使用 -->
<img class="w-full h-auto max-w-full">
```

## パフォーマンス測定

### Chrome DevToolsでの確認
1. F12で開発者ツールを開く
2. Networkタブを選択
3. ページをリロード
4. 画像のサイズと読み込み時間を確認

### 目標値
- **画像サイズ**: 300-600KB以下
- **総ページサイズ**: 3MB以下
- **読み込み時間**: 3秒以内（3G回線）

## 画像フォーマットの選択

### JPEG
- **用途**: 写真、複雑な画像
- **品質設定**: 85%推奨
- **プログレッシブ**: 有効にする

### PNG
- **用途**: ロゴ、アイコン、透過画像
- **圧縮**: TinyPNGなどで圧縮

### WebP（将来的な検討）
- **メリット**: JPEGより25-35%小さい
- **デメリット**: 古いブラウザ非対応

## 最適化のベストプラクティス

### 1. 適切なサイズ
```bash
# 最大幅を制限（1920px推奨）
convert input.jpg -resize "1920>" output.jpg
```

### 2. 適切な品質
```bash
# 品質85%（視覚的劣化なし）
convert input.jpg -quality 85 output.jpg
```

### 3. メタデータ削除
```bash
# EXIF情報などを削除
convert input.jpg -strip output.jpg
```

### 4. プログレッシブJPEG
```bash
# 段階的表示を有効化
convert input.jpg -interlace Plane output.jpg
```

## 自動化ツール

### optimize-gallery.sh
全ギャラリー画像を一括最適化：
```bash
./scripts/optimize-gallery.sh
```

機能：
- 自動リネーム（01.jpg, 02.jpg...）
- サイズ最適化
- オリジナルバックアップ

## チェックリスト

画像追加前の確認事項：

- [ ] 元画像は5MB以下か
- [ ] 幅は3000px以下か
- [ ] 最適化スクリプトを実行したか
- [ ] ローカルで表示確認したか
- [ ] モバイル表示を確認したか

## 緊急時の対応

### サイトが重すぎて開けない
1. 画像を一時的に削除
2. 最適化後に再アップロード

### 容量制限に達した
1. 不要な画像を削除
2. gallery/original/のバックアップを別途保存

## 関連ドキュメント
- [gallery-management.md](/knowledge/04-operations/gallery-management.md)
- [GALLERY.md](/knowledge/01-requirements/functional/pages/GALLERY.md)
- [optimize-gallery.sh](/scripts/optimize-gallery.sh)