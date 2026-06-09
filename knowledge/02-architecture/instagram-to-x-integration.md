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
