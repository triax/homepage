# Instagram短期トークンから長期トークンへの変換手順

## 概要

Facebook DevelopersコンソールからUser Access Tokenを取得した場合、これは短期トークン（Short-lived Token）で、数時間で期限切れになります。継続的な運用のためには、長期トークン（Long-lived Token）への変換が必要です。

## 変換方法

### 方法1: Graph API Explorerを使用（推奨）

1. [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)にアクセス
2. アプリを選択
3. **Generate Access Token**をクリック
4. 必要な権限を選択：
   - `instagram_basic`
   - `instagram_content_publish` (投稿する場合)
   - `pages_show_list`
   - `business_management`
5. トークンを生成
6. **Access Token Tool**（トークンの横の情報アイコン）をクリック
7. **Extend Access Token**をクリックして長期トークンを取得

### 方法2: cURLコマンドを使用

```bash
# 短期トークンから長期トークンへ変換
curl -X GET "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_LIVED_TOKEN}"
```

必要な情報：
- **APP_ID**: Facebook開発者コンソールのアプリID
- **APP_SECRET**: Facebook開発者コンソールのアプリシークレット
- **SHORT_LIVED_TOKEN**: 現在の短期トークン

### 方法3: スクリプトを使用

```bash
# 長期トークンへの変換（App Secretが必要）
npm run instagram:exchange-token
```

**注意**: このコマンドを実行するには、`.env`ファイルに以下が必要です：
```env
IG_APP_ID=your_app_id
IG_APP_SECRET=your_app_secret
IG_ACCESS_TOKEN=short_lived_token
```

## App IDとApp Secretの取得方法

1. [Facebook Developers](https://developers.facebook.com/)にログイン
2. 使用中のアプリを選択
3. **Settings** → **Basic**を選択
4. 以下の情報を確認：
   - **App ID**: 公開情報
   - **App Secret**: 「Show」をクリックして表示（パスワード入力が必要）

## 長期トークンの特徴

- **有効期限**: 60日間
- **更新可能期間**: 発行から24時間経過後
- **自動更新**: 月2回のGitHub Actionsで自動更新

## 変換後の手順

1. 長期トークンを取得したら、`.env`ファイルを更新：
   ```bash
   IG_ACCESS_TOKEN=新しい長期トークン
   ```

2. 動作確認：
   ```bash
   npm run instagram:fetch
   ```

3. GitHub Secretsも更新（本番環境用）：
   - リポジトリのSettings → Secrets and variables → Actions
   - `IG_ACCESS_TOKEN`を更新

## トラブルシューティング

### エラー: "Invalid OAuth access token"
- トークンが正しくコピーされているか確認
- トークンの前後に余分な空白がないか確認

### エラー: "App Secret required"
- Facebook開発者コンソールからApp Secretを取得
- セキュリティのため、App Secretは絶対に公開しない

### エラー: "Token already long-lived"
- 既に長期トークンに変換済み
- 更新は24時間経過後に`npm run instagram:refresh-token`で実行

## セキュリティ注意事項

⚠️ **重要**:
- App Secretは絶対にGitにコミットしない
- `.env`ファイルは`.gitignore`に含まれていることを確認
- 本番環境ではGitHub Secretsを使用
- 不要になったトークンは速やかに無効化

## 関連ドキュメント

- [Instagram Secrets設定手順](./instagram-secrets-setup.md)
- [Instagram Access Token自動更新システム](./instagram-token-refresh.md)
- [Instagramトラブルシューティング](../05-troubleshooting/instagram-issues.md)