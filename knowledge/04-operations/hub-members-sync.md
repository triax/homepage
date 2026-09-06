# メンバー情報の hub 連携（運用手順）

メンバーのプロフィールと写真は hub で本人が編集し、ホームページは GitHub Pages のビルド時に
hub の公開 API から取得する。運営による年次のデータ収集・画像同期作業は不要になった。

決定経緯は [009-members-from-hub.md](../06-decisions/009-members-from-hub.md) を参照。

## 全体像

```
メンバー本人
  └─ https://hub.triax.football/members/{slack_id} でプロフィール・写真を編集
       └─ hub: GET /api/1/public/members（X-API-Key 必須）
            └─ homepage: .github/workflows/deploy-pages.yml
                 └─ pnpm build:members（scripts/build-members.ts）
                      ├─ docs/assets/roster.json          … 正規化済みメンバーデータ（v2）
                      └─ docs/assets/members/*.jpg        … 長辺800pxのJPEG
                 └─ actions/upload-pages-artifact（path: docs）→ actions/deploy-pages
```

生成物は **どちらも git 管理外**（`.gitignore` 済み）。デプロイのたびに作り直す。

## 反映タイミング

`deploy-pages.yml` は次の 4 つで走る。いずれもビルド時に hub を取り直す。

| トリガー                                       | 内容                                                                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `push`（main）                                 | 通常のコード変更                                                                                                 |
| `workflow_run`（Update Instagram Feed 完了時） | Instagram 取得ワークフローの push は `GITHUB_TOKEN` 由来のため `push` イベントを発火しない。その取りこぼしを拾う |
| `schedule`（毎日 03:00 JST）                   | 上記が動かなかった場合の保険                                                                                     |
| `workflow_dispatch`                            | 手動での即時反映                                                                                                 |

メンバーが hub でプロフィールを直したあと、すぐ反映したいときは Actions から
「Deploy to GitHub Pages」を手動実行する。

## API キー

hub の公開 API は `X-API-Key` ヘッダが必須。`Cache-Control: private` かつ CORS ヘッダを返さない
ため、ブラウザから直接叩く運用はできない（**ビルド時取得のみ**）。

| 置き場所                              | 用途                                                          |
| ------------------------------------- | ------------------------------------------------------------- |
| GitHub Actions secret `HUB_API_KEY`   | 本番ビルド。`deploy-pages.yml` の build ステップに env で注入 |
| 手元の安全な場所（例: `~/.secrets/`） | ローカル検証用                                                |

キー値はリポジトリ・生成物・ログ・PR 本文に出さない。

### ローカルでの実行

写真のリサイズに **ImageMagick**（`magick` または `convert`）を使う。未インストールなら
`brew install imagemagick`（macOS）／`apt-get install imagemagick`（Debian系）を先に実行する。

```bash
HUB_API_KEY=$(cat ~/.secrets/triax-hub/hub-api-key.prod.txt) pnpm build:members
pnpm dev   # http://127.0.0.1:3000/docs/index.html
```

### ローテーション手順（無停止）

1. hub 側の `PUBLIC_API_KEYS` に新しい `homepage:` エントリを **追記**（新旧併記の状態にする）
2. homepage の Actions secret `HUB_API_KEY` を新しい値に更新
3. 「Deploy to GitHub Pages」を手動実行して成功を確認
4. hub 側から旧エントリを削除

## 生成物の仕様

`docs/assets/roster.json`（`version: "2.0"`）:

```json
{
  "version": "2.0",
  "generated_at": "<hub のレスポンスの generated_at>",
  "source": "https://hub.triax.football/api/1/public/members",
  "members": [
    {
      "id": "<slack_id>",
      "updated_at": "<RFC3339 | null>",
      "name": { "default": "", "kana": "", "alphabet": "" },
      "number": 0,
      "position": "QB",
      "role": "",
      "photos": {
        "formal": "assets/members/...jpg",
        "casual": ["assets/members/...jpg"]
      },
      "height": 0,
      "weight": 0,
      "hometown": "",
      "school": "",
      "bio": "",
      "enthusiasm": "",
      "watchme": "",
      "hobbies": "",
      "favorite": "",
      "what_i_like_about_triax": "",
      "custom_fields": [{ "key": "", "value": "" }]
    }
  ]
}
```

- 掲載対象は `position` が空でなく `hide_from_hp` が false のメンバーのみ（hub 側でも除外済みだが homepage 側でも防御的に判定する）
- `updated_at` は hub が一度も保存されていないプロフィールでキーごと省略するため `null` になりうる
- `height` / `weight` は未入力（hub は 0 を返す）を `null` に寄せる
- `custom_fields` / `additional_photo_urls` は hub が `null` を返すため `[]` に正規化する
- 写真は `{slack_id}-formal.jpg` / `{slack_id}-casual.jpg` / `{slack_id}-additional-{n}.jpg`。
  正面写真が未登録でもカジュアル写真があればカードの表面に使われる

## 写真未登録メンバーの表示

写真が 1 枚も登録されていないメンバーは、カード表面・詳細モーダル・ピックアップの 3 箇所とも
`docs/assets/member-placeholder.jpg`（TRIAX ロゴの透かし画像、git 管理）を表示する。画像の読み込みに
失敗したときも同じ画像に差し替わる。hub 側で写真を登録すれば次のデプロイで置き換わり、運営側の作業は不要。

デザインを変えるときは `scripts/generate-member-placeholder.sh` 先頭の `ADOPTED_*` を直して再生成する。

```bash
./scripts/generate-member-placeholder.sh --production   # docs/assets/member-placeholder.jpg を書き出す
```

決定経緯は [010-member-photo-placeholder.md](../06-decisions/010-member-photo-placeholder.md) を参照。

## 障害時の見方

ビルドは fail-fast で、失敗時は生成物を一切書き換えない（空のメンバー一覧で公開を上書きしないため）。

| ログ                                        | 原因                                   | 対処                                                                           |
| ------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------ |
| `環境変数 HUB_API_KEY が設定されていません` | secret 未登録、env 注入漏れ            | Actions secret と workflow の `env:` を確認                                    |
| `hub API が 401 を返しました`               | キーが不正・失効、hub 側で削除された   | ローテーション手順でキーを再設定                                               |
| `hub API に到達できませんでした`            | hub がダウン、ネットワーク断           | hub の稼働を確認して再実行                                                     |
| `掲載対象のメンバーが 0 名でした`           | hub 側の公開制御・データ不整合         | hub のデータを確認。復旧までサイトは前回のデプロイ内容のまま                   |
| `ImageMagick が見つかりません`              | 実行環境に `magick` / `convert` が無い | ローカルなら ImageMagick を入れる。CI は「Ensure ImageMagick」ステップが入れる |

いずれの場合もデプロイは失敗し、**公開中のサイトは直前の状態のまま**残る。
