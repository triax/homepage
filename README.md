# Club TRIAX Homepage

[![pages-build-deployment](https://github.com/triax/homepage/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/triax/homepage/actions/workflows/pages/pages-build-deployment)

Club TRIAXの公式ウェブサイトのソースコードです。

## 🌐 サイト

- **本番環境**: https://www.triax.football/
- **カスタムドメイン**: www.triax.football
- **GitHub Pages URL**: https://triax.github.io/homepage/ (カスタムドメインへリダイレクト)
- **リポジトリ**: https://github.com/triax/homepage

## 🚀 開発環境のセットアップ

### 前提条件

- Node.js (v14以上推奨)
- npm

### インストール

```bash
# 依存関係のインストール
npm install

# ローカルサーバーの起動
npx http-server
```

ブラウザで http://localhost:8080 にアクセスしてください。

## 📸 画像管理

メンバー画像は [Roster API](https://github.com/triax/roster-api) と同期して管理されています。

## 🤝 スポンサー

スポンサー企業の画像とリンクは`docs/assets/sponsors/`ディレクトリで管理されています。3つのTier（階層）で表示され、支援レベルに応じて表示サイズが異なります。

## 📷 フォトギャラリー

チーム写真は`docs/assets/gallery/`で管理。自動最適化スクリプト付き。

```bash
# 画像の最適化とリネーム
./scripts/optimize-gallery.sh

# HTMLコード生成
node scripts/generate-gallery-html.js
```

詳細は[ギャラリー管理手順書](knowledge/04-operations/gallery-management.md)を参照。

## 📱 Instagram連携

[![Update Instagram Feed](https://github.com/triax/homepage/actions/workflows/fetch-instagram-posts.yml/badge.svg)](https://github.com/triax/homepage/actions/workflows/fetch-instagram-posts.yml)
[![Refresh Instagram Token](https://github.com/triax/homepage/actions/workflows/refresh-instagram-token.yml/badge.svg)](https://github.com/triax/homepage/actions/workflows/refresh-instagram-token.yml)

最新のInstagram投稿を自動取得・表示します。

### 自動更新
- **投稿取得**: 12時間ごと（media_url有効期限対策）
- **トークン更新**: 月2回（1日と15日）

### 手動実行コマンド
```bash
# Instagram投稿を取得
npm run instagram:fetch

# Access Tokenを更新（24時間経過後のみ）
npm run instagram:refresh-token
```

詳細は[Instagram連携ドキュメント](knowledge/02-architecture/instagram-integration.md)を参照。

### よく使うコマンド

```bash
# 同期状態をチェック
npm run img:check

# 画像をダウンロード
npm run img:download

# 不要な画像をクリーンアップ
npm run img:cleanup        # dry-run（確認のみ）
npm run img:cleanup:force  # 実際に削除

# 完全同期（ダウンロード＋クリーンアップ）
npm run img:sync
```

### スクリプト一覧

| スクリプト | 説明 |
|-----------|------|
| `img:check` | APIと実際のファイルの同期状態を確認 |
| `img:download` | 不足している画像をダウンロード |
| `img:download:force` | すべての画像を再ダウンロード |
| `img:sync` | ダウンロードと不要ファイル削除を実行 |
| `img:sync:dry` | 同期のシミュレーション |
| `img:cleanup` | 削除対象を確認（dry-run） |
| `img:cleanup:force` | 不要な画像を削除 |
| `img:cleanup:interactive` | 対話形式で削除 |

詳細は各スクリプトファイル冒頭のコメントを参照してください。

## 📁 プロジェクト構造

```
/
├── docs/              # GitHub Pages用ファイル
│   ├── assets/
│   │   └── members/   # メンバー画像
│   └── index.html     # メインページ
├── scripts/           # 管理用スクリプト
├── specs/             # デザイン仕様書
└── package.json       # npm設定
```

## 🔧 技術スタック

- **フロントエンド**: HTML5, Tailwind CSS (CDN), jQuery
- **ホスティング**: GitHub Pages (カスタムドメイン: www.triax.football)
- **画像管理**: Node.js スクリプト
- **データソース**: [Roster API](https://github.com/triax/roster-api)
- **DNS/SSL**: Squarespace Domains + GitHub Pages自動SSL証明書

## 📝 開発ガイドライン

詳細な開発ガイドラインは [CLAUDE.md](./CLAUDE.md) を参照してください。

## 🚢 デプロイ

mainブランチへのプッシュで自動的にGitHub Pagesにデプロイされます。

## 📄 ライセンス

MIT
