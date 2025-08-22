# スケジュール管理運用ガイド

## 概要
Club TRIAXの試合スケジュール情報の管理と更新に関する運用手順書。

## 更新タイミング

### 定期更新
- **シーズン開始前**: 全試合スケジュールの一括登録
- **月次確認**: 翌月の試合情報の確認と修正

### 臨時更新
- **日程変更**: リーグからの通知後、速やかに更新
- **会場変更**: 確定次第即座に反映
- **キックオフ時間変更**: 変更決定後24時間以内に更新

## 更新手順

### 1. スケジュールデータの更新

#### Step 1: SCHEDULE_2025.mdを編集
```bash
# ファイルを開く
code SCHEDULE_2025.md
```

#### Step 2: データ形式に従って記入
```markdown
| 日付 | 対戦相手 | キックオフ時間 | 試合会場 |
|-----|---------|--------------|---------|
| 9月7日（日） | ペンタオーシャン パイレーツ | 15:15 | 富士通スタジアム川崎 |
```

**記入ルール**:
- 日付: `月日（曜日）`形式
- キックオフ時間: 24時間表記 `HH:MM`
- 会場名: 正式名称を使用

### 2. HTMLファイルの更新

#### Step 1: index.htmlのSCHEDULEセクションを特定
```bash
# SCHEDULEセクションを検索
grep -n "id=\"schedule\"" docs/index.html
```

#### Step 2: 各試合のカードを更新

**テンプレート**:
```html
<!-- 試合カード -->
<div class="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <!-- 日時 -->
        <div class="text-center sm:text-left sm:w-40">
            <div class="text-lg font-bold text-gray-800">[月日（曜日）]</div>
            <div class="text-2xl font-bold text-primary">[キックオフ時間]</div>
        </div>
        
        <!-- 試合情報 -->
        <div class="flex-grow text-center sm:text-left">
            <div class="text-xl font-bold text-gray-900 mb-1">[対戦相手]</div>
            <div class="text-sm text-gray-600">[試合会場]</div>
        </div>
        
        <!-- アクションボタン -->
        <div class="flex justify-center sm:justify-end gap-2">
            <!-- 地図ボタン -->
            <button onclick="openGoogleMaps('[試合会場]')" ...>
            <!-- カレンダーボタン -->
            <button onclick="addToGoogleCalendar('[日付]', '[時間]', '[対戦相手]', '[会場]')" ...>
            <!-- チケットボタン -->
            <a href="https://sports.banklives.com/events/clubtriax" ...>
        </div>
    </div>
</div>
```

### 3. 動作確認

#### ローカル確認
```bash
# HTTPサーバーを起動
npx http-server ./docs -p 3000

# ブラウザで確認
open http://localhost:3000
```

#### 確認項目チェックリスト
- [ ] 日付・時刻が正しく表示されている
- [ ] 対戦相手名が正確
- [ ] 会場名が正しい
- [ ] 地図ボタンが正しい場所を開く
- [ ] カレンダー登録が正しく動作する
- [ ] チケットリンクが機能する
- [ ] モバイル表示が適切
- [ ] PC表示で横位置が揃っている

### 4. コミットとデプロイ

```bash
# 変更を確認
git status
git diff

# ステージング
git add SCHEDULE_2025.md docs/index.html

# コミット（日本語メッセージ）
git commit -m "試合スケジュールを更新: [更新内容の要約]"

# プッシュ
git push origin main
```

## 新しい会場の追加

新しい試合会場が追加された場合:

### 1. Google Maps URLの確認
1. Google Mapsで会場を検索
2. 正確な場所を確認
3. URLをコピー

### 2. JavaScript関数の更新
`docs/index.js`の`openGoogleMaps`関数を更新:

```javascript
const venueMap = {
    '富士通スタジアム川崎': 'https://www.google.com/maps/search/富士通スタジアム川崎',
    'アミノバイタルフィールド': 'https://www.google.com/maps/search/アミノバイタルフィールド',
    // 新しい会場を追加
    '新会場名': 'https://www.google.com/maps/search/新会場名'
};
```

## トラブルシューティング

### よくある問題と対処法

#### 1. カレンダー登録で時間がずれる
**原因**: タイムゾーンの問題
**対処**: `addToGoogleCalendar`関数でJSTを明示的に指定

#### 2. 地図が開かない
**原因**: 会場名の不一致
**対処**: `venueMap`に正確なマッピングを追加

#### 3. レイアウトが崩れる
**原因**: 長いチーム名や会場名
**対処**: 
- 必要に応じて改行を入れる
- フォントサイズを調整
- 省略表記を検討

#### 4. モバイルで表示が切れる
**原因**: 固定幅の設定
**対処**: レスポンシブクラスを確認（`sm:`プレフィックス）

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
1. 現在のスケジュールファイルをアーカイブ
   ```bash
   cp SCHEDULE_2025.md archive/SCHEDULE_2025.md
   ```

2. 新シーズンのファイル作成
   ```bash
   cp SCHEDULE_template.md SCHEDULE_2026.md
   ```

3. HTMLの年度表記更新
4. 関連ドキュメントの更新

### シーズン開始前
1. 全試合スケジュールの入力
2. 新会場の追加確認
3. チケット販売URLの更新確認
4. 全機能のテスト

## 緊急時対応

### 試合中止・延期の場合
1. スケジュールに「【延期】」「【中止】」を追記
2. 背景色を変更して視覚的に区別
3. SNSで即座に告知
4. 詳細情報へのリンクを追加

### システム障害時
1. GitHub Pagesのステータス確認
2. DNSの確認
3. 代替告知手段（SNS）の活用

## 関連ドキュメント
- [SCHEDULE.md](../01-requirements/functional/pages/SCHEDULE.md) - 機能仕様
- [schedule-integration.md](../02-architecture/schedule-integration.md) - 技術仕様
- [CLAUDE.md](../../CLAUDE.md) - プロジェクト全体のガイドライン

## 更新履歴
- 2025-08-22: 初版作成
- 2025-08-22: スケジュール管理機能実装に伴い作成