# Instagram連携トラブルシューティング

## 一般的な問題と解決方法

### 1. 画像が表示されない / URL Signature Expired

#### 症状
- ウェブサイトで画像が表示されない
- コンソールに "URL Signature Expired" エラー

#### 原因
- Instagram media_urlの有効期限切れ（24-48時間）

#### 解決方法
1. GitHub Actionsの手動実行
   ```bash
   # Actionsタブから "Update Instagram Feed" を手動実行
   ```
2. ローカルで強制更新
   ```bash
   npm run instagram:fetch
   git add docs/assets/instagram/posts.json
   git commit -m "Instagram投稿データを手動更新"
   git push
   ```

### 2. Invalid OAuth access token エラー

#### 症状
```
Failed to refresh token: {
  message: 'Invalid OAuth access token - Cannot parse access token',
  type: 'OAuthException',
  code: 190
}
```

#### 原因
- トークンが無効または期限切れ
- 間違ったトークンタイプ（Short-lived tokenなど）

#### 解決方法
1. 新しいLong-lived tokenを取得
2. GitHub Secretsを更新
3. ローカル.envファイルを更新

### 3. Token is less than 24 hours old

#### 症状
```
❌ Token is less than 24 hours old. Cannot refresh yet.
```

#### 原因
- Instagram APIの仕様：24時間以内のトークンは更新不可

#### 解決方法
- 24時間後に再実行
- 緊急の場合は現在のトークンをそのまま使用

### 4. GitHub Actions失敗

#### 症状
- ワークフローが赤くなる
- 投稿が更新されない

#### 確認手順
1. Actionsタブでエラーログを確認
2. Secretsの設定を確認
   - IG_USER_ID
   - IG_ACCESS_TOKEN

#### 解決方法
```bash
# Secretsが正しいか確認
# Settings → Secrets and variables → Actions
```

## トークン管理のベストプラクティス

### してはいけないこと ❌

1. **複数箇所でトークンを手動生成**
   - GitHub Actionsと手動生成を混在させない
   - 混乱の元になる

2. **頻繁な手動介入**
   - 自動化システムを信頼する
   - 緊急時のみ手動操作

3. **トークンのコミット**
   - 絶対に.envファイルをコミットしない
   - トークンをコード内にハードコーディングしない

### 推奨事項 ✅

1. **自動更新に任せる**
   ```
   GitHub Actions (月2回)
       ↓
   自動リフレッシュ
       ↓
   60日延長
   ```

2. **バックアップ体制**
   - ローカル: .env.backup.* が自動作成
   - GitHub: Secretsの更新履歴

3. **監視**
   - トークン有効期限の警告ログ
   - GitHub Issueの自動作成

## 緊急時の手動トークン取得

### 手順

1. **Facebook Developersにログイン**
   - https://developers.facebook.com/

2. **アプリを選択**
   - Club TRIAX用のアプリ

3. **Graph API Explorerを使用**
   - User Token取得
   - Long-lived tokenに変換

4. **更新場所**
   - GitHub Secrets: IG_ACCESS_TOKEN
   - ローカル: .envファイル

### 注意事項

- 新トークン生成後も既存トークンは有効
- 複数トークンが共存可能
- 混乱を避けるため、どこで使用中か記録

## デバッグコマンド

### トークン状態確認
```bash
# ローカルでトークン有効期限を確認
npm run instagram:refresh-token
# "Current token status" を確認
```

### 投稿データ確認
```bash
# 最新投稿を取得
npm run instagram:fetch

# JSONファイルを確認
cat docs/assets/instagram/posts.json | jq '.data[0]'
```

### GitHub Actions手動実行
```bash
# GitHub CLIを使用
gh workflow run fetch-instagram-posts.yml
gh workflow run refresh-instagram-token.yml
```

## よくある質問

### Q: 手動で新トークンを生成したら既存のトークンは無効になる？
**A:** いいえ。複数のトークンが同時に有効です。

### Q: media_urlはなぜ期限切れになる？
**A:** Instagramのセキュリティ仕様。24-48時間の署名付きURL。

### Q: どのくらいの頻度で更新すべき？
**A:**
- 投稿取得: 12時間ごと（自動）
- トークン更新: 30日ごと（自動）

### Q: .env.backup.*ファイルは削除してもいい？
**A:** はい。ただし直近のものは残しておくことを推奨。

## 関連ドキュメント

- [アーキテクチャ](../02-architecture/instagram-integration.md)
- [初期設定](../04-operations/instagram-secrets-setup.md)
- [トークン更新](../04-operations/instagram-token-refresh.md)