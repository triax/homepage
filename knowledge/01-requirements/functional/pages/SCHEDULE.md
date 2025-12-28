# SCHEDULEセクション仕様書

## 概要
Club TRIAXの試合スケジュールを表示するセクション。JSONファイルから試合データを読み込み、JavaScriptで動的にHTMLを生成して表示する。各試合へのアクセス情報（地図、カレンダー登録、チケット購入、試合スタッツ）を統合的に提供する。

## データソース
- **ファイル**: `docs/assets/games/2025.json`
- **形式**: JSON
- **スキーマ**: `docs/assets/games/schema.json`
- **更新方法**: JSONファイルを直接編集

## データ構造

### 2025.json
```json
{
  "year": 2025,
  "preseason": {
    "status": "closed",
    "ticket": "https://...",
    "game": null
  },
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

### 必要な情報
- **日付**: ISO形式（例: `2025-09-07`）
- **曜日**: 漢字1文字（例: `日`）
- **祝日**: 任意（例: `祝`）
- **対戦相手**: チーム名
- **キックオフ時間**: 24時間表記（例: `15:15`）
- **終了時間**: キックオフから約2.5時間後（例: `17:45`）
- **試合会場**: 会場名とGoogle Maps検索用クエリ
- **ホーム/アウェイ**: `true`=ホーム, `false`=アウェイ, `null`=未設定
- **試合結果**: 終了前は`null`、終了後はスコア情報
- **スタッツ**: 終了前は`null`、終了後はURL情報

### シーズンステータス
- `closed`: チケット販売前（チケットボタン非表示）
- `open`: チケット販売中（チケットボタン表示）
- `finished`: シーズン終了

## UI/UX要件

### デザイン原則
1. **モバイルファースト**: スマートフォンでの閲覧を最優先
2. **情報の階層化**: 重要な情報（日時、対戦相手）を目立たせる
3. **アクション重視**: 各試合への具体的なアクション（地図、カレンダー、チケット）を提供
4. **動的な情報表示**: 試合前は日程情報、試合後は結果を自動切替

### レイアウト

#### モバイル版（〜640px）
- 1列表示
- カード型デザイン（スリムな高さ）
- 中央揃えのテキスト
- 横幅いっぱいのカード

#### PC版（640px〜）
- 1列表示（最大幅48rem、中央配置）
- 左揃えのテキスト
- 日時の横位置を固定幅で統一

### カードコンポーネント

#### 構成要素
1. **日時エリア**（左側）
   - 日付（1行目）: `月/日(曜日祝)`形式
   - キックオフ時間（2行目）
   - PC版: 固定幅（`sm:w-40`）で横位置統一

2. **試合情報エリア**（中央）
   - 試合前: `vs 対戦相手` 表示
   - 試合後: スコア表示（`21 - 14 WIN vs 対戦相手`）
   - 試合会場（小さめのフォント、グレー）

3. **アクションボタン**（右側）
   - アイコンのみ表示（テキストなし）
   - 条件付き表示:
     - 地図: 常時表示
     - カレンダー: 常時表示
     - スタッツ: 試合終了後のみ（青色）
     - チケット: 試合前かつstatus=openの場合のみ（赤色）

### アクションボタン仕様

#### 共通仕様
- **スタイル**: 丸型（`rounded-full`）、ホバー時に色変化
- **レスポンシブ**: モバイルでも同じサイズ

#### 各ボタンの詳細

1. **地図ボタン**
   - アイコン: Heroicons `map-pin`
   - 色: グレー（`bg-gray-100`、ホバー時 `bg-gray-200`）
   - 機能: Google Mapsで会場を検索

2. **カレンダーボタン**
   - アイコン: Heroicons `calendar-days`
   - 色: グレー（`bg-gray-100`、ホバー時 `bg-gray-200`）
   - 機能: Google カレンダーに追加

3. **スタッツボタン**（試合終了後のみ）
   - アイコン: バーチャートアイコン
   - 色: 青（`bg-blue-600`、ホバー時 `bg-blue-700`）
   - 機能: スタッツページへ遷移

4. **チケットボタン**（試合前・販売中のみ）
   - アイコン: Heroicons `ticket`
   - 色: 赤（`bg-red-600`、ホバー時 `bg-red-700`）
   - 機能: チケット購入サイトへ遷移

## 技術実装

### JavaScript関数

#### schedule-loader.js
```javascript
// メインローダー
async function loadSchedule() {
    const response = await fetch('./assets/games/2025.json');
    const data = await response.json();
    // 動的にHTMLを生成
}

// 試合カード生成
function createGameCard(game, ticketUrl, isOpen) { ... }

// 試合結果表示
function createResultDisplay(game) { ... }

// 各種ボタン生成
function createMapButton(mapsQuery) { ... }
function createCalendarButton(game) { ... }
function createTicketButton(ticketUrl) { ... }
function createStatsButton(statsUrl) { ... }
```

#### index.js内の連携関数

##### openGoogleMaps(venue)
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

##### addToGoogleCalendar(date, time, opponent, venue)
```javascript
function addToGoogleCalendar(date, time, opponent, venue) {
    const startDateTime = new Date(`${date}T${time}:00+09:00`);
    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `Club TRIAX vs ${opponent}`,
        dates: `${formatDateTime(startDateTime)}/${formatDateTime(endDateTime)}`,
        location: venue,
        details: `...`,
        ctz: 'Asia/Tokyo'
    });

    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank');
}
```

### スタイリング（Tailwind CSS）

#### カードコンテナ
```html
<div class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow fade-in">
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

1. **動的読み込み**: JSONからの非同期データ取得
2. **アイコン**: インラインSVGで表示（追加リクエスト不要）
3. **JavaScript**: `defer`属性で遅延実行

## 運用・更新

### 更新フロー
1. `docs/assets/games/2025.json`を編集
2. ローカルで動作確認
3. 変更をコミット・プッシュ
4. GitHub Pagesで自動デプロイ

### 試合結果の記録
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
  "stats": { "url": "https://..." }
}
```

### 注意事項
- 試合日程の変更は迅速に反映する
- statusを`open`に変更するとチケットボタンが表示される
- 新しいスタジアムが追加された場合は、`venue.mapsQuery`で検索対応可能

## 関連ファイル
- `docs/assets/games/2025.json`: スケジュールデータ
- `docs/assets/games/schema.json`: JSONスキーマ
- `docs/assets/games/schedule-loader.js`: 動的ローダー
- `docs/index.html`: SCHEDULEセクションのコンテナ
- `docs/index.js`: Google Maps/Calendar連携機能

## 更新履歴
- 2025-08-22: 初版作成（静的HTML方式）
- 2025-12-28: JSONベースの動的生成方式に刷新
