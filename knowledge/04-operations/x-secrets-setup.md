# X (Twitter) API 認証情報セットアップ手順

Instagram の最新投稿を X（旧Twitter）にも自動投稿する機能で使用する、X API の認証情報を取得・設定する手順。

## 前提・料金（2026年6月時点）

- **無料枠は新規開発者向けに廃止済み**（2026年2月6日〜）。新規は **従量課金（pay-per-use）一択**。
  - 料金: **投稿1件 $0.01** / 読取1件 $0.005。**月額固定費・最低額なし**、クレジット前払い制。
  - TRIAX の投稿頻度（週数回）なら **実コストは月 $0.2〜1 程度**。
- Basic ($200/月) / Pro への新規加入は不可。残る上位は Enterprise のみ。
- 画像・動画投稿（media upload, INIT/APPEND/FINALIZE のチャンクアップロード）は従量課金でも利用可能。

## 投稿に必要な4つの認証情報

OAuth 1.0a（HMAC-SHA1）で投稿するため、以下4つが必要。GitHub Secrets にも同名で登録する。

| 環境変数 | 説明 | 取得場所 |
|----------|------|----------|
| `X_API_KEY` | App の Consumer Key（API Key） | Keys and Tokens タブ |
| `X_API_KEY_SECRET` | App の Consumer Secret（API Key Secret） | Keys and Tokens タブ |
| `X_BOT_ACCESS_TOKEN` | 投稿先アカウント（TRIAX公式）の Access Token | Keys and Tokens タブ |
| `X_BOT_ACCESS_TOKEN_SECRET` | 同 Access Token Secret | Keys and Tokens タブ |

## 取得手順（TRIAX専用 App を新規作成）

### 1. Developer アカウント作成
1. **TRIAX公式Xアカウントでログインした状態**で [developer.x.com](https://developer.x.com) にアクセス
2. Developer アカウントを作成（プロフィール入力 → 承認、通常5〜10分）

### 2. Project / App 作成
1. ポータルで「Create Project」→ プロジェクト名・用途を入力
2. プロジェクト内で「Create App」→ App名を入力（例: `triax-homepage-poster`）
3. この時点で API Key / Secret が一度だけ表示される。**必ず控える**（再表示不可、紛失時は regenerate）

### 3. 権限を Read and Write に設定 ⚠️最重要
1. App settings → **User authentication settings** を開く
2. **App permissions を「Read and Write」に設定**（デフォルトは Read のみ）
3. Type of App: `Web App, Automated App or Bot`、Callback URL / Website URL は仮値でも可（投稿のみなら未使用）

### 4. Access Token & Secret を発行
1. **Keys and Tokens** タブ → 「Access Token and Secret」を **Generate**
2. ⚠️ **落とし穴**: 手順3で Read/Write に変更する**前**に発行したトークンは read-only のまま。
   権限変更後に必ず **Regenerate** すること。さもないと投稿時に `403 You are not permitted to perform this action` で失敗する。
3. 表示された Access Token / Access Token Secret を控える

### 5. 従量課金クレジットのチャージ ⚠️必須
- **[console.x.com](https://console.x.com)** の Billing でクレジットを**前払いチャージ**
- 投稿時に $0.01/件 が消費される
- ⚠️ Pay-Per-Use を有効化しただけ（チャージ無し）では `402 CreditsDepleted` で投稿できない。
  少額（数ドル＝数百件分）チャージすれば稼働する。

### 6. .env と GitHub Secrets に設定

ローカル検証用 `.env`:
```
X_API_KEY=...
X_API_KEY_SECRET=...
X_BOT_ACCESS_TOKEN=...
X_BOT_ACCESS_TOKEN_SECRET=...
```

GitHub Secrets（https://github.com/triax/homepage/settings/secrets/actions）に同名4件を登録。

## 動作確認

```bash
# dry-run（投稿せず本文・添付メディアのみ確認）
npm run instagram:post-x -- /tmp/prev_posts.json --dry-run

# 実投稿テスト（最新Instagram投稿1件をXへ）
npm run instagram:post-x -- /tmp/prev_posts.json
```

## トラブルシューティング

| 症状 | 原因・対処 |
|------|-----------|
| `403 oauth1-permissions` | 権限を Read/Write にした後にトークンを再発行していない（手順3→4） |
| `403 client-not-enrolled` | アプリが Pay-Per-Use 未登録、または Project に未紐付け。console.x.com で対応 |
| `402 CreditsDepleted` | クレジット未チャージ（手順5）。console.x.com の Billing でチャージ |
| `403 You are not permitted to perform this action` | 文字数が実際には超過。自前 weight 計算と X 実カウントのズレが原因で、`SAFETY_MARGIN`（実効上限260）で対応済み |
| `400 $.media is missing but it is required` | メディアアップロードが command方式multipartで送られている。画像はJSON+base64のシンプルアップロードで送る（実装済み） |
| `401 Unauthorized` | Consumer Key / Access Token の組み合わせ誤り、または署名生成ミス |
| メディア添付されない | Instagram の `media_url` が期限切れ（fetch直後に投稿しているか確認）、または動画（chunked方式は未検証で400の可能性） |

## 関連
- `.env.example` - 環境変数の一覧
- `knowledge/02-architecture/instagram-to-x-integration.md` - 連携アーキテクチャ
- 参考実装: `~/proj/chrome/kanColleWidget/scripts/post-tweet.ts`（OAuth 1.0a 署名生成）
