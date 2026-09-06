# Our Important Values

- Prioritize readability, testability, maintainability, extendability, and elegance for our source code.
- You are the manager and the agent orchestrator. You should never implement anything yourself, but delegate it to subagents and task agents. Break down tasks into smaller parts and build a PDCA cycle.
- Use `AskUserQuestion` tool as much as possible whenever there are any unclear points before starting actual tasks.
- Use `code-simplifier:code-simplifier` plugin to keep our source code always simple and clean.
- Use `frontend-design` skill when we need implement graphical user interface.

# Our knowledge base

Following knowledge should be stored under `./knowledge` folder:

- `./knowledge/specs/` = Specifications and requirements
- `./knowledge/styles/` = Coding conventions and style guides
- `./knowledge/plans/` = Execution plans
- `./knowledge/decisions/` = History of decision making (just for log)

---

# CLAUDE.ja.md

このファイルは、このリポジトリで作業する際のClaude Code (claude.ai/code)へのガイダンスを提供します。

## プロジェクト概要

これはGitHub Pagesでホスティングされるアメリカンフットボールクラブ「Club TRIAX」の静的ウェブサイトです。使用技術：

- HTML5
- Tailwind CSS (CDN経由)
- jQuery 3.7.1 (CDN経由)

### 本番環境

- **URL**: https://www.triax.football/
- **カスタムドメイン**: www.triax.football
- **ホスティング**: GitHub Pages（`/docs` フォルダから公開）

## 一般的な開発タスク

### ローカル開発

これは静的HTMLサイトなので、`index.html`を直接ブラウザで開くか、シンプルなHTTPサーバーを使用できます：

基本的に、HTTPサーバは以下のURLで立っています。

`http://127.0.0.1:3000/docs/index.html`

playwright mcp などを利用して、上記のHTTPサーバに訪問し、デザインなどをdebugしてください。

### デプロイメント

`.github/workflows/deploy-pages.yml` が GitHub Pages へデプロイします（Pages の Source は **GitHub Actions**）。
mainブランチへのプッシュのほか、Instagram取得ワークフローの完了時・毎日03:00 JST・手動実行でも走ります。
デプロイ時に hub の公開APIからメンバー情報を取得して `docs/` に生成物を作るため、生成物はコミットしません。

## プロジェクト構造

```
/
├── index.html        # メインホームページファイル
├── README.md         # GitHub Pagesデプロイメントバッジを含む
├── assets/
│   ├── headers/     # 各セクション用ヘッダー画像
│   └── ogp/         # Open Graph Protocol画像
├── docs/
│   ├── assets/
│   │   ├── roster.json   # メンバーデータ（ビルド生成物・git管理外）
│   │   ├── members/      # メンバー画像（ビルド生成物・git管理外）
│   │   ├── videos/       # プロモ動画（ヒーロー背景・フル尺）とポスター画像
│   │   └── crowdfunding/ # クラウドファンディングバナー（index.json・JS・サムネイル）
│   └── index.html   # GitHub Pages用HTMLファイル
├── scripts/         # 管理用TypeScriptスクリプト
│   ├── build-members.ts          # hub公開APIからメンバーデータ・写真を生成
│   ├── fetch-instagram.ts        # Instagram投稿取得
│   ├── refresh-instagram-token.ts # Instagram Access Token更新
│   ├── optimize-images.sh        # 画像最適化（ギャラリー・ヘッダー等）
│   └── encode-promo-videos.sh    # プロモ動画エンコード（要ffmpeg）
└── specs/           # デザイン仕様と要件
    ├── pages/       # 個別ページ仕様
    └── *.md         # 各種仕様書
```

## 開発ガイドライン

1. **モバイルファーストデザイン**: スマートフォンユーザーを主要対象としています。モバイルファーストアプローチでレスポンシブデザインを使用してください。

2. **シングルページアーキテクチャ**: ホームページは縦スクロール型の1ページ構成で、必要に応じて詳細ページへ遷移します。

