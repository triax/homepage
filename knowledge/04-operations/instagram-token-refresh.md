# Instagram Access Token 自動更新システム

## 概要

Instagram Graph APIのLong-lived Access Tokenは60日で有効期限が切れるため、定期的な更新が必要です。このシステムは、トークンの自動更新を実現し、サービスの継続性を保証します。

## 実行環境と入出力仕様

| Runtime | Input | Output |
|---------|-------|--------|
| **GitHub Actions** | `secrets.FACEBOOK_ACCESS_TOKEN`<br>(環境変数) | GitHub Secrets APIで<br>`FACEBOOK_ACCESS_TOKEN`を更新 |
| **Local Dev** | `.env`ファイルから<br>`FACEBOOK_ACCESS_TOKEN` | `.env`ファイルを更新<br>(環境変数も自動更新) |

## コマンド

### ローカル環境での実行
```bash
npm run instagram:refresh-token
```

### GitHub Actionsでの実行
- **定期実行**: 毎月1日と15日の日本時間12時（UTC 3時）
- **手動実行**: Actionsタブから`Refresh Instagram Access Token`を選択して実行

## トークンの仕様

### 有効期限
- **Long-lived Token**: 60日間有効
- **更新可能期間**: 発行/更新から24時間経過後〜期限切れまで
- **推奨更新頻度**: 30日ごと（期限の半分）

### 更新プロセス
1. 現在のトークンの有効期限をチェック
2. Graph APIの `/oauth/access_token?grant_type=fb_exchange_token` を呼び出し
3. 新しいトークンを取得（さらに60日延長）
4. 環境に応じて保存先を更新

## ローカル環境での動作

### 前提条件
- `.env`ファイルに`FACEBOOK_ACCESS_TOKEN`が設定されていること
- `libsodium-wrappers`がインストール済み（`npm install`で自動）

### 更新プロセス
1. `.env`ファイルからトークンを読み込み
2. 新しいトークンを取得
3. `.env.backup.{timestamp}`としてバックアップを作成
4. `.env`ファイルを更新
5. 現在のプロセスの環境変数も更新

## GitHub Actionsでの動作

### 必要なSecrets
- `FACEBOOK_ACCESS_TOKEN`: 現在の有効なトークン
- `GITHUB_TOKEN`: 自動的に提供される（設定不要）

### 更新プロセス
1. GitHub Secretsからトークンを取得
2. 新しいトークンを取得
3. GitHub Secrets APIを使用してトークンを暗号化
4. リポジトリのSecretを更新

### エラー時の対応
- 自動的にGitHub Issueが作成される
- ラベル: `bug`, `instagram`, `urgent`
- 手動での対応手順が記載される

## トラブルシューティング

### エラー: "Invalid OAuth access token"
**原因**: トークンが無効または期限切れ
**対策**:
1. Facebook Developersコンソールで新しいトークンを手動生成
2. `.env`または GitHub Secretsを更新
3. 再度実行

### エラー: "Token is less than 24 hours old"
**原因**: トークンが新しすぎる（24時間未満）
**対策**: 24時間後に再実行

### エラー: ".env file not found"
**原因**: ローカル環境で`.env`ファイルが存在しない
**対策**: `.env.example`をコピーして`.env`を作成

## セキュリティ考慮事項

1. **トークンの保護**
   - 絶対にコミットしない（`.gitignore`で除外）
   - GitHub Secretsで暗号化保存
   - ログに出力しない

2. **バックアップ**
   - ローカル更新時は自動バックアップ作成
   - バックアップファイルも`.gitignore`に追加

3. **アクセス制限**
   - GitHub Actionsはmainブランチのみで実行
   - 手動実行も可能だが権限が必要

## 関連ドキュメント

- [Instagram Secrets設定手順](./instagram-secrets-setup.md)
- [Instagram投稿自動更新](../README.md#instagram-integration)
