# Troubleshooting - トラブルシューティング

## 📌 概要

開発・運用中に発生した問題と解決方法を記録し、同じ問題の再発を防ぎます。

## 📂 構成

- `common-issues.md` - よくある問題と解決方法（作成予定）
- `browser-issues/` - ブラウザ別の問題
- `deployment-errors/` - デプロイエラー
- `performance-issues/` - パフォーマンス問題

## 🔥 よくある問題

### 画像が表示されない

**症状**: メンバー画像が404エラー

**原因**:

- `npm run build:members` を実行していない（生成物は git 管理外のため、clone 直後は存在しない）
- hub 側で写真が未登録（この場合は "No Image" プレースホルダが出るのが正常）

**解決方法**:

```bash
# hub からメンバー情報・写真を取得し直す
HUB_API_KEY=<key> npm run build:members
```

詳細は [hub-members-sync.md](/knowledge/04-operations/hub-members-sync.md) の「障害時の見方」を参照。

### GitHub Pages更新されない

**症状**: pushしても変更が反映されない

**原因**:

- GitHub Actionsのエラー
- キャッシュの問題

**解決方法**:

1. GitHub Actionsのログを確認
2. ブラウザキャッシュをクリア
3. 強制リロード（Ctrl+Shift+R）

### スクリプトエラー

**症状**: npm runコマンドが失敗

**原因**:

- Node.jsバージョンの不一致
- 依存関係の問題

**解決方法**:

```bash
# Node.jsバージョン確認
node --version  # v18以上推奨

# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install
```

## 🔍 使い方

1. エラーメッセージで検索
2. 該当カテゴリのフォルダを確認
3. 解決しない場合は新規追加

## ✏️ 更新ルール

- 新しい問題は即座に記録
- 解決方法が見つかったら追記
- 定期的に整理・カテゴリ分け

## 🔗 関連リンク

- [開発ガイド](../03-development/)
- [運用手順](../04-operations/)
- [GitHub Issues](https://github.com/triax/homepage/issues)

## 📅 最終更新

- 日付: 2025-01-21
- 更新者: Claude
- 変更内容: 初期作成と基本的な問題例を追加
