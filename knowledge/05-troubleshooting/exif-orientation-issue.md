# EXIF方向問題の解決

## 問題の概要

画像最適化時に、一部の画像が90度または-90度回転してしまう問題が発生しました。

**発生日**: 2024年8月22日
**影響範囲**: メンバー画像の一部

## 原因

ImageMagickで画像を最適化する際、`-strip`オプションでメタデータを削除していましたが、
EXIF方向情報も一緒に削除されてしまうため、ブラウザで表示した際に画像が回転して表示される問題が発生しました。

### 問題のあるコマンド

```bash
convert "$file" \
    -resize "${MAX_WIDTH}>" \
    -quality $QUALITY \
    -strip \              # EXIF情報を削除（方向情報も失われる）
    "$output_file"
```

## 解決方法

`-auto-orient`フラグを追加して、EXIF方向情報を物理的に画像に適用してからメタデータを削除するようにしました。

### 修正後のコマンド

```bash
convert "$file" \
    -auto-orient \        # EXIF方向を物理的に適用
    -resize "${MAX_WIDTH}>" \
    -quality $QUALITY \
    -strip \              # メタデータを安全に削除
    "$output_file"
```

## 技術的な詳細

### -auto-orientフラグの動作

1. EXIF Orientationタグを読み取り
2. 必要に応じて画像を物理的に回転/反転
3. Orientationタグを「1」（通常）にリセット
4. その後の`-strip`で安全にメタデータを削除可能

### EXIF Orientationの値

| 値 | 意味 | 必要な操作 |
|----|------|-----------|
| 1 | 正常 | なし |
| 3 | 180度回転 | 180度回転 |
| 6 | 90度時計回り | 反時計回りに90度回転 |
| 8 | 90度反時計回り | 時計回りに90度回転 |

## 影響と修正

### 影響を受けたファイル

- `1_lsFVbg4Cfp3kJCk4xmDzP5JjbwtJ8B1.jpg`（90度回転）
- `12m7FA_pIg561jey0q-OFPPxWT3U5bAuL.jpg`（-90度回転）
- その他複数のメンバー画像

### 修正手順

1. Git resetで元の画像に戻す
2. 統合スクリプト`optimize-images.sh`に`-auto-orient`を追加
3. 再度最適化を実行

## 予防策

1. **画像最適化時は必ず`-auto-orient`を使用**
   - 全ての最適化スクリプトに適用済み

2. **テスト実行の推奨**
   - 大量の画像を処理する前に少数でテスト
   - dry-runモードの活用

3. **Git管理の活用**
   - 変更前後で`git diff`で確認
   - 問題があれば`git checkout`で復元

## 関連ドキュメント

- [画像最適化ガイド](../04-operations/image-optimization.md)
- [画像最適化戦略](../06-decisions/005-image-optimization-strategy.md)