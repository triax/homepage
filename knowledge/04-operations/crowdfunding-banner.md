# クラウドファンディングバナー運用ガイド

## 概要

トップページ右下に固定表示するクラウドファンディング（スポチュニティ）告知カードの運用手順。
設定は JSON ファイル 1 つで管理し、HTML・JavaScript の編集は不要。

## ファイル構成

```
docs/assets/crowdfunding/
├── index.json              # 設定（url / title / description / thumbnail / endsAt）
├── crowdfunding-banner.js  # index.json を fetch してカードを生成するスクリプト
└── thumbnail.jpg           # カードのサムネイル画像（スポチュニティのOGP画像を縮小）
```

`docs/index.html` 末尾の `<script src="./assets/crowdfunding/crowdfunding-banner.js" defer>` で読み込まれ、
スクリプトが `./assets/crowdfunding/index.json` を取得して描画する。

## 設定（`index.json`）

```json
{
  "url": "https://www.spportunity.com/tokyo/team/1063/invest/810/detail",
  "title": "クラウドファンディング挑戦中",
  "description": "調布をアメフトで盛り上げる、ファン参加型イベントを実現！",
  "thumbnail": "assets/crowdfunding/thumbnail.jpg",
  "endsAt": null
}
```

| キー          | 説明                                                 |
| ------------- | ---------------------------------------------------- |
| `url`         | カードのリンク先。新しいタブで開く                   |
| `title`       | 太字の見出し（1行）                                  |
| `description` | 補足文（1行。長い場合は末尾が `…` で省略される）     |
| `thumbnail`   | サムネイル画像のパス（`docs/` からの相対パス）       |
| `endsAt`      | 表示終了日（`"YYYY-MM-DD"`、JST）。`null` なら無期限 |

JSON なので末尾カンマやコメントは書けない。編集後は `jq . docs/assets/crowdfunding/index.json` などで構文を確認する。

## よくある作業

### 計測用リンクへ差し替える

スポチュニティから計測用リンクを受領したら `index.json` の `url` を書き換える。

```json
"url": "https://www.spportunity.com/...?utm_source=...",
```

ローカルで表示確認後にコミット・プッシュする。URL は他の箇所には書かれていない。

### 終了日を設定する

募集終了日を `endsAt` に入れておくと、当日 23:59:59（JST）を過ぎた時点で自動的に表示されなくなる。

```json
"endsAt": "2026-10-31",
```

終了後に削除作業をしなくて済むため、募集期間が確定したら早めに設定しておく。

### サムネイルを差し替える

1. 新しい画像を `docs/assets/crowdfunding/thumbnail.jpg` に上書き（正方形に近い構図が望ましい。表示は 64x64px の `object-cover`）
2. 大きい場合は最適化する
   ```bash
   ./scripts/optimize-images.sh --target=docs/assets/crowdfunding --dry-run
   ```
3. ブラウザキャッシュが残る場合はファイル名を変えて `index.json` の `thumbnail` も更新する

### 一時的に非表示にする

いずれかの方法で止める。

- **推奨**: `endsAt` に過去の日付を入れる（例: `"2000-01-01"`）。他の設定を残したまま止められる
- `docs/index.html` の `<script src="./assets/crowdfunding/crowdfunding-banner.js" defer>` をコメントアウトする

再開するときは元に戻すだけ。

## 表示の仕組み

### 表示タイミング

- `DOMContentLoaded` 後に `index.json` を取得し、`endsAt` を過ぎていなければ 1.5 秒（`SHOW_DELAY`、JS 内の定数）待ってから下からスライドインする
- `prefers-reduced-motion` が有効な環境ではアニメーションなしで表示
- `index.json` の取得や解析に失敗した場合はコンソールにエラーを出して何も表示しない

### セッション内の非表示（閉じるボタン）

- 「×」を押すと `sessionStorage` に `triax_hideCrowdfundingBanner = 'true'` が保存され、カードが消える
- **同じタブを開いている間**は、リロードやページ内遷移をしても再表示されない
- タブを閉じて開き直す、または別タブで開くと再表示される（`localStorage` ではないため永続しない）
- 動作確認で再表示したいときは、DevTools の Application → Session Storage から該当キーを削除する

### 表示されない場合のチェック

1. `endsAt` が過去日になっていないか
2. `index.json` が正しい JSON か（コンソールに `Failed to load crowdfunding config` が出ていないか）
3. `sessionStorage` に非表示フラグが残っていないか（新しいタブで開き直す）
4. `docs/index.html` に script タグがあるか

## 関連ドキュメント

- `/knowledge/06-decisions/007-remove-recruit-banner-add-crowdfunding.md` - 導入の経緯（募集フローティングとの入れ替え）
- `/knowledge/plans/2026-08-30-homepage-remake-phase1.md` - 実行計画
