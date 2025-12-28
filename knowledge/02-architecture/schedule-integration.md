# スケジュール機能の技術アーキテクチャ

## 概要
試合スケジュール表示機能の技術的な実装詳細とアーキテクチャ設計について記述する。
JSONファイルからデータを読み込み、JavaScriptで動的にHTMLを生成する。

## システム構成

### データフロー
```
docs/assets/games/2025.json (Source)
    ↓ [fetch API]
docs/assets/games/schedule-loader.js (Loader)
    ↓ [DOM Manipulation]
docs/index.html #schedule-container (View)
    ↓ [User Interaction]
External Services (Google Maps/Calendar)
```

### ファイル構成
```
docs/assets/games/
├── 2025.json           # 試合データ（年度別）
├── schema.json         # JSONスキーマ定義
└── schedule-loader.js  # 動的ローダー
```

## コンポーネント設計

### 1. データ層

#### 2025.json
- **役割**: スケジュールデータのマスターソース
- **形式**: JSON
- **更新方法**: 手動編集
- **利点**:
  - バージョン管理が容易
  - プログラムからの読み込みが簡単
  - スキーマによる構造の文書化

#### データ構造（TypeScript型定義）
```typescript
interface SeasonData {
  year: number;
  preseason?: SeasonBlock;
  regularseason: SeasonBlock;
  postseason?: SeasonBlock;
}

interface SeasonBlock {
  status: "closed" | "open" | "finished";
  ticket: string | null;
  game?: Game | null;   // 単一試合（preseasonなど）
  games?: Game[];       // 複数試合
}

interface Game {
  date: string;         // "2025-09-07" (ISO形式)
  dayOfWeek: string;    // "日"
  holiday?: string;     // "祝"（祝日の場合のみ）
  opponent: string;     // "ペンタオーシャン パイレーツ"
  kickoff: string;      // "15:15"
  endTime: string;      // "17:45"
  venue: Venue;
  home: boolean | null; // true=ホーム, false=アウェイ, null=未設定
  result: GameResult | null;
  stats: Stats | null;
}

interface Venue {
  name: string;         // "富士通スタジアム川崎"
  mapsQuery: string;    // "富士通スタジアム川崎"
}

interface GameResult {
  score: { team: number; opponent: number };
  quarters: {
    Q1: QuarterScore;
    Q2: QuarterScore;
    Q3: QuarterScore;
    Q4: QuarterScore;
    OT: QuarterScore | null;
  };
  win: boolean | null;  // true=勝ち, false=負け, null=引き分け
}

interface QuarterScore {
  team: number;
  opponent: number;
}

interface Stats {
  url: string;
}
```

### 2. ローダー層

#### schedule-loader.js
- **役割**: JSONを読み込んでHTMLを動的生成
- **実行タイミング**: DOMContentLoaded
- **主要関数**:
  - `loadSchedule()`: メインのローダー関数
  - `createGameCard()`: 試合カードのHTML生成
  - `createResultDisplay()`: 試合結果の表示
  - `createMapButton()`: 地図ボタン生成
  - `createCalendarButton()`: カレンダーボタン生成
  - `createTicketButton()`: チケットボタン生成
  - `createStatsButton()`: スタッツボタン生成

### 3. プレゼンテーション層

#### HTML構造
```html
<section id="schedule">
  <div id="schedule-container" class="max-w-3xl mx-auto space-y-3 mb-8">
    <!-- 動的に生成される試合カード -->
    <div class="bg-white rounded-lg shadow hover:shadow-lg transition-shadow fade-in">
      <div class="flex flex-col sm:flex-row items-center p-4 gap-4">
        <div class="flex-1 ...">
          <!-- 日時情報 -->
          <!-- 試合情報 -->
        </div>
        <div class="flex gap-2">
          <!-- アクションボタン -->
        </div>
      </div>
    </div>
  </div>
</section>
```

#### スタイリング戦略
- **Tailwind CSS**: ユーティリティファーストアプローチ
- **レスポンシブ設計**: モバイルファースト
- **ホバーエフェクト**: ユーザー体験の向上

### 4. ビジネスロジック層

#### JavaScript関数（index.js内）

##### openGoogleMaps
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

**設計判断**:
- 既知の会場は直接URLを定義（精度向上）
- 未知の会場は動的に検索URL生成（拡張性）
- 新しいタブで開く（ユーザー体験）

##### addToGoogleCalendar
```javascript
function addToGoogleCalendar(date, time, opponent, venue) {
    const [hours, minutes] = time.split(':');
    const startDateTime = new Date(`${date}T${hours}:${minutes}:00+09:00`);
    const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000);

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `Club TRIAX vs ${opponent}`,
        dates: `${formatDateTime(startDateTime)}/${formatDateTime(endDateTime)}`,
        details: `Club TRIAXの試合\n対戦相手: ${opponent}\n会場: ${venue}\nキックオフ: ${time}`,
        location: venue,
        ctz: 'Asia/Tokyo'
    });

    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank');
}
```

**設計判断**:
- 試合時間は3時間と仮定（一般的な試合時間）
- ISO形式の日付を直接使用（パースが簡単）
- JSTを明示的に指定（タイムゾーン対応）

## 外部サービス連携

### Google Maps API
- **方式**: URL Scheme（API不要）
- **メリット**:
  - APIキー不要
  - 実装が簡単
  - メンテナンスフリー
- **デメリット**:
  - カスタマイズ性が低い
  - 詳細な制御不可

### Google Calendar
- **方式**: URL Scheme（API不要）
- **パラメータ**:
  - `action=TEMPLATE`: テンプレート作成
  - `text`: イベントタイトル
  - `dates`: 開始/終了時刻（UTC）
  - `location`: 場所
  - `details`: 詳細説明
  - `ctz`: タイムゾーン

### チケット購入サイト
- **URL**: `https://sports.banklives.com/events/clubtriax/155`
- **方式**: 直接リンク
- **条件付き表示**: `status === "open"` の場合のみ

## レスポンシブデザイン実装

### ブレークポイント
```css
/* Tailwind CSS default breakpoints */
sm: 640px   /* タブレット */
md: 768px   /* 小型PC */
lg: 1024px  /* デスクトップ */
```

### デバイス別対応

#### モバイル（〜640px）
- テキスト中央揃え
- ボタン下部配置
- フルワイドカード

#### タブレット/PC（640px〜）
- テキスト左揃え
- ボタン右側配置
- 最大幅制限（3xl = 48rem）

## パフォーマンス最適化

### 実装済み
1. **インラインSVG**: アイコンの追加リクエスト削減
2. **動的生成**: 必要なデータのみ読み込み
3. **非同期読み込み**: `defer`属性でスクリプト遅延実行

### 特徴
1. **データの動的読み込み**: JSONから動的生成
   - HTMLの手動更新が不要
   - データと表示の分離
2. **キャッシュ戦略**:
   - ブラウザキャッシュを活用
   - スケジュール変更頻度が低いため効果的

## セキュリティ考慮事項

1. **XSS対策**:
   - テンプレートリテラルでのHTML生成
   - 外部入力がないため現状は低リスク

2. **外部リンク**:
   - `target="_blank"`使用時はJavaScript `window.open()`を使用
   - ユーザー操作をトリガーとした遷移

## 今後の拡張可能性

### 短期的改善
1. ~~試合結果の表示機能~~ ✅ 実装済み
2. ~~スタッツへのリンク~~ ✅ 実装済み
3. 過去の試合のアーカイブ表示

### 長期的検討
1. 複数年度のデータ表示切り替え
2. リアルタイム更新（API連携）
3. プッシュ通知連携
4. SNSシェア機能

## 技術的決定事項

### なぜJSON + 動的生成か
- **理由**:
  - データと表示の分離
  - 更新時にHTMLを触る必要がない
  - 将来的なAPI連携への拡張性
- **トレードオフ**:
  - 初期表示がわずかに遅延
  - JavaScript無効時は表示されない

### なぜTailwind CSSか
- **理由**:
  - 迅速な開発
  - 一貫性のあるデザイン
  - レスポンシブ対応が容易
- **トレードオフ**:
  - HTMLが冗長になる
  - カスタムデザインに制限

## メンテナンス指針

1. **定期更新**:
   - シーズン開始前に全試合情報更新
   - 試合後に結果を更新

2. **テスト**:
   - 各ボタンの動作確認
   - レスポンシブ表示確認
   - 外部サービス連携確認

3. **監視**:
   - 外部サービスのURL変更
   - ブラウザ互換性
   - モバイルデバイス対応

## 更新履歴
- 2025-08-22: 初版作成（静的HTML方式）
- 2025-12-28: JSONベースの動的生成方式に刷新