3. **ナビゲーション**: モバイルフレンドリーなインターフェースのため、ハンバーガーメニューナビゲーションを実装します。

4. **スタイリング**: Tailwind CSSユーティリティクラスを使用します。CDN版は既にindex.htmlに含まれています。

5. **JavaScript**: DOM操作とイベント処理にjQueryが利用可能です。

6. **アセット**: ヘッダー画像は`assets/headers/`に特定の名前で保存されています（TOP.jpg、MEMBERS.jpg、NEWS.jpgなど）

7. **バージョン管理**: mainブランチがデプロイに使用されます。GitHub Pagesで公開される前に必ず変更をコミットしてください。
   - **コミットメッセージ**: 日本語でコミットメッセージを作成してください。明確で簡潔な説明を心がけてください。

## メンバー情報（hub連携）

メンバーのプロフィールと写真は hub（`https://hub.triax.football/members/{slack_id}`）で本人が編集し、
ホームページはビルド時に hub の公開APIから取得します。運営による年次のデータ更新作業は不要です。

### コマンド

```bash
# hubからメンバー情報・写真を取得して生成物を作る
HUB_API_KEY=<key> pnpm build:members
```

- 生成物: `docs/assets/roster.json`（v2スキーマ）と `docs/assets/members/{slack_id}-{formal|casual|additional-N}.jpg`
- 写真は長辺800px・品質85のJPEGに正規化（PNGは白背景でflatten）
- **どちらもgit管理外**（`.gitignore` 済み）。GitHub Actions のデプロイ時に毎回生成する
- 取得失敗（キー未設定・401・到達不能・掲載対象0名）時は生成物を書き換えず終了コード1で失敗する
- 写真未登録メンバーは `docs/assets/member-placeholder.jpg`（ロゴ透かし・git管理）を表示。再生成は `./scripts/generate-member-placeholder.sh --production`（ADR-010）

### API キー

hub の公開API `GET /api/1/public/members` は `X-API-Key` ヘッダが必須（CORSヘッダなし・`Cache-Control: private` のため**ビルド時取得のみ**）。

| 環境変数      | 説明                                                            |
| ------------- | --------------------------------------------------------------- |
| `HUB_API_KEY` | hub の公開APIキー。GitHub Actions secret `HUB_API_KEY` から注入 |
| `HUB_API_URL` | 任意。取得先の上書き（既定は hub 本番）                         |

キー値はリポジトリ・生成物・ログに出さないこと。詳細とローテーション手順は
`knowledge/04-operations/hub-members-sync.md`、決定経緯は `knowledge/06-decisions/009-members-from-hub.md` を参照。

## 画像管理スクリプト

（注：tsxを使用して直接実行するため、事前のトランスパイルは不要です）

#### 画像最適化コマンド

```bash
# ギャラリー画像の最適化（1920px, 85%品質, 連番リネーム）
./scripts/optimize-images.sh --target=docs/assets/gallery

# ヘッダー画像の最適化（1920px, 90%品質）
./scripts/optimize-images.sh --target=docs/assets/headers

# スポンサー画像の最適化（600px, 85%品質）
./scripts/optimize-images.sh --target=docs/assets/sponsors

# 変更をプレビュー（dry-runモード）
./scripts/optimize-images.sh --target=docs/assets/gallery --dry-run
```

※ メンバー画像は `build-members.ts` が取得時にリサイズするため、このスクリプトの対象外です。

## 主要なデザイン仕様

プロジェクトはspecs/ディレクトリに記載された特定のデザイン要件に従います：

- モバイルファーストのレスポンシブデザイン
- チームメンバーの物語と個性に焦点を当てる
- ソーシャルメディア（Instagram）との連携
- 多言語コンテンツの考慮のサポート

## スポンサーセクション

### 概要

スポンサー企業情報は `docs/assets/sponsors/index.json` で管理され、`sponsor-loader.js` により動的に表示されます。

### Tier構成

- **Gold Tier**: 最大サイズ（1段1社）- プラチナスポンサー
- **Silver Tier**: 中サイズ（1段最大2社）- ゴールドスポンサー
- **Bronze Tier**: 小サイズ（1段最大3社）- シルバースポンサー

### ディレクトリ構造

```
docs/assets/sponsors/
├── gold/          # Gold Tierスポンサー画像
├── silver/        # Silver Tierスポンサー画像（研精会グループなど）
├── bronze/        # Bronze Tierスポンサー画像
├── index.json     # スポンサー情報（URL、画像パス）
└── sponsor-loader.js  # 動的読み込みスクリプト
```

### 管理方法

1. 画像を適切なTierディレクトリに配置
2. `index.json` にスポンサー情報を追加・更新
3. ページ読み込み時に自動的に反映

詳細は以下を参照：

- `knowledge/04-operations/sponsor-management.md` - スポンサー管理ガイド
- `knowledge/01-requirements/functional/pages/SPONSORS.md` - 機能仕様

## フォトギャラリー

チーム写真ギャラリーを管理。PCではLightbox機能で拡大表示可能。

### 画像管理フロー

1. 画像を `docs/assets/gallery/` に配置
2. `./scripts/optimize-images.sh --target=docs/assets/gallery` で最適化＆リネーム
3. `node scripts/generate-gallery-html.js` でHTML生成

### 技術仕様

- **画像形式**: 連番（01.jpg, 02.jpg...）
- **最適化**: 最大幅1920px、品質85%
- **Lightbox**: PC（1024px以上）のみ有効

詳細は `knowledge/04-operations/gallery-management.md` を参照。

## 画像最適化

統合スクリプト `scripts/optimize-images.sh` で全ての画像を最適化できます。

### 重要な技術的決定

- **EXIF方向の処理**: `-auto-orient`フラグで画像の向きを正しく保持
- **バックアップ**: Gitでバージョン管理しているため別途バックアップは作成しない
- **スキップ閾値**: 500KB以下のファイルは既に最適化済みとみなす

詳細は `knowledge/04-operations/image-optimization.md` を参照。

## 試合スケジュール管理

試合スケジュール情報の管理と表示機能。JSONファイルで管理し、JavaScriptで動的に表示。

### ディレクトリ構造

```
docs/assets/games/
├── 2025.json           # 2025年シーズンの試合データ（アーカイブ）
├── 2026.json           # 2026年シーズンの試合データ
├── schema.json         # JSONスキーマ（構造のドキュメント）
└── schedule-loader.js  # 動的ローダースクリプト
```

表示するシーズンは `schedule-loader.js` 先頭の `SEASON_YEAR` 定数で切り替える。
データソース: X League公式 X1 日程 https://xleague-nfa.jp/x1x2x3/x1_date/

### データ構造（2026.json）

```json
{
  "year": 2026,
  "preseason": { "status": "closed", "ticket": null, "game": null },
  "regularseason": {
    "status": "open", // closed=非公開, open=公開中, finished=終了
    "ticket": "シーズン共通チケットURL", // 試合個別のticketが無い場合のフォールバック
    "games": [
      {
        "round": "第1節", // 節（任意。日付の上に小さく表示）
        "date": "2026-09-05",
        "dayOfWeek": "土",
        "holiday": "祝", // 祝日の場合のみ
        "opponent": "対戦相手",
        "kickoff": "13:30",
        "endTime": "16:00", // Google Calendar用（kickoff+2.5h）
        "venue": { "name": "会場名", "mapsQuery": "検索クエリ" },
        "home": null, // true=ホーム, false=アウェイ, null=未設定
        "ticket": "試合個別のチケットURL", // 任意。指定するとシーズンのticketより優先
        "result": null, // 試合結果（未決着ならnull）
        "stats": null // スタッツURL（試合前はnull）
      }
    ]
  }
}
```

### 試合結果の記録

試合終了後、`result`と`stats`を更新：

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
  "stats": { "url": "https://example.com/stats/..." }
}
```

### 機能

- **Google Maps連携**: 会場への地図リンク
- **Google Calendar連携**: 試合予定をカレンダーに追加
- **チケット購入**: status="open"の場合のみ表示
- **試合結果表示**: resultがある場合はスコアと勝敗を表示
- **スタッツリンク**: stats.urlがある場合はボタン表示

### 更新手順

1. `docs/assets/games/2026.json` を編集（新シーズンは新ファイルを作成し `SEASON_YEAR` を更新）
2. 動作確認後、コミット・プッシュ（HTMLの編集は不要）

詳細は以下のドキュメントを参照：

- `docs/assets/games/schema.json` - JSONスキーマ定義
- `knowledge/01-requirements/functional/pages/SCHEDULE.md` - 機能仕様
- `knowledge/02-architecture/schedule-integration.md` - 技術仕様
- `knowledge/04-operations/schedule-management.md` - 運用手順

## プロモーション動画

ヒーロー背景のショート動画と、MOVIEセクションのフル尺プロモを管理。元動画から `scripts/encode-promo-videos.sh` で再生成する。

### 生成物（`docs/assets/videos/`）

- `hero-landscape.mp4` / `hero-portrait.mp4`: ヒーロー背景（PC横 / モバイル縦、無音ループ、約4MB）
- `promo-full.mp4` / `promo-full-portrait.mp4`: フル尺プロモ（横版 720p / 縦版、音声あり、`preload="none"`）。MOVIE セクションはサムネイルのみで、クリックすると少し余白のあるモーダル（`#video-modal`）で再生（全デバイス共通）。縦画面では縦版、横画面では横版を `<source media>` で選ぶ
- `promo-full-poster.jpg` / `promo-full-portrait-poster.jpg`: フル尺プロモのポスター画像（横版 / 縦版。モーダルを開く時に向きで切替）

### 再生成フロー

```bash
# 元動画（nohin0814.mp4 / nohin0814_tate+.mp4）をリポジトリ直下に配置（Gitには含めない）
./scripts/encode-promo-videos.sh            # すべて生成
./scripts/encode-promo-videos.sh --dry-run  # コマンド確認のみ
./scripts/encode-promo-videos.sh --only=hero  # hero | hero-landscape | hero-portrait | promo-full | poster
```

### 技術仕様

- **配信方式**: Progressive MP4 + faststart（HLS・YouTube埋め込みは現時点では不採用）
- **ヒーロー動画**: 元動画の27秒〜末尾を切り出し。縦横の振り分けは HTML の `<source media="(orientation: portrait)">`。`<video>` は `preload="none"`（`autoplay`/`poster` なし）で、`index.js` の `setupHeroVideo` が reduced-motion / saveData なら動画を外して静止画のまま、それ以外は `window` の `load` 後に `play()` する

詳細は `knowledge/04-operations/video-management.md`、決定経緯は `knowledge/06-decisions/008-hero-video-and-section-order.md` を参照。

## クラウドファンディングバナー

トップページ右下に固定表示するクラウドファンディング（スポチュニティ）告知カード。
これに伴い「メンバー募集」フローティングダイアログは**撤去済み**（マークアップ・`docs/assets/recruit_banner/` とも削除。復活時はコミット `b5fedf6` から復元、手順はADR-007参照）。

### 管理方法

- 設定は `docs/assets/crowdfunding/index.json` に集約。`crowdfunding-banner.js` が fetch して描画するため HTML・JS の編集は不要
- `url`: リンク先（計測用リンク受領後に差し替え）
- `endsAt`: 表示終了日（`"YYYY-MM-DD"`、過ぎると自動非表示）
- 「×」で閉じるとそのセッション中は非表示（`sessionStorage`）

