# Instagram自動更新のためのGitHub Secrets設定手順

このドキュメントでは、Instagram投稿の自動更新に必要なGitHub Secretsの設定方法を説明します。

## 必要なSecrets

1. **INSTAGRAM_USER_ID** - InstagramビジネスアカウントのユーザーID
2. **FACEBOOK_ACCESS_TOKEN** - Instagram Graph APIの長期アクセストークン

## 設定手順

### 1. GitHub Secretsの追加

1. GitHubリポジトリページを開く
2. **Settings**タブをクリック
3. 左メニューから **Secrets and variables** → **Actions** を選択
4. **New repository secret** ボタンをクリック
5. 以下の2つのSecretsを追加：

#### INSTAGRAM_USER_ID
- **Name**: `INSTAGRAM_USER_ID`
- **Value**: `17841443759135863` (Club TRIAXのInstagram ID)

#### FACEBOOK_ACCESS_TOKEN
- **Name**: `FACEBOOK_ACCESS_TOKEN`
- **Value**: Instagram Graph APIの長期アクセストークン（後述の手順で取得）

### 2. Instagram Graph APIアクセストークンの取得

#### 前提条件
- FacebookビジネスアカウントとInstagramビジネスアカウントが連携済み
- Facebook開発者アカウントを持っている

#### 手順
1. [Facebook Developers](https://developers.facebook.com/)にログイン
2. アプリを作成または既存のアプリを選択
3. **Instagram Basic Display API**または**Instagram Graph API**を追加
4. アプリレビューを通過させる（本番環境用）
5. 長期アクセストークンを生成

### 3. 動作確認

設定完了後、以下の方法で動作確認できます：

#### 手動実行
1. GitHubリポジトリの**Actions**タブを開く
2. **Update Instagram Feed**ワークフローを選択
3. **Run workflow**ボタンをクリック
4. mainブランチを選択して実行

#### ローカル実行（テスト用）
```bash
export INSTAGRAM_USER_ID="17841443759135863"
export FACEBOOK_ACCESS_TOKEN="your_access_token_here"
npx tsx scripts/fetch-instagram.ts
```

## スケジュール

- 自動実行: 1日2回（日本時間正午と深夜0時）
- 手動実行: いつでも可能（Actions画面から）

## トラブルシューティング

### エラー: "Invalid access token"
- アクセストークンの有効期限を確認
- トークンが正しくコピーされているか確認

### エラー: "User ID not found"
- INSTAGRAM_USER_IDが正しいか確認
- Instagramアカウントがビジネスアカウントになっているか確認

### 更新されない
- GitHub Actionsのログを確認
- posts.jsonに変更がない場合はコミットされません

## セキュリティ注意事項

- アクセストークンは絶対に公開しないでください
- 定期的にトークンを更新することを推奨
- 不要になったトークンは速やかに無効化してください
