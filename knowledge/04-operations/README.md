# Operations - 運用手順

## 📌 概要
本番環境へのデプロイ、コンテンツ更新、メンバー管理など、日常的な運用作業の手順を記録します。

## 📂 構成
- `deployment-process.md` - デプロイ手順（作成予定）
- `content-update.md` - コンテンツ更新方法（作成予定）
- `member-management.md` - メンバー管理手順（作成予定）
- `monitoring.md` - 監視・メトリクス（作成予定）
- `backup-recovery.md` - バックアップ・リカバリ（作成予定）
- `sponsor-management.md` - スポンサー管理
- `gallery-management.md` - フォトギャラリー管理
- `image-optimization.md` - 画像最適化
- `ogp-image-management.md` - OGP画像管理
- `schedule-management.md` - 試合スケジュール管理
- `video-management.md` - プロモ動画（ヒーロー背景・フル尺）の生成と管理
- `crowdfunding-banner.md` - クラウドファンディングバナーの運用
- `custom-domain-setup.md` - カスタムドメイン設定
- `github-actions-sync.md` - GitHub Actions による同期
- `roster-api-setup-guide.md` / `roster-api-trigger.md` - Roster API 連携
- `instagram-secrets-setup.md` / `instagram-token-exchange.md` / `instagram-token-refresh.md` - Instagram トークン管理
- `x-secrets-setup.md` - X（Twitter）Secrets 設定

## 🚀 主要な運用タスク

### デプロイ
GitHub Pagesへの自動デプロイ：
1. mainブランチへプッシュ
2. GitHub Actionsが自動的にデプロイ
3. https://triax.github.io/homepage/ で確認

### メンバー情報更新
```bash
# 1. roster情報を取得
npm run roster:download

# 2. 画像を同期
npm run img:sync

# 3. 変更をコミット
git add .
git commit -m "メンバー情報を更新"
git push origin main
```

### コンテンツ更新
1. `docs/index.html` を編集
2. ローカルで確認
3. mainブランチへプッシュ

## 🔍 使い方
- 定期的な作業は手順書を参照
- 緊急時は `backup-recovery.md` を確認
- 問題発生時は `../05-troubleshooting/` も参照

## ✏️ 更新ルール
- 運用手順変更時は即座に更新
- インシデント発生時は対応手順を追加
- 四半期ごとに手順の見直し

## 🔗 関連リンク
- [開発ガイド](../03-development/)
- [トラブルシューティング](../05-troubleshooting/)
- [GitHub Actions](https://github.com/triax/homepage/actions)

## 📅 最終更新
- 日付: 2026-08-30
- 更新者: Claude
- 変更内容: `video-management.md`・`crowdfunding-banner.md` を追加、既存手順書の一覧を更新