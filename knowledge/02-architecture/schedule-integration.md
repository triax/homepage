# スケジュール機能の技術アーキテクチャ

## 概要
試合スケジュール表示機能の技術的な実装詳細とアーキテクチャ設計について記述する。

## システム構成

### データフロー
```
SCHEDULE_2025.md (Source)
    ↓ [Manual Update]
docs/index.html (View)
    ↓ [JavaScript]
External Services (Google Maps/Calendar)
```

## コンポーネント設計

### 1. データ層

#### SCHEDULE_2025.md
- **役割**: スケジュールデータのマスターソース
- **形式**: Markdownテーブル
- **更新方法**: 手動編集
- **利点**:
  - バージョン管理が容易
  - 人間が読みやすい
  - 編集が簡単

#### データ構造
```typescript
interface GameSchedule {
  date: string;        // "9月7日（日）"
  opponent: string;    // "ペンタオーシャン パイレーツ"
  kickoff: string;     // "15:15"
  venue: string;       // "富士通スタジアム川崎"
}
```

### 2. プレゼンテーション層

#### HTML構造
```html
<section id="schedule">
  <div class="schedule-container">
    <div class="schedule-card">
      <div class="date-time-area">...</div>
      <div class="game-info-area">...</div>
      <div class="action-buttons">...</div>
    </div>
  </div>
</section>
```

#### スタイリング戦略
- **Tailwind CSS**: ユーティリティファーストアプローチ
- **レスポンシブ設計**: モバイルファースト
- **ホバーエフェクト**: ユーザー体験の向上

### 3. ビジネスロジック層

#### JavaScript関数

##### openGoogleMaps
```javascript
function openGoogleMaps(venue) {
    // 会場名のマッピング（正確な検索のため）
    const venueMap = {
        '富士通スタジアム川崎': 'https://www.google.com/maps/search/富士通スタジアム川崎',
        'アミノバイタルフィールド': 'https://www.google.com/maps/search/アミノバイタルフィールド'
    };

    // マッピングにない場合は汎用検索
    const url = venueMap[venue] ||
                `https://www.google.com/maps/search/${encodeURIComponent(venue)}`;

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
    const year = new Date().getFullYear();

    // 日付パース処理
    const monthDayMatch = date.match(/(\d+)月(\d+)日/);
    if (!monthDayMatch) return;

    const month = parseInt(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2]);

    // 時刻パース処理
    const [hours, minutes] = time.split(':').map(Number);

    // ISO8601形式の日時生成
    const startDate = new Date(year, month - 1, day, hours, minutes);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // 3時間後

    // Google Calendar URL生成
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `Club TRIAX vs ${opponent}`,
        dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
        location: venue,
        details: `Club TRIAXの試合\\n対戦相手: ${opponent}\\n会場: ${venue}`
    });

    window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank');
}
```

**設計判断**:
- 試合時間は3時間と仮定（一般的な試合時間）
- 年は現在年を使用（シーズン単位での運用想定）
- ISO8601形式で時刻を扱う（標準準拠）

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

### チケット購入サイト
- **URL**: `https://sports.banklives.com/events/clubtriax`
- **方式**: 直接リンク
- **注意**: 全試合共通URL（個別試合のURLは未対応）

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
- 最大幅制限（900px）

## パフォーマンス最適化

### 実装済み
1. **インラインSVG**: アイコンの追加リクエスト削減
2. **CSS in HTML**: 追加のCSSファイル読み込み不要
3. **遅延なし読み込み**: 重要情報のため初期表示

### 検討事項
1. **データの動的読み込み**: 現在は静的HTML
   - 将来的にはJSONファイルから動的生成も検討
2. **キャッシュ戦略**:
   - スケジュール変更頻度が低いため静的配信で十分

## セキュリティ考慮事項

1. **XSS対策**:
   - HTMLエスケープ処理（手動更新のため現状は不要）
   - 将来的な動的生成時は必須

2. **外部リンク**:
   - `target="_blank"`使用時の`rel="noopener"`追加検討
   - 現状はJavaScript `window.open()`使用

## 今後の拡張可能性

### 短期的改善
1. 試合結果の表示機能
2. 過去の試合のアーカイブ
3. 個別試合詳細ページ

### 長期的検討
1. APIからの動的データ取得
2. リアルタイム更新
3. プッシュ通知連携
4. SNSシェア機能

## 技術的決定事項

### なぜ静的HTMLか
- **理由**:
  - 更新頻度が低い（週1回程度）
  - GitHub Pagesでのホスティング
  - 実装・運用の簡単さ
- **トレードオフ**:
  - 手動更新が必要
  - リアルタイム性なし

### なぜTailwind CSSか
- **理由**:
  - 迅速な開発
  - 一貫性のあるデザイン
  - レスポンシブ対応が容易
- **トレードオフ**:
  - HTMLが冗長になる
  - カスタムデザインに制限

### なぜjQueryか
- **理由**:
  - プロジェクト全体で使用済み
  - 簡単なDOM操作には十分
  - 学習コストが低い
- **トレードオフ**:
  - モダンではない
  - バンドルサイズ

## メンテナンス指針

1. **定期更新**:
   - シーズン開始前に全試合情報更新
   - 変更があれば都度更新

2. **テスト**:
   - 各ボタンの動作確認
   - レスポンシブ表示確認
   - 外部サービス連携確認

3. **監視**:
   - 外部サービスのURL変更
   - ブラウザ互換性
   - モバイルデバイス対応