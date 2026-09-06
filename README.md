# Club TRIAX Homepage

[![pages-build-deployment](https://github.com/triax/homepage/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/triax/homepage/actions/workflows/pages/pages-build-deployment)
[![Update Instagram Feed](https://github.com/triax/homepage/actions/workflows/fetch-instagram-posts.yml/badge.svg)](https://github.com/triax/homepage/actions/workflows/fetch-instagram-posts.yml)

Club TRIAXの公式ウェブサイトのソースコードです。

## 🌐 サイト

- **本番環境**: https://www.triax.football/
- **カスタムドメイン**: www.triax.football
- **GitHub Pages URL**: https://triax.github.io/homepage/ (カスタムドメインへリダイレクト)
- **リポジトリ**: https://github.com/triax/homepage

## 🚀 開発環境のセットアップ

### 前提条件

- Node.js (v14以上推奨)
- pnpm

### インストール

```bash
# 依存関係のインストール
pnpm install

# ローカルサーバーの起動
pnpm dev
```

ブラウザで http://localhost:3000 にアクセスしてください。

## 📸 メンバー情報・画像

メンバーのプロフィールと写真は [hub](https://hub.triax.football/) で各自が編集し、GitHub Pages のビルド時に公開 API から取得します。`docs/assets/roster.json` と `docs/assets/members/` はビルド生成物のためリポジトリには含まれません。

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

最新のInstagram投稿を自動取得・表示します。

### 自動更新

- **投稿取得**: 12時間ごと（media_url有効期限対策）
- **トークン更新**: 不要（Page Access Tokenは無期限）

### 手動実行コマンド

```bash
# Instagram投稿を取得
pnpm instagram:fetch
```

詳細は[Instagram連携ドキュメント](knowledge/02-architecture/instagram-integration.md)を参照。

### よく使うコマンド

```bash
# hub からメンバー情報・写真を取得して生成物を作る
HUB_API_KEY=<key> pnpm build:members
```

`HUB_API_KEY` は hub の公開 API キー。GitHub Actions では `secrets.HUB_API_KEY` から注入されます。取得できなかった場合はビルドを失敗させ、空のメンバー一覧で公開を上書きしません。

詳細は [hub-members-sync.md](knowledge/04-operations/hub-members-sync.md) を参照してください。

## 📁 プロジェクト構造

```
/
├── docs/              # GitHub Pages用ファイル
│   ├── assets/
│   │   └── members/   # メンバー画像（ビルド生成物・git管理外）
│   └── index.html     # メインページ
├── scripts/           # 管理用スクリプト
├── specs/             # デザイン仕様書
└── package.json       # npm設定
```

## 🔧 技術スタック

- **フロントエンド**: HTML5, Tailwind CSS (CDN), jQuery
- **ホスティング**: GitHub Pages (カスタムドメイン: www.triax.football / GitHub Actions ビルド配信)
- **画像管理**: Node.js スクリプト + ImageMagick
- **メンバーデータ**: [hub](https://hub.triax.football/) の公開 API（ビルド時取得）
- **DNS/SSL**: Squarespace Domains + GitHub Pages自動SSL証明書

## 📝 開発ガイドライン

詳細な開発ガイドラインは [CLAUDE.md](./CLAUDE.md) を参照してください。

## 🚢 デプロイ

mainブランチへのプッシュで自動的にGitHub Pagesにデプロイされます。

## 📄 ライセンス

MIT
