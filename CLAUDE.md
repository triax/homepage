# CLAUDE.ja.md

このファイルは、このリポジトリで作業する際のClaude Code (claude.ai/code)へのガイダンスを提供します。

## プロジェクト概要

これはGitHub Pagesでホスティングされるアメリカンフットボールクラブ「Club TRIAX」の静的ウェブサイトです。使用技術：
- HTML5
- Tailwind CSS (CDN経由)
- jQuery 3.7.1 (CDN経由)

## 一般的な開発タスク

### ローカル開発

これは静的HTMLサイトなので、`index.html`を直接ブラウザで開くか、シンプルなHTTPサーバーを使用できます：

```bash
npx http-server
```

### デプロイメント
mainブランチへのプッシュ時に、GitHub Pagesへ自動的にデプロイされます。

## プロジェクト構造

```
/
├── index.html        # メインホームページファイル
├── README.md         # GitHub Pagesデプロイメントバッジを含む
├── assets/          
│   ├── headers/     # 各セクション用ヘッダー画像
│   └── ogp/         # Open Graph Protocol画像
├── docs/
│   ├── assets/
│   │   └── members/ # メンバー画像（Google Drive IDをファイル名に使用）
│   └── index.html   # GitHub Pages用HTMLファイル
├── scripts/         # 管理用Node.jsスクリプト
│   ├── download-all-images.js    # 画像ダウンロード・同期
│   ├── check-image-sync.js       # 同期状態チェック
│   ├── cleanup-unused-images.js  # 不要画像削除
│   ├── create-image-mapping.js   # 画像マッピング作成
│   └── check-missing-images.js   # 画像表示チェック（要Playwright）
└── specs/           # デザイン仕様と要件
    ├── pages/       # 個別ページ仕様
    └── *.md         # 各種仕様書
```

## 開発ガイドライン

1. **モバイルファーストデザイン**: スマートフォンユーザーを主要対象としています。モバイルファーストアプローチでレスポンシブデザインを使用してください。

2. **シングルページアーキテクチャ**: ホームページは縦スクロール型の1ページ構成で、必要に応じて詳細ページへ遷移します。

3. **ナビゲーション**: モバイルフレンドリーなインターフェースのため、ハンバーガーメニューナビゲーションを実装します。

4. **スタイリング**: Tailwind CSSユーティリティクラスを使用します。CDN版は既にindex.htmlに含まれています。

5. **JavaScript**: DOM操作とイベント処理にjQueryが利用可能です。

6. **アセット**: ヘッダー画像は`assets/headers/`に特定の名前で保存されています（TOP.jpg、MEMBERS.jpg、NEWS.jpgなど）

7. **バージョン管理**: mainブランチがデプロイに使用されます。GitHub Pagesで公開される前に必ず変更をコミットしてください。
   - **コミットメッセージ**: 日本語でコミットメッセージを作成してください。明確で簡潔な説明を心がけてください。

## 画像管理スクリプト

メンバー画像の管理を自動化するためのNode.jsスクリプトが用意されています。

### 主要コマンド

```bash
# 画像の同期状態をチェック
npm run img:check

# 不足している画像をダウンロード
npm run img:download

# 不要な画像を削除（確認モード）
npm run img:cleanup

# 不要な画像を削除（実行）
npm run img:cleanup:force

# ダウンロードと削除を同時に実行（完全同期）
npm run img:sync
```

### スクリプトの詳細

1. **download-all-images.js**
   - Roster API から画像をダウンロード
   - 既存ファイルのスキップ機能
   - 同期モード（--sync）で不要ファイルも削除

2. **check-image-sync.js**
   - APIと実際のファイルを比較
   - 不足/余分な画像を特定
   - 同期率を表示

3. **cleanup-unused-images.js**
   - APIに存在しない画像を削除
   - デフォルトはdry-runモード
   - --forceで実際に削除

4. **create-image-mapping.js**
   - Google Drive IDとファイル名のマッピングを作成
   - docs/image-mapping.json に出力

5. **check-missing-images.js**
   - ブラウザで実際の表示をチェック（要Playwright）
   - ローカルサーバー起動が必要

### 画像ファイルの命名規則

- ファイル名: `{Google Drive ID}.{拡張子}`
- 例: `1RkyEPOq0CELzOCIICoanFWrFYnWD_bZ5.jpg`
- Google Drive IDはRoster APIから取得

## 主要なデザイン仕様

プロジェクトはspecs/ディレクトリに記載された特定のデザイン要件に従います：
- モバイルファーストのレスポンシブデザイン
- チームメンバーの物語と個性に焦点を当てる
- ソーシャルメディア（Instagram）との連携
- 多言語コンテンツの考慮のサポート