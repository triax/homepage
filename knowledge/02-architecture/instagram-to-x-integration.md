# Instagram → X(Twitter) クロスポスト連携アーキテクチャ

Instagram の最新投稿を取得する既存ワークフローに相乗りし、新規投稿を TRIAX 公式 X アカウントへ自動クロスポストする。

## 全体フロー

```
GitHub Actions (fetch-instagram-posts.yml, 12時間ごと)
  1. posts.json を /tmp/prev_posts.json に退避
  2. instagram:fetch    → docs/assets/instagram/posts.json を最新化
  3. instagram:notify-slack → 新規投稿を #instagram へ通知
  4. instagram:post-x   → 新規投稿を X へクロスポスト  ★今回追加
  5. posts.json に差分があればコミット&プッシュ
```

ステップ4（X投稿）は posts.json 内の `twitter` フィールドを状態として扱う方式、
ステップ3（Slack通知）は従来どおり `/tmp/prev_posts.json` との id diff 方式（独立）。
どちらも `continue-on-error: true` のため、失敗してもワークフロー本体（fetch & commit）は落ちない。

## 投稿済み状態の管理（twitter フィールド）

posts.json の各投稿に「Xに投稿済みか」を状態として正規化する。

```jsonc
"twitter": { "tweet_id": "1799...", "posted_at": "2026-06-09T..." }  // 投稿済み
"twitter": null                                                       // 未投稿（対象）
```

- **post-x**: `twitter == null` の投稿を timestamp 昇順（古い順）に投稿。成功するたびに
  その投稿の `twitter` を `{ tweet_id, posted_at }` で埋めて posts.json を**書き戻す**。
  失敗した投稿は `null` のまま残り、**次回run で自動リトライ**される（取りこぼしゼロ）。
- **fetch**: posts.json を毎回 API から再生成するが、`loadTwitterState()` で既存の `twitter` を
  `id` でマージして引き継ぐ（これが無いと再生成でフラグが消える）。新規投稿は `twitter: null`。
- **commit**: post-x が書き戻した posts.json をワークフローがコミットし、状態が永続化される。
- **バックフィル**: 機能導入時、既存投稿の連投を防ぐため最新1件のみ `twitter: null`、
  残りは投稿済み（`tweet_id: null` で抑制）としてマークした。

### prev-diff 方式からの改訂理由
当初は Slack 通知と同じ prev-diff 方式だったが、X投稿が失敗しても posts.json はコミットされるため、
失敗した投稿が二度と再投稿されない取りこぼしが起きうる弱点があった。状態を posts.json に正規化することで解消した。

## watermark（高水位点）ガード

### 背景の事故
posts.json は毎fetchで最新6件だけに作り直され、`twitter` 状態はウィンドウ内6件しか引き継がれない。
Instagram Graph API が一時的に古い投稿を混ぜて返すと、状態を失った既投稿が `twitter: null`（未投稿扱い）で
再登場し、post-x がそれを新規として **X へ誤クロスポスト（二重投稿）** する事故が起きた。
これを構造的に防ぐため、**watermark 時刻より古い投稿はクロスポストしない**仕組みを導入した。

### データ
posts.json のトップレベルに `metadata.x_crosspost_watermark`（ISO8601）を持つ。
**この時刻以下（≦）の投稿はクロスポスト対象外**。

```jsonc
"metadata": { "x_crosspost_watermark": "2026-06-11T10:00:10+0000" }
```

### 判定ルール（post-x）
`new Date(...).getTime()` 比較で行う。

| 区分 | 条件 | 挙動 |
|------|------|------|
| **eligible（対象）** | `twitter == null` かつ `timestamp > watermark`（厳密に新しい） | timestamp昇順で X 投稿 |
| **stale-null（再登場した既投稿）** | `twitter == null` かつ `timestamp ≦ watermark` | **投稿せず** `twitter={tweet_id:null, posted_at:now}` で抑制。`console.warn` で警告 |
| 投稿済み/抑制済み | `twitter != null` | 無視 |

### watermark 前進ルール（単調非減少＝絶対に後退させない）
```
newWatermark = max( 旧watermark, twitter!=null の全投稿の timestamp の最大 )   ※getTime()比較
```
最大値を与える投稿の **timestamp文字列をそのまま**格納する（旧watermarkが新しければ旧値を維持）。

- **失敗リトライの含意**: クロスポストに失敗した eligible は `twitter==null` のまま残るので watermark を
  押し上げず、ウィンドウ内に残る限り次回run で自動リトライされる。**成功した最新まで**前進する。
- ウィンドウが古い方へ drift しても旧watermarkを下回らないため、状態を失って再登場した既投稿が
  再投稿されることはない（事故の構造的防止）。
- 実装上は成功するたびに metadata の watermark も再計算して書き戻し、途中失敗でも既成功分の前進が永続化される。

### ベースライン挙動（watermark 欠損時の安全網）
watermark が読めない場合（初回・欠損）は**今回1件もクロスポストしない**。代わりに
`watermark = 現ウィンドウの timestamp 最大` を確立し、`twitter==null` の全投稿に抑制マークを書く
（ベースライン確立run = no-op投稿）。これで初回や欠損時にバックログを一斉投稿する事故を防ぐ。
次回run以降、watermarkより新しい投稿だけが対象になる。通常はseed済みのため発火しない。

### fetch 側の引き継ぎ
fetch は posts.json を作り直す際 `loadWatermark()` で既存の `metadata.x_crosspost_watermark` を読み、
出力に保持する（**計算はせず保持のみ**）。既存値が無ければ `metadata` は `{}`。
出力キー順は `fetched_at, user_id, count, metadata, posts`。

### dry-run
`--dry-run` は**ファイルへ一切書き込まない**。eligible / stale-null / 予測 newWatermark をログ出力する。

## ツイート本文（buildTweetText）

構成: `キャプション冒頭 + 改行 + permalink + 改行 + 固定ハッシュタグ`

- X の文字数は weight 換算（CJK=2 / URL=23 / 絵文字=2、上限280）。`twitter-text-weight.ts` で計算。
- permalink・ハッシュタグ・改行を「固定分」として weight を確保し、残 weight にキャプションを詰める。
- 超過時はキャプション末尾を `…` で truncate（サロゲートペア考慮の文字単位）。
- **安全マージン**: 自前 weight 計算と X の実カウントにはズレがあり、280ぴったりだと
  `403 You are not permitted` で弾かれる。`SAFETY_MARGIN=20` を引いた**実効上限260**で truncate する。
  （weight 280/279 は403、260は成功することを実投稿で確認済み）

## メディア添付（x-media-upload.ts）

| Instagram media_type | X への添付 | アップロード方式 |
|----------------------|-----------|----------------|
| IMAGE | `media_url` を画像1枚 | シンプルアップロード ✅ |
| CAROUSEL_ALBUM | `children[]` の画像を最大4枚（X の画像上限） | シンプルアップロード ✅ |
| VIDEO | `media_url` を動画1本 | chunked ⚠️未検証 |

- **画像（シンプルアップロード）**: `POST /2/media/upload` に `{ media: <base64>, media_category }` の
  **JSONボディ**を1リクエスト送信して `media_id` を得る。
  ⚠️ 公式ドキュメントは command 方式 multipart（`command=INIT`/`total_bytes`）と記載しているが、
  v2 実エンドポイントはこれを **400（`$.media is missing but it is required`）で拒否**する。
  ドキュメントと実挙動が乖離しており、実際に通るのは `media` フィールドの JSON 方式（実投稿で確認済み）。
- **動画（chunked）**: `command=INIT/APPEND/FINALIZE/STATUS` の従来方式。**未検証で、画像と同じ400で
  失敗する可能性が高い**。その場合はメディア添付に失敗し下記フォールバックでテキストのみ投稿になる。
  実際の動画投稿が来たタイミングで検証・修正が必要。
- メディア取得/アップロード失敗時はそのメディアをスキップし、**テキストのみで投稿継続**（投稿自体は落とさない）。
- Instagram の `media_url` は短命 CDN URL だが、fetch 直後に投稿するため鮮度問題は起きない。

## 認証（x-oauth.ts）

- OAuth 1.0a（HMAC-SHA1）。`X_API_KEY`/`X_API_KEY_SECRET`（App）と `X_BOT_ACCESS_TOKEN`/`X_BOT_ACCESS_TOKEN_SECRET`（投稿先アカウント）。
- multipart/form-data の POST ではフォームフィールドを署名ベース文字列に含めない（クエリパラメータのみ署名）。
- 認証情報が未設定なら警告して exit 0（Slack 通知と同じ挙動でワークフローを落とさない）。

## ファイル構成

| ファイル | 役割 |
|----------|------|
| `scripts/post-instagram-to-x.ts` | メイン。`twitter==null` を古い順に X 投稿 |
| `scripts/lib/twitter-text-weight.ts` | 文字数 weight 計算 |
| `scripts/lib/x-oauth.ts` | OAuth 1.0a 署名ヘッダ生成 |
| `scripts/lib/x-media-upload.ts` | 画像=シンプルアップロード / 動画=chunked upload |

## 運用

```bash
# dry-run（認証情報不要。twitter==null の投稿の本文・メディア判定を確認、書き戻さない）
npm run instagram:post-x -- --dry-run

# 実投稿（twitter==null を投稿し、成功した分を posts.json に書き戻す）
npm run instagram:post-x
```

## ハマりどころ（実投稿で判明した運用上の学び）

X API は 2026年2月に無料枠廃止 → 従量課金（pay-per-use）化されており、初回稼働まで段階的に複数の壁がある。
エラーコードで原因を切り分けられる:

| エラー | 意味 | 対処 |
|--------|------|------|
| `403 oauth1-permissions` | Access Token が read-only | App権限をRead/Writeにした**後**にトークンを**再発行**（[[x-secrets-setup]] 手順3→4） |
| `403 client-not-enrolled` | アプリが Pay-Per-Use 未登録 | console.x.com で Pay-Per-Use を有効化、アプリをProjectに紐付け |
| `402 CreditsDepleted` | クレジット未チャージ | console.x.com の Billing でクレジットを前払いチャージ（投稿$0.01/件） |
| `400 $.media is missing` | メディアが command方式multipartで送られている | 画像はJSON+base64のシンプルアップロードで送る（実装済み） |
| `403 You are not permitted` | 文字数が実際には超過（weight計算のズレ） | 安全マージンで実効上限を下げる（実装済み: 260） |

その他:
- **commit/push 競合**: post-x が posts.json を書き戻す → 同時実行や手動pushで remote が進むと
  `! [rejected] (fetch first)` で push が失敗し、投稿済み状態を取りこぼす。
  ワークフローの commit ステップで push 前に `git pull --rebase` するよう対応済み。
  手動で連続トリガーする際は**同時実行を避ける**こと。

## 関連
- 認証情報の取得手順: `knowledge/04-operations/x-secrets-setup.md`
- 実装プラン: `knowledge/plans/instagram-to-x-crosspost.md`
- 参考実装（OAuth署名）: `~/proj/chrome/kanColleWidget/scripts/post-tweet.ts`
- 踏襲元（diff構造）: `scripts/notify-slack-instagram.ts`
