# 画像最適化ガイド

## 概要

画像最適化は、ウェブサイトのパフォーマンスとユーザー体験を向上させるために重要です。
本プロジェクトでは、統合画像最適化スクリプトを使用して、異なる種類の画像を適切に最適化します。

## 統合最適化スクリプト

### 使用方法

```bash
# 基本的な使用法
./scripts/optimize-images.sh --target=<directory> [--dry-run]

# 実行例
./scripts/optimize-images.sh --target=docs/assets/members
./scripts/optimize-images.sh --target=docs/assets/gallery
./scripts/optimize-images.sh --target=docs/assets/headers
./scripts/optimize-images.sh --target=docs/assets/sponsors --dry-run
```

### オプション

- `--target=<dir>`: 対象ディレクトリ（必須）
- `--dry-run`: 変更をプレビューするだけで実際には変更しない
- `--help`: ヘルプを表示

## 画像種別ごとの設定

### メンバー画像 (`docs/assets/members`)
- **最大幅**: 800px
- **品質**: 85%
- **リネーム**: なし
- **用途**: メンバー一覧ページのプロフィール写真
- **典型的な削減率**: 90%以上

### ギャラリー画像 (`docs/assets/gallery`)
- **最大幅**: 1920px
- **品質**: 85%
- **リネーム**: 連番（01.jpg, 02.jpg, ...）
- **用途**: フォトギャラリーセクション
- **典型的な削減率**: 92%以上

### ヘッダー画像 (`docs/assets/headers`)
- **最大幅**: 1920px
- **品質**: 90%（高品質維持）
- **リネーム**: なし
- **用途**: 各セクションのヘッダー背景
- **典型的な削減率**: 60%以上

### スポンサー画像 (`docs/assets/sponsors`)
- **最大幅**: 600px
- **品質**: 85%
- **リネーム**: なし
- **用途**: スポンサーロゴ表示
- **典型的な削減率**: 70%以上

## 技術的な詳細

### EXIF方向の処理

画像の向きが正しく保持されるよう、`-auto-orient`フラグを使用しています：

```bash
magick "$file" \
    -auto-orient \           # EXIF情報を適用して物理的に回転
    -resize "${MAX_WIDTH}>" \
    -quality $QUALITY \
    -interlace Plane \       # プログレッシブJPEG
    -strip \                 # メタデータ削除
    -sampling-factor 4:2:0 \ # クロマサブサンプリング
    "$output_file"
```

### ファイルサイズのスキップ閾値

500KB以下のファイルは既に最適化済みとみなしてスキップします。
これにより、不要な再処理を防ぎます。

### バックアップ戦略

Gitでバージョン管理しているため、別途バックアップは作成しません。
必要に応じて以下のコマンドで復元可能です：

```bash
# 特定のディレクトリを復元
git checkout -- docs/assets/members

# 変更内容を確認
git diff docs/assets/members
```

## 実行結果の例

### 2024年8月22日の最適化実績

1. **メンバー画像**
   - 処理前: 260MB
   - 処理後: 29MB
   - 削減率: 89%（86枚最適化）

2. **ギャラリー画像**
   - 処理前: 30.7MB
   - 処理後: 2.4MB
   - 削減率: 92%（28枚最適化）

3. **ヘッダー画像**
   - 処理前: 8.3MB
   - 処理後: 3.2MB
   - 削減率: 61%（5枚最適化）

## トラブルシューティング

### ImageMagickがインストールされていない場合

```bash
# macOSの場合
brew install imagemagick

# Ubuntuの場合
sudo apt-get install imagemagick
```

### 画像が回転してしまう場合

`-auto-orient`フラグが正しく設定されているか確認してください。
このフラグにより、EXIF情報に基づいて画像を正しい向きに物理的に回転させてからメタデータを削除します。

### 最適化後の品質が低すぎる場合

品質パラメータを調整できます：
- ヘッダー画像: 90%（デフォルト）
- その他: 85%（デフォルト）

必要に応じてスクリプト内の`QUALITY`変数を調整してください。

## ベストプラクティス

1. **定期的な最適化**: 新しい画像を追加したら必ず最適化を実行
2. **dry-runの活用**: 実行前に`--dry-run`で影響を確認
3. **Git確認**: 最適化後は`git diff`で変更内容を確認
4. **段階的な実行**: 大量の画像がある場合は、ディレクトリごとに実行

## 関連ドキュメント

- [ギャラリー管理ガイド](./gallery-management.md)
- [画像ダウンロード・同期ガイド](../01-requirements/functional/IMAGES.md)