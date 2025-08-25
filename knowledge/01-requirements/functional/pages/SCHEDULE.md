# SCHEDULEセクション仕様書

## 概要
Club TRIAXの試合スケジュールを表示するセクション。2025年シーズンの全試合情報を一覧形式で提供し、各試合へのアクセス情報（地図、カレンダー登録、チケット購入）を統合的に提供する。

## データソース
- **ファイル**: `/SCHEDULE_2025.md`
- **形式**: Markdownテーブル形式
- **更新方法**: 手動でMarkdownファイルを編集

## データ構造

### SCHEDULE_2025.md
```markdown
| 日付 | 対戦相手 | キックオフ時間 | 試合会場 |
|-----|---------|--------------|---------|
| 9月7日（日） | ペンタオーシャン パイレーツ | 15:15 | 富士通スタジアム川崎 |
```

### 必要な情報
- **日付**: 月日と曜日（例: 9月7日（日））
- **対戦相手**: チーム名
- **キックオフ時間**: 24時間表記（例: 15:15）
- **試合会場**: スタジアム名
- **チケットリンク**: 全試合共通 `https://sports.banklives.com/events/clubtriax`

## UI/UX要件

### デザイン原則
1. **モバイルファースト**: スマートフォンでの閲覧を最優先
2. **情報の階層化**: 重要な情報（日時、対戦相手）を目立たせる
3. **アクション重視**: 各試合への具体的なアクション（地図、カレンダー、チケット）を提供

### レイアウト

#### モバイル版（〜768px）
- 1列表示
- カード型デザイン（スリムな高さ）
- 中央揃えのテキスト
- 横幅いっぱいのカード

#### PC版（768px〜）
- 1列表示（最大幅900px、中央配置）
- 左揃えのテキスト
- 日時の横位置を固定幅で統一

### カードコンポーネント

#### 構成要素
1. **日時エリア**（左側）
   - 日付（1行目）
   - キックオフ時間（2行目）
   - PC版: 固定幅（`sm:w-40`）で横位置統一

2. **試合情報エリア**（中央）
   - 対戦相手（太字、大きめのフォント）
   - 試合会場（小さめのフォント、グレー）
   - モバイル: 中央揃え（`text-center`）
   - PC: 左揃え（`sm:text-left`）

3. **アクションボタン**（右側）
   - アイコンのみ表示（テキストなし）
   - 3つのボタンを横並び
   - 順序: 地図 → カレンダー → チケット

### アクションボタン仕様

#### 共通仕様
- **サイズ**: `w-10 h-10`（ボタン）、`w-6 h-6`（アイコン）
- **スタイル**: 角丸（`rounded-lg`）、ホバー時に色変化
- **レスポンシブ**: モバイルでも同じサイズ

#### 各ボタンの詳細

1. **地図ボタン**
   - アイコン: Heroicons `map-pin`
   - 色: グレー（`text-gray-600`、ホバー時 `bg-gray-100`）
   - 機能: Google Mapsで会場を検索

2. **カレンダーボタン**
   - アイコン: Heroicons `calendar-days`
   - 色: グレー（`text-gray-600`、ホバー時 `bg-gray-100`）
   - 機能: Google カレンダーに追加

3. **チケットボタン**
   - アイコン: Heroicons `ticket`
   - 色: プライマリカラー（`text-primary`、ホバー時 `bg-primary/10`）
   - 機能: チケット購入サイトへ遷移

## 技術実装

### JavaScript関数

#### openGoogleMaps(venue)
```javascript
function openGoogleMaps(venue) {
    const venueMap = {
        '富士通スタジアム川崎': 'https://www.google.com/maps/search/富士通スタジアム川崎',
        'アミノバイタルフィールド': 'https://www.google.com/maps/search/アミノバイタルフィールド'
    };
    const url = venueMap[venue] || `https://www.google.com/maps/search/${encodeURIComponent(venue)}`;
    window.open(url, '_blank');
}
```

#### addToGoogleCalendar(date, time, opponent, venue)
```javascript
function addToGoogleCalendar(date, time, opponent, venue) {
    // 日付をISO形式に変換
    const year = new Date().getFullYear();
    const dateStr = convertToISODate(date, year);

    // Google Calendar URLを生成
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `Club TRIAX vs ${opponent}`,
        dates: `${startDateTime}/${endDateTime}`,
        location: venue,
        details: `Club TRIAXの試合\\n対戦相手: ${opponent}\\n会場: ${venue}`
    });

    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank');
}
```

### スタイリング（Tailwind CSS）

#### カードコンテナ
```html
<div class="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
```

#### レスポンシブ対応
- `text-center sm:text-left`: モバイルで中央揃え、PCで左揃え
- `sm:w-40`: PC版で固定幅
- `flex-col sm:flex-row`: モバイルで縦並び、PCで横並び

## アクセシビリティ

1. **セマンティックHTML**: 適切なHTML要素を使用
2. **タイトル属性**: アイコンボタンに`title`属性を追加
3. **キーボード操作**: すべてのボタンがキーボードで操作可能
4. **色のコントラスト**: WCAG AA基準を満たす

## パフォーマンス考慮事項

1. **遅延読み込み**: スケジュールセクションは初期表示に含める（重要情報のため）
2. **アイコン**: インラインSVGで表示（追加リクエスト不要）
3. **JavaScript**: 必要最小限の処理のみ実装

## 運用・更新

### 更新フロー
1. `SCHEDULE_2025.md`を編集
2. `docs/index.html`のSCHEDULEセクションを手動更新
3. 変更をコミット・プッシュ
4. GitHub Pagesで自動デプロイ

### 注意事項
- 試合日程の変更は迅速に反映する
- チケットリンクは全試合共通URLを使用
- 新しいスタジアムが追加された場合は、`openGoogleMaps`関数の`venueMap`を更新

## 関連ファイル
- `/SCHEDULE_2025.md`: スケジュールデータ
- `/docs/index.html`: SCHEDULEセクションの実装
- `/docs/index.js`: Google Maps/Calendar連携機能