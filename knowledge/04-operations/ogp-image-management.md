# OGP画像管理

## 概要

Open Graph Protocol用の画像ファイル管理と運用手順。

## ファイル構成

### ディレクトリ構造
```
docs/
└── assets/
    └── ogp/
        └── default.jpg  # デフォルトOGP画像
```

### 画像仕様

#### 技術仕様
- **推奨サイズ**: 1200 x 630px
- **アスペクト比**: 1.91:1
- **ファイル形式**: JPEG または PNG
- **最大ファイルサイズ**: 5MB
- **最小サイズ**: 600 x 315px

#### 現在の画像
- **ファイル名**: `default.jpg`
- **実サイズ**: 1920 x 978px
- **ファイルサイズ**: 約670KB
- **内容**: スタジアムでの円陣写真 + TRIAXロゴ

## 画像作成ガイドライン

### デザイン要件

1. **ブランディング要素**
   - TRIAXロゴを含める
   - チームカラーを使用
   - 理念「LIFE・WORK・PLAY」を視覚的に表現

2. **コンテンツ要件**
   - チームの特徴が伝わる内容
   - 「個人の充実」の価値観を反映
   - プロフェッショナルな印象

3. **技術的考慮事項**
   - モバイルでの視認性を確保
   - テキストは最小限に
   - 高コントラストで視認性を確保

### 作成手順

1. **素材準備**
   ```bash
   # 既存のヘッダー画像やチーム写真から選定
   ls docs/assets/headers/
   ls docs/assets/gallery/
   ```

2. **画像編集**
   - 推奨サイズ（1200x630px）にリサイズ
   - ロゴやテキストをオーバーレイ
   - 必要に応じて色調補正

3. **最適化**
   ```bash
   # ImageMagickを使用した最適化例
   convert input.jpg -resize 1200x630 -quality 85 output.jpg
   ```

4. **配置**
   ```bash
   # OGPディレクトリに配置
   mv output.jpg docs/assets/ogp/default.jpg
   ```

## 画像更新手順

### 1. 新規画像の作成
上記のガイドラインに従って新しいOGP画像を作成

### 2. ファイルの配置
```bash
# 既存画像のバックアップ（オプション）
cp docs/assets/ogp/default.jpg docs/assets/ogp/default_backup.jpg

# 新規画像の配置
cp new_ogp_image.jpg docs/assets/ogp/default.jpg
```

### 3. HTMLメタタグの確認
```html
<!-- docs/index.html -->
<meta property="og:image" content="https://www.triax.football/assets/ogp/default.jpg">
<meta name="twitter:image" content="https://www.triax.football/assets/ogp/default.jpg">
```

### 4. デプロイとテスト
```bash
# コミットとプッシュ
git add docs/assets/ogp/
git commit -m "OGP画像を更新"
git push origin main
```

### 5. SNSキャッシュのクリア
各プラットフォームのデバッグツールでキャッシュをクリア：
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

## 複数画像の管理（将来的な拡張）

### ページ別OGP画像
将来的に個別ページが作成される場合の構成例：

```
docs/assets/ogp/
├── default.jpg       # トップページ用
├── members.jpg       # メンバーページ用
├── schedule.jpg      # スケジュールページ用
└── recruit.jpg       # リクルートページ用
```

### 季節・イベント別画像
特別なイベントやシーズンに応じた画像：

```
docs/assets/ogp/
├── default.jpg       # 通常時
├── season-start.jpg  # シーズン開幕時
├── playoff.jpg       # プレーオフ時
└── recruit-2025.jpg  # リクルート期間
```

## トラブルシューティング

### 画像が表示されない場合

1. **URLの確認**
   - 絶対URLが正しく設定されているか
   - HTTPSでアクセス可能か

2. **ファイルの存在確認**
   ```bash
   ls -la docs/assets/ogp/default.jpg
   ```

3. **権限の確認**
   ```bash
   # ファイルが読み取り可能か確認
   chmod 644 docs/assets/ogp/default.jpg
   ```

### キャッシュの問題

1. **URLにパラメータを追加**
   ```html
   <meta property="og:image" content="https://www.triax.football/assets/ogp/default.jpg?v=2">
   ```

2. **ファイル名を変更**
   ```bash
   mv default.jpg default_v2.jpg
   # HTMLも更新
   ```

### サイズの問題

1. **現在のサイズを確認**
   ```bash
   identify docs/assets/ogp/default.jpg
   ```

2. **リサイズ**
   ```bash
   convert default.jpg -resize 1200x630^ -gravity center -extent 1200x630 resized.jpg
   ```

## ベストプラクティス

1. **バージョン管理**
   - Git LFSの使用を検討（大きな画像ファイルの場合）
   - 変更履歴を明確にコミットメッセージに記載

2. **パフォーマンス**
   - 画像サイズと品質のバランスを取る
   - 1MB以下を目標とする

3. **アクセシビリティ**
   - 画像内のテキストは最小限に
   - コントラストを確保

4. **テスト**
   - 複数のSNSプラットフォームで確認
   - モバイルとデスクトップ両方で確認

## 関連ドキュメント

- [OGPメタタグ仕様](../02-architecture/ogp-meta-tags.md)
- [チーム理念・価値観](../07-team-culture/team-philosophy.md)
- [画像最適化](./image-optimization.md)