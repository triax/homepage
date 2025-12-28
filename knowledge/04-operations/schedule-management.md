# スケジュール管理運用ガイド

## 概要
Club TRIAXの試合スケジュール情報の管理と更新に関する運用手順書。
JSONファイルで管理し、JavaScriptで動的に表示する。

## ファイル構成
```
docs/assets/games/
├── 2025.json           # 2025年シーズンの試合データ
├── schema.json         # JSONスキーマ（構造のドキュメント）
└── schedule-loader.js  # 動的ローダースクリプト
```

## 更新タイミング

### 定期更新
- **シーズン開始前**: 全試合スケジュールの一括登録
- **月次確認**: 翌月の試合情報の確認と修正

### 臨時更新
- **日程変更**: リーグからの通知後、速やかに更新
- **会場変更**: 確定次第即座に反映
- **キックオフ時間変更**: 変更決定後24時間以内に更新
- **試合結果**: 試合終了後にresultとstatsを更新

## 更新手順

### 1. スケジュールデータの更新

#### JSONファイルを編集
```bash
# ファイルを開く
code docs/assets/games/2025.json
```

#### データ形式
```json
{
  "year": 2025,
  "regularseason": {
    "status": "open",
    "ticket": "https://sports.banklives.com/events/clubtriax/155",
    "games": [
      {
        "date": "2025-09-07",
        "dayOfWeek": "日",
        "opponent": "ペンタオーシャン パイレーツ",
        "kickoff": "15:15",
        "endTime": "17:45",
        "venue": {
          "name": "富士通スタジアム川崎",
          "mapsQuery": "富士通スタジアム川崎"
        },
        "home": null,
        "result": null,
        "stats": null
      }
    ]
  }
}
```

**記入ルール**:
- 日付: ISO形式 `YYYY-MM-DD`
- キックオフ時間: 24時間表記 `HH:MM`
- endTime: キックオフから2.5時間後
- 会場名: 正式名称を使用
- holiday: 祝日の場合のみ追加（例: `"holiday": "祝"`）

### 2. 試合結果の記録

試合終了後、`result`と`stats`を更新:

```json
{
  "result": {
    "score": { "team": 21, "opponent": 14 },
    "quarters": {
      "Q1": { "team": 7, "opponent": 0 },
      "Q2": { "team": 0, "opponent": 7 },
      "Q3": { "team": 7, "opponent": 0 },
      "Q4": { "team": 7, "opponent": 7 },
      "OT": null
    },
    "win": true
  },
  "stats": { "url": "https://example.com/stats/2025-09-07" }
}
```

### 3. シーズンステータスの管理

`status`フィールドの値:
- `"closed"`: チケット販売前（チケットボタン非表示）
- `"open"`: チケット販売中（チケットボタン表示）
- `"finished"`: シーズン終了

### 4. 動作確認

#### ローカル確認
```bash
# HTTPサーバーを起動
npx http-server -p 8888

# ブラウザで確認
open http://localhost:8888/docs/index.html#schedule
```

#### 確認項目チェックリスト
- [ ] 日付・時刻が正しく表示されている
- [ ] 対戦相手名が正確
- [ ] 会場名が正しい
- [ ] 地図ボタンが正しい場所を開く
- [ ] カレンダー登録が正しく動作する
- [ ] チケットボタンの表示/非表示が正しい
- [ ] 試合結果（ある場合）が正しく表示される
- [ ] モバイル表示が適切

### 5. コミットとデプロイ

```bash
# 変更を確認
git status
git diff

# ステージング
git add docs/assets/games/2025.json

# コミット（日本語メッセージ）
git commit -m "試合スケジュールを更新: [更新内容の要約]"

# プッシュ
git push origin main
```

## 新しい会場の追加

新しい試合会場が追加された場合:

### 1. JSONに追加
```json
{
  "venue": {
    "name": "新会場名",
    "mapsQuery": "新会場名"  // Google Maps検索用
  }
}
```

### 2. 動作確認
地図ボタンをクリックして正しい場所が表示されることを確認

## トラブルシューティング

### よくある問題と対処法

#### 1. スケジュールが表示されない
**原因**: JSONの構文エラー
**対処**: JSONの妥当性を確認
```bash
# JSONの構文チェック
cat docs/assets/games/2025.json | python3 -m json.tool
```

#### 2. カレンダー登録で時間がずれる
**原因**: タイムゾーンの問題
**対処**: `addToGoogleCalendar`関数でJSTを明示的に指定（実装済み）

#### 3. 地図が開かない
**原因**: mapsQueryの不備
**対処**: `venue.mapsQuery`に正確な検索クエリを設定

#### 4. チケットボタンが表示されない
**原因**: statusが"open"以外
**対処**: `regularseason.status`を`"open"`に変更

## ベストプラクティス

### 1. 更新前の確認
- リーグ公式サイトで最新情報を確認
- 複数の情報源でクロスチェック

### 2. 更新タイミング
- 平日の業務時間外を避ける
- 試合直前の更新は避ける
- 重要な変更は事前にSNSで告知

### 3. バックアップ
- 大きな変更前は現在の状態をコミット
- ブランチを作成して作業することも検討

### 4. コミュニケーション
- 変更内容をチーム内で共有
- SNS担当者への連絡
- 必要に応じてファンへの告知

## 年次更新作業

### シーズン終了後
1. 現在のJSONファイルをそのまま保持（アーカイブとして）
2. 新シーズンのファイル作成
   ```bash
   cp docs/assets/games/2025.json docs/assets/games/2026.json
   ```
3. schedule-loader.jsの読み込み年度を更新（必要な場合）
4. 関連ドキュメントの更新

### シーズン開始前
1. 全試合スケジュールの入力
2. 新会場の追加確認
3. チケット販売URLの更新確認
4. statusを"open"に変更
5. 全機能のテスト

## 緊急時対応

### 試合中止・延期の場合
1. 該当試合のデータを更新または削除
2. SNSで即座に告知
3. 詳細情報へのリンクを追加（必要に応じて）

### システム障害時
1. GitHub Pagesのステータス確認
2. DNSの確認
3. 代替告知手段（SNS）の活用

## 関連ドキュメント
- [schema.json](../../docs/assets/games/schema.json) - JSONスキーマ定義
- [SCHEDULE.md](../01-requirements/functional/pages/SCHEDULE.md) - 機能仕様
- [schedule-integration.md](../02-architecture/schedule-integration.md) - 技術仕様
- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体のガイドライン

## 更新履歴
- 2025-08-22: 初版作成
- 2025-12-28: JSONベースの動的生成方式に更新
