# Roster API側の実装ガイド

## 📋 概要
`triax/roster-api` から `triax/homepage` のワークフローを自動トリガーするための設定手順です。

## 🔧 必要な設定

### ステップ1: Personal Access Token (PAT) の作成

1. **GitHubにログイン**して、右上のプロフィールアイコンをクリック
2. **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
3. **"Generate new token (classic)"** をクリック
4. 以下の設定を行う：
   - **Note**: `HOMEPAGE_TRIGGER_TOKEN` （わかりやすい名前）
   - **Expiration**: 90 days または適切な期間
   - **Select scopes**:
     - ✅ `repo` （プライベートリポジトリの場合）
     - または ✅ `public_repo` （パブリックリポジトリの場合）
5. **Generate token** をクリック
6. **⚠️ 重要**: 表示されたトークンをコピー（この画面を離れると二度と見れません）

### ステップ2: GitHub Secretsに登録

1. `triax/roster-api` リポジトリを開く
2. **Settings** タブをクリック
3. 左メニューの **Secrets and variables** → **Actions**
4. **"New repository secret"** をクリック
5. 以下を入力：
   - **Name**: `HOMEPAGE_TRIGGER_TOKEN`
   - **Secret**: コピーしたPATを貼り付け
6. **Add secret** をクリック

### ステップ3: ワークフローファイルの作成

`triax/roster-api` リポジトリに以下のファイルを作成：

#### `.github/workflows/trigger-homepage-sync.yml`

```yaml
name: Trigger Homepage Sync

on:
  # roster.jsonが更新されたらトリガー
  push:
    branches: [main]
    paths:
      - 'data/roster.json'      # roster.jsonのパスを確認して調整
      - 'roster.json'            # ルートにある場合
      - '**/roster.json'         # どこかにある場合

  # 手動実行も可能にする
  workflow_dispatch:
    inputs:
      custom_message:
        description: 'カスタムコミットメッセージ'
        required: false
        type: string
        default: ''

jobs:
  trigger-homepage:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Trigger homepage workflow
        uses: peter-evans/repository-dispatch@v3
        with:
          token: ${{ secrets.HOMEPAGE_TRIGGER_TOKEN }}
          repository: triax/homepage
          event-type: roster-updated
          client-payload: |
            {
              "message": "${{ inputs.custom_message || 'Roster updated in roster-api' }}",
              "triggered_by": "${{ github.actor }}",
              "commit_sha": "${{ github.sha }}",
              "commit_message": "${{ github.event.head_commit.message }}"
            }

      - name: Report status
        run: |
          echo "✅ Homepage sync triggered successfully"
          echo "Repository: triax/homepage"
          echo "Event type: roster-updated"
          echo "Triggered by: ${{ github.actor }}"
```

## 🧪 動作テスト

### 方法1: 手動でワークフローを実行

1. `triax/roster-api` の **Actions** タブを開く
2. **"Trigger Homepage Sync"** を選択
3. **"Run workflow"** をクリック
4. オプションでカスタムメッセージを入力
5. **"Run workflow"** ボタンをクリック

### 方法2: curlコマンドでテスト

```bash
# ターミナルで実行（YOUR_PAT_TOKENを実際のトークンに置き換え）
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer YOUR_PAT_TOKEN" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  https://api.github.com/repos/triax/homepage/dispatches \
  -d '{
    "event_type": "roster-updated",
    "client_payload": {
      "message": "Test trigger from curl",
      "triggered_by": "manual"
    }
  }'
```

### 方法3: roster.jsonを更新してプッシュ

```bash
# roster-apiリポジトリで
echo "# test update" >> roster.json
git add roster.json
git commit -m "Test: Update roster.json"
git push origin main
```

## ✅ 確認方法

1. **triax/homepage** の **Actions** タブを開く
2. **"Sync Roster and Images"** ワークフローが実行されているか確認
3. ワークフローの詳細を開いて以下を確認：
   - トリガー元が `repository_dispatch` になっている
   - コミットメッセージに「roster-apiからの自動同期」が含まれる
   - 実行者情報が正しく記録されている

## 🚨 トラブルシューティング

### ワークフローが実行されない

**確認項目：**
- [ ] PATが正しくSecretsに登録されているか
- [ ] PATに `repo` または `public_repo` 権限があるか
- [ ] PATの有効期限が切れていないか
- [ ] repository名が正しいか（`triax/homepage`）
- [ ] event-typeが正しいか（`roster-updated`）

### 権限エラー（403/404）

**解決方法：**
1. PATを再生成して権限を確認
2. Secretsを更新
3. homepageリポジトリへのアクセス権限を確認

### ワークフローは実行されるがコミットされない

**確認項目：**
- homepage側のワークフローログを確認
- 変更がない場合はコミットされない（正常動作）

## 📊 ログ確認

### roster-api側
```
Actions → Trigger Homepage Sync → 実行を選択 → ログを確認
```

### homepage側
```
Actions → Sync Roster and Images → 実行を選択 → ログを確認
```

## 🔒 セキュリティベストプラクティス

1. **PATの管理**
   - 最小限の権限のみ付与
   - 定期的に更新（3ヶ月ごと推奨）
   - 不要になったら即削除

2. **Secretsの取り扱い**
   - ログに出力しない
   - コードにハードコードしない
   - 必要最小限のスコープで使用

3. **監査**
   - 定期的にActionsの実行履歴を確認
   - 不審な実行がないか監視

## 📝 メンテナンス

### PATの更新手順

1. 新しいPATを生成
2. GitHub Secretsを更新
3. 古いPATを削除
4. 動作確認

### ワークフローの更新

変更が必要な場合は、roster-apiリポジトリの `.github/workflows/trigger-homepage-sync.yml` を編集してプッシュ。

---

## サポート

問題が解決しない場合は、以下の情報を含めて報告してください：
- エラーメッセージの全文
- 実行したコマンドや操作
- Actions のログURL
- 使用しているブランチ名