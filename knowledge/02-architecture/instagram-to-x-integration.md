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

## メディア添付（x-media-upload.ts）

| Instagram media_type | X への添付 |
|----------------------|-----------|
| IMAGE | `media_url` を画像1枚 |
| CAROUSEL_ALBUM | `children[]` の画像を最大4枚（X の画像上限） |
| VIDEO | `media_url` を動画1本 |

- X API v2 `POST /2/media/upload`（command 方式 / multipart-form-data）の chunked upload。
  INIT → APPEND（4MBチャンク）→ FINALIZE → （動画のみ）STATUS ポーリングで処理完了待ち。
- メディア取得/アップロード失敗時はそのメディアをスキップし、**テキストのみで投稿継続**（投稿自体は落とさない）。
- Instagram の `media_url` は短命 CDN URL だが、fetch 直後に投稿するため鮮度問題は起きない。

## 認証（x-oauth.ts）

- OAuth 1.0a（HMAC-SHA1）。`X_API_KEY`/`X_API_KEY_SECRET`（App）と `X_BOT_ACCESS_TOKEN`/`X_BOT_ACCESS_TOKEN_SECRET`（投稿先アカウント）。
- multipart/form-data の POST ではフォームフィールドを署名ベース文字列に含めない（クエリパラメータのみ署名）。
- 認証情報が未設定なら警告して exit 0（Slack 通知と同じ挙動でワークフローを落とさない）。

## ファイル構成

| ファイル | 役割 |
|----------|------|
| `scripts/post-instagram-to-x.ts` | メイン。diff → 古い順に X 投稿 |
| `scripts/lib/twitter-text-weight.ts` | 文字数 weight 計算 |
| `scripts/lib/x-oauth.ts` | OAuth 1.0a 署名ヘッダ生成 |
| `scripts/lib/x-media-upload.ts` | 画像/動画の chunked upload |

## 運用

```bash
# dry-run（認証情報不要、本文・メディア判定の確認）
npm run instagram:post-x -- <previous-posts.json> --dry-run

# 実投稿
npm run instagram:post-x -- <previous-posts.json>
```

## 関連
- 認証情報の取得手順: `knowledge/04-operations/x-secrets-setup.md`
- 実装プラン: `knowledge/plans/instagram-to-x-crosspost.md`
- 参考実装（OAuth署名）: `~/proj/chrome/kanColleWidget/scripts/post-tweet.ts`
- 踏襲元（diff構造）: `scripts/notify-slack-instagram.ts`
