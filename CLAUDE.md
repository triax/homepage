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
mainブランチへのプッシュ時に、GitHub Pagesへ自動的にデプロイされます。

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
│   │   └── members/ # メンバー画像（Google Drive IDをファイル名に使用）
│   └── index.html   # GitHub Pages用HTMLファイル
├── scripts/         # 管理用TypeScriptスクリプト
│   ├── download-all-images.ts    # 画像ダウンロード・同期
│   ├── check-image-sync.ts       # 同期状態チェック
│   ├── cleanup-unused-images.ts  # 不要画像削除
│   ├── create-image-mapping.ts   # 画像マッピング作成
│   ├── check-missing-images.ts   # 画像表示チェック（要Playwright）
│   ├── fetch-instagram.ts        # Instagram投稿取得
│   └── refresh-instagram-token.ts # Instagram Access Token更新
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

## 画像管理スクリプト

メンバー画像の管理を自動化するためのTypeScriptスクリプトが用意されています。
（注：tsxを使用して直接実行するため、事前のトランスパイルは不要です）

### 主要コマンド

#### 画像同期コマンド

```bash
# 画像の同期状態をチェック
npm run img:check

# 不足している画像をダウンロード
npm run img:download

# 不要な画像を削除（確認モード）
npm run img:cleanup

# 不要な画像を削除（実行）
npm run img:cleanup:force

# ダウンロードと削除を同時に実行（完全同期）
npm run img:sync
```

#### 画像最適化コマンド

```bash
# メンバー画像の最適化（800px, 85%品質）
./scripts/optimize-images.sh --target=docs/assets/members

# ギャラリー画像の最適化（1920px, 85%品質, 連番リネーム）
./scripts/optimize-images.sh --target=docs/assets/gallery

# ヘッダー画像の最適化（1920px, 90%品質）
./scripts/optimize-images.sh --target=docs/assets/headers

# スポンサー画像の最適化（600px, 85%品質）
./scripts/optimize-images.sh --target=docs/assets/sponsors

# 変更をプレビュー（dry-runモード）
./scripts/optimize-images.sh --target=docs/assets/members --dry-run
```

### スクリプトの詳細

1. **download-all-images.ts**
   - Roster API から画像をダウンロード
   - 既存ファイルのスキップ機能
   - 同期モード（--sync）で不要ファイルも削除

2. **check-image-sync.ts**
   - APIと実際のファイルを比較
   - 不足/余分な画像を特定
   - 同期率を表示

3. **cleanup-unused-images.ts**
   - APIに存在しない画像を削除
   - デフォルトはdry-runモード
   - --forceで実際に削除

4. **create-image-mapping.ts**
   - Google Drive IDとファイル名のマッピングを作成
   - docs/image-mapping.json に出力

5. **check-missing-images.ts**
   - ブラウザで実際の表示をチェック（要Playwright）
   - ローカルサーバー起動が必要

### 画像ファイルの命名規則

- ファイル名: `{Google Drive ID}.{拡張子}`
- 例: `1RkyEPOq0CELzOCIICoanFWrFYnWD_bZ5.jpg`
- Google Drive IDはRoster APIから取得

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

試合スケジュール情報の管理と表示機能。

### データ管理
- **ソースファイル**: `SCHEDULE_2025.md` - Markdownテーブル形式でスケジュールを管理
- **表示先**: `docs/index.html` の SCHEDULEセクション
- **更新方法**: Markdownファイルを編集後、HTMLを手動更新

### 機能
- **Google Maps連携**: 会場への地図リンク
- **Google Calendar連携**: 試合予定をカレンダーに追加
- **チケット購入**: 外部チケットサイトへのリンク

### 更新手順
1. `SCHEDULE_2025.md` を編集
2. `docs/index.html` のSCHEDULEセクションを更新
3. 動作確認後、コミット・プッシュ

詳細は以下のドキュメントを参照：
- `knowledge/01-requirements/functional/pages/SCHEDULE.md` - 機能仕様
- `knowledge/02-architecture/schedule-integration.md` - 技術仕様
- `knowledge/04-operations/schedule-management.md` - 運用手順

## Instagram連携

### 概要
Instagram Graph APIを使用して最新投稿を自動取得・表示する機能。

### 自動更新システム
- **投稿取得**: 12時間ごとに自動実行（media_url期限対策）
- **トークン更新**: 月2回自動実行（1日と15日）

### 管理コマンド
```bash
# Instagram投稿を手動取得
npm run instagram:fetch

# Access Tokenを手動更新（24時間経過後のみ可能）
npm run instagram:refresh-token
```

### 必要な環境変数 / Secrets
- **ローカル開発**: `.env`ファイル
  - `IG_USER_ID`: InstagramユーザーID
  - `IG_ACCESS_TOKEN`: Long-lived Access Token

- **GitHub Actions**: Repository Secrets
  - 同上の値をSecrets設定から登録

### トラブルシューティング
- media_url期限切れ: 12時間ごとの自動更新で解決
- トークン期限切れ: 月2回の自動更新で解決
- 手動介入が必要な場合: `knowledge/05-troubleshooting/instagram-issues.md`参照

### 関連ドキュメント
- `knowledge/02-architecture/instagram-integration.md` - アーキテクチャ
- `knowledge/04-operations/instagram-secrets-setup.md` - 初期設定
- `knowledge/04-operations/instagram-token-refresh.md` - トークン管理
- `knowledge/05-troubleshooting/instagram-issues.md` - トラブルシューティング

## OGPメタタグ設定

### チーム理念の反映
Club TRIAXは「**LIFE・WORK・PLAY**」という理念と「**個人の充実**」を最重要価値観として掲げています。
この理念はOGPメタタグにも反映されています：

```html
<meta property="og:title" content="Club TRIAX - LIFE・WORK・PLAY">
<meta property="og:description" content="X1リーグ所属 Club TRIAX のホームページです。Club TRIAX は「LIFE・WORK・PLAY」のチーム理念のもと、私生活と仕事とアメフトの相乗効果を通じて、一人一人の個性と充実を最大化することで「強いフットボールチーム」を目指しています。">
<meta property="og:image" content="https://www.triax.football/assets/ogp/default.jpg">
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