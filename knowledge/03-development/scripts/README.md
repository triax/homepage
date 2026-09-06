# スクリプト開発ガイド

## 概要

プロジェクトで使用する各種自動化スクリプトの開発・管理ガイドライン。

## スクリプト一覧

### メンバー情報・画像

- `build-members.ts` - hub の公開APIからメンバーデータと写真を取得し、`docs/assets/roster.json` と `docs/assets/members/` を生成する（生成物は git 管理外）

### ギャラリー管理

- `optimize-gallery.sh` - ギャラリー画像の最適化とリネーム
- `generate-gallery-html.js` - ギャラリーHTMLコード生成

## 開発規約

### 命名規則

- **TypeScript**: `kebab-case.ts`
- **JavaScript**: `kebab-case.js`
- **Shell**: `kebab-case.sh`
- 動詞で始める（download-, check-, generate-）

### エラーハンドリング

```javascript
// 成功/失敗を明確に表示
console.log("✅ Success message");
console.error("❌ Error message");
```

### 出力形式

```javascript
// ヘッダーを表示
console.log("🖼️  Script Title");
console.log("==============");

// プログレス表示
console.log("📸 Processing...");

// 結果サマリー
console.log("📊 Summary:");
```

## Shellスクリプトのベストプラクティス

### シェバンとオプション

```bash
#!/bin/bash
set -euo pipefail  # エラー時に停止
```

### 変数定義

```bash
# 定数は大文字
GALLERY_DIR="docs/assets/gallery"
BACKUP_DIR="$GALLERY_DIR/original"
```

### エラーチェック

```bash
# コマンドの存在確認
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick not found"
    exit 1
fi
```

## Node.jsスクリプトのベストプラクティス

### ファイル構成

```javascript
#!/usr/bin/env node

// 1. 依存関係
const fs = require("fs");
const path = require("path");

// 2. 定数定義
const GALLERY_DIR = path.join(__dirname, "../docs/assets/gallery");

// 3. ヘルパー関数
function helperFunction() {}

// 4. メイン処理
function main() {}

// 5. 実行
main();
```

### 非同期処理

```javascript
// async/awaitを使用
async function processImages() {
  try {
    const result = await someAsyncOperation();
    console.log("✅ Success");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}
```

## 画像処理スクリプトの共通パターン

### ImageMagickの使用

```bash
# 基本的な最適化コマンド
convert input.jpg \
    -resize "1920>" \      # 最大幅
    -quality 85 \          # 品質
    -interlace Plane \     # プログレッシブ
    -strip \               # メタデータ削除
    output.jpg
```

### バックアップ戦略

```bash
# オリジナルを保存
if [ ! -f "$BACKUP_DIR/$file" ]; then
    cp "$file" "$BACKUP_DIR/$file"
fi
```

## テスト方法

### Shellスクリプト

```bash
# 実行権限を付与
chmod +x scripts/script-name.sh

# dry-runモードでテスト
./scripts/script-name.sh --dry-run
```

### Node.jsスクリプト

```bash
# 直接実行
node scripts/script-name.js

# デバッグモード
NODE_ENV=development node scripts/script-name.js
```

## npm scriptsへの登録

`package.json`に追加：

```json
{
  "scripts": {
    "img:optimize": "./scripts/optimize-gallery.sh",
    "gallery:html": "node scripts/generate-gallery-html.js"
  }
}
```

## ドキュメント化

各スクリプトには以下を含める：

1. **用途説明**（ファイル冒頭のコメント）
2. **使用方法**
3. **必要な依存関係**
4. **オプション/引数の説明**
5. **出力例**

## セキュリティ考慮事項

- ユーザー入力は必ず検証
- ファイルパスはサニタイズ
- 環境変数で機密情報を管理
- 実行権限は最小限に

## 関連ドキュメント

- [gallery-management.md](/knowledge/04-operations/gallery-management.md)
- [hub-members-sync.md](/knowledge/04-operations/hub-members-sync.md)