詳細は `knowledge/04-operations/crowdfunding-banner.md`、決定経緯は `knowledge/06-decisions/007-remove-recruit-banner-add-crowdfunding.md` を参照。

## Instagram連携

### 概要

Instagram Graph APIを使用して最新投稿を自動取得・表示する機能。

### 自動更新システム

- **投稿取得**: 12時間ごとに自動実行（media_url期限対策）
- **トークン更新**: 不要（Page Access Tokenは無期限）

### 管理コマンド

```bash
# Instagram投稿を手動取得
pnpm instagram:fetch

# Page Access Token（無期限）を取得（初回のみ）
pnpm instagram:get-page-token

# 短期トークン → Long-Livedトークンに変換（get-page-tokenの前に実行）
pnpm instagram:exchange-slt2llt
```

### Access Token

**Page Access Token（無期限）を使用**しています。

| 環境変数                        | 説明                          |
| ------------------------------- | ----------------------------- |
| `FACEBOOK_PAGE_ACCESS_TOKEN`    | Page Access Token（無期限）   |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | Instagram Business Account ID |

※ レガシー変数（`FACEBOOK_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`）もフォールバックとしてサポート

### トークンが無効化された場合の復旧

```bash
# 1. Graph API Explorerで短期トークンを取得し.envに設定
# 2. Long-lived変換
pnpm instagram:exchange-slt2llt
# 3. Page Access Token取得
pnpm instagram:get-page-token
# 4. GitHub Secretsを更新
```

### 関連ドキュメント

- `knowledge/02-architecture/instagram-integration.md` - アーキテクチャ（詳細）
- `knowledge/05-troubleshooting/instagram-issues.md` - トラブルシューティング
- `.env.example` - 環境変数の詳細

## OGPメタタグ設定

### チーム理念の反映

Club TRIAXは「**LIFE・WORK・PLAY**」という理念と「**個人の充実**」を最重要価値観として掲げています。
この理念はOGPメタタグにも反映されています：

```html
<meta property="og:title" content="Club TRIAX - LIFE・WORK・PLAY" />
<meta
  property="og:description"
  content="X1リーグ所属 Club TRIAX のホームページです。Club TRIAX は「LIFE・WORK・PLAY」のチーム理念のもと、私生活と仕事とアメフトの相乗効果を通じて、一人一人の個性と充実を最大化することで「強いフットボールチーム」を目指しています。"
/>
<meta
  property="og:image"
  content="https://www.triax.football/assets/ogp/default.jpg"
/>
```

### OGP画像

- **ファイルパス**: `docs/assets/ogp/default.jpg`
- **推奨サイズ**: 1200 x 630px（アスペクト比 1.91:1）
- **デザイン**: チーム全体の円陣写真にTRIAXロゴをオーバーレイ

### 関連ドキュメント

- `knowledge/02-architecture/ogp-meta-tags.md` - OGPメタタグ仕様
- `knowledge/04-operations/ogp-image-management.md` - OGP画像管理
- `knowledge/07-team-culture/team-philosophy.md` - チーム理念・価値観

## カスタムドメイン設定

### DNS設定状況

Club TRIAXのサイトは `www.triax.football` でアクセス可能です。

### DNS確認コマンド

```bash
# CNAMEレコードの確認
dig www.triax.football CNAME

# Aレコードの確認（apex domain）
dig triax.football A

# 複数のDNSサーバーで確認
dig @8.8.8.8 www.triax.football  # Google DNS
dig @1.1.1.1 www.triax.football  # Cloudflare DNS

# HTTPS接続テスト
curl -I https://www.triax.football
```

### 関連ドキュメント

- `knowledge/04-operations/custom-domain-setup.md` - カスタムドメイン設定手順
- `knowledge/05-troubleshooting/custom-domain-issues.md` - ドメイン関連のトラブルシューティング
- `knowledge/02-architecture/dns-configuration.md` - DNS構成アーキテクチャ
