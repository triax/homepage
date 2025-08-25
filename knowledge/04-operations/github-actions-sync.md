# GitHub Actions - Roster同期ワークフロー

## 概要
メンバー情報（roster.json）と画像を手動で同期するGitHub Actionsワークフローです。

## ワークフロー: sync-roster.yml

### 実行方法
1. GitHubリポジトリの「Actions」タブを開く
2. 「Sync Roster and Images」を選択
3. 「Run workflow」をクリック
4. オプションを設定して実行

**オプション**:
| オプション | 説明 | デフォルト |
|------------|------|------------|
| `auto_commit` | 変更を自動コミット | true |
| `commit_message` | カスタムコミットメッセージ | （空） |

### 使用例

#### 通常の同期（自動コミット）
```
auto_commit: ☑（チェック）
commit_message: （空欄）
```
→ roster.jsonと画像を同期して自動コミット

#### カスタムメッセージでコミット
```
auto_commit: ☑（チェック）
commit_message: 「新メンバー追加対応」
```
→ 指定したメッセージでコミット

#### 変更確認のみ（コミットしない）
```
auto_commit: □（チェックなし）
commit_message: （使用されない）
```
→ 変更内容はSummaryで確認可能、手動でコミットが必要

## セットアップ

### 必要な権限
リポジトリの Settings > Actions > General で以下を確認：
- Actions permissions: Allow all actions
- Workflow permissions: Read and write permissions

### 必要なシークレット
デフォルトの `GITHUB_TOKEN` を使用するため、追加設定は不要。

## 使用上の注意

- 手動実行のみ（定期実行はなし）
- 必要に応じてActionsタブから実行
- コミットメッセージには実行者が記録される

## トラブルシューティング

### ワークフローが失敗する場合

#### npm ci でエラー
**原因**: package-lock.jsonが最新でない
**解決**:
```bash
npm install
git add package-lock.json
git commit -m "Update package-lock.json"
git push
```

#### Permission denied
**原因**: Workflow permissionsが不足
**解決**: Settings > Actions > General > Workflow permissions を確認

#### コミットできない
**原因**: 保護ブランチの設定
**解決**: main ブランチの保護ルールを確認し、GitHub Actionsを除外

### 実行履歴の確認
1. Actions タブを開く
2. 該当のワークフローを選択
3. 実行履歴から詳細を確認
4. Summaryセクションで変更内容を確認


## ベストプラクティス

1. **実行タイミング**
   - メンバー情報更新時に実行
   - 大きな変更前後でテスト実行

2. **コミットメッセージ**
   - 変更内容を明確に記載
   - 特定の変更はカスタムメッセージを活用

3. **変更確認**
   - auto_commitをfalseにしてドライラン
   - Summaryで変更内容を確認後にコミット

## 関連リンク
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [ワークフロー実行履歴](https://github.com/triax/homepage/actions)