# Development - 開発ガイド

## 📌 概要

開発環境のセットアップ、コーディング標準、実装パターンなど、開発に必要な情報を集約します。

## 📂 構成

- `setup.md` - 開発環境セットアップ（作成予定）
- `coding-standards.md` - コーディング規約（作成予定）
- `git-workflow.md` - Git運用ルール（作成予定）
- `component-patterns/` - コンポーネント実装パターン
  - `navigation.md` - ナビゲーション実装（作成予定）
  - `responsive.md` - レスポンシブデザイン（作成予定）
  - `image-handling.md` - 画像処理方法（作成予定）
- `scripts/` - スクリプト使用方法
  - `image-management.md` - 画像管理スクリプト（作成予定）
  - メンバー情報同期 → [hub-members-sync.md](/knowledge/04-operations/hub-members-sync.md)

## 🚀 クイックスタート

### 開発環境構築

```bash
# リポジトリのクローン
git clone https://github.com/triax/homepage.git
cd homepage

# 依存関係のインストール
npm install

# ローカルサーバー起動
npx http-server docs -p 3000
```

### 主要コマンド

```bash
# メンバー情報・写真を hub から取得（生成物は git 管理外）
HUB_API_KEY=<key> npm run build:members

# コード品質
npm run lint         # ESLint実行
npm run format:check # フォーマット確認
```

## 🔍 使い方

1. 新規開発者は `setup.md` から開始
2. 実装前に `coding-standards.md` を確認
3. 共通パターンは `component-patterns/` を参照

## ✏️ 更新ルール

- 新しい開発パターンは随時追加
- スクリプトの仕様変更は即座に反映
- ベストプラクティスは定期的に見直し

## 🔗 関連リンク

- [要件定義](../01-requirements/)
- [運用手順](../04-operations/)
- [トラブルシューティング](../05-troubleshooting/)

## 📅 最終更新

- 日付: 2025-01-21
- 更新者: Claude
- 変更内容: 初期作成
