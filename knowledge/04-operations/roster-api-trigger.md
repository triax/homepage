# Roster APIからのワークフロートリガー設定

## 概要
`triax/roster-api` リポジトリから `triax/homepage` のワークフローをトリガーする設定方法です。

## 設定手順

### 1. homepage側の設定（完了済み）
`sync-roster.yml` に `repository_dispatch` イベントを追加済み：
```yaml
on:
  repository_dispatch:
    types: [roster-updated]
```

### 2. roster-api側で必要な設定

#### Personal Access Token (PAT) の作成
1. GitHubの Settings > Developer settings > Personal access tokens > Tokens (classic)
2. 「Generate new token」をクリック
3. 必要な権限：
   - `repo` スコープ（または最小限 `public_repo` if public）
4. トークンをコピー

#### GitHub Secretsに登録
1. `triax/roster-api` の Settings > Secrets and variables > Actions
2. 「New repository secret」をクリック
3. Name: `HOMEPAGE_TRIGGER_TOKEN`
4. Value: 作成したPAT

#### roster-api側のワークフロー例

`triax/roster-api/.github/workflows/trigger-homepage-sync.yml`:

```yaml
name: Trigger Homepage Sync

on:
  push:
    branches: [main]
    paths:
      - 'data/roster.json'  # roster.jsonが更新された時
  workflow_dispatch:  # 手動実行も可能

jobs:
  trigger-homepage:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger homepage workflow
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.HOMEPAGE_TRIGGER_TOKEN }}
          repository: triax/homepage
          event-type: roster-updated
          client-payload: '{"message": "Roster updated in roster-api", "triggered_by": "${{ github.actor }}"}'
```

## 別の方法：GitHub App を使用

よりセキュアな方法として、GitHub Appを使用することも可能です。

### GitHub App の作成
1. Settings > Developer settings > GitHub Apps
2. 「New GitHub App」を作成
3. 必要な権限：
   - Repository permissions:
     - Actions: Write
     - Contents: Write
4. インストール先：`triax/homepage`

### roster-api側のワークフロー（GitHub App版）

```yaml
name: Trigger Homepage Sync (App)

on:
  push:
    branches: [main]
    paths:
      - 'data/roster.json'

jobs:
  trigger-homepage:
    runs-on: ubuntu-latest
    steps:
      - name: Generate token
        id: generate_token
        uses: tibdex/github-app-token@v2
        with:
          app_id: ${{ secrets.APP_ID }}
          private_key: ${{ secrets.APP_PRIVATE_KEY }}
          repository: triax/homepage
      
      - name: Trigger homepage workflow
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ steps.generate_token.outputs.token }}
          repository: triax/homepage
          event-type: roster-updated
          client-payload: '{"message": "Roster updated", "triggered_by": "${{ github.actor }}"}'
```

## 動作確認

### roster-api側から手動テスト
```bash
# curlでテスト（PATを使用）
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/triax/homepage/dispatches \
  -d '{"event_type":"roster-updated","client_payload":{"message":"Test trigger"}}'
```

### 確認ポイント
1. `triax/homepage` の Actions タブを確認
2. 「Sync Roster and Images」ワークフローが実行されているか
3. コミットメッセージに「roster-apiからの自動同期」が含まれているか

## トラブルシューティング

### ワークフローがトリガーされない
- PATの権限を確認（`repo` スコープが必要）
- repository名とevent-typeが正しいか確認
- Secretsが正しく設定されているか確認

### 権限エラー
- PATが有効期限切れでないか確認
- 対象リポジトリへのアクセス権限があるか確認

## セキュリティ考慮事項

1. **PATの管理**
   - 定期的にローテーション
   - 最小限の権限のみ付与
   - 使用しなくなったら削除

2. **GitHub App推奨**
   - より細かい権限制御が可能
   - 自動的なトークン管理
   - 監査ログが充実

3. **ペイロードの検証**
   - 必要に応じてペイロードの内容を検証
   - 不正なトリガーを防ぐ