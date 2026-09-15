# MEMBER_API.md

メンバー情報の取得と表示に関するAPI仕様を定義する。

データの正は [hub](https://hub.triax.football/) にあり、メンバー本人が
`https://hub.triax.football/members/{slack_id}` でプロフィール・写真を編集する。
ホームページは**ビルド時**に hub の公開APIを取得し、正規化した `docs/assets/roster.json` と
リサイズ済み写真を生成する。ブラウザは生成物だけを読む。

- 運用手順: [hub-members-sync.md](/knowledge/04-operations/hub-members-sync.md)
- 決定経緯: [009-members-from-hub.md](/knowledge/06-decisions/009-members-from-hub.md)
- デプロイ要否の判定（digest）: [012-deploy-only-on-change.md](/knowledge/06-decisions/012-deploy-only-on-change.md)

---

## 1. 取得元: hub 公開 API

```
GET https://hub.triax.football/api/1/public/members
X-API-Key: <HUB_API_KEY>
```

- **`X-API-Key` ヘッダ必須**。未指定・不正キーは `401`
- `Cache-Control: private`、CORSヘッダなし → **ブラウザから直接叩けない。ビルド時取得のみ**
- キーは GitHub Actions secret `HUB_API_KEY` に置く（hub 側 `PUBLIC_API_KEYS` の `homepage:` エントリと同値）

### レスポンス

```json
{
  "generated_at": "2026-09-01T11:47:11.839607653Z",
  "path": "/api/1/public/members",
  "digest": "sha256:387068e42720c5b64fdcb2957a508c06036fde874019764628ba19ae60168374",
  "members": [
    {
      "slack_id": "U06T6DDL0F6",
      "name": "Yasunao Okazaki",
      "number": 99,
      "updated_at": "2026-08-20T10:00:00Z",
      "hp_profile": {
        "display_name": "岡崎恭直",
        "display_name_kana": "おかざきやすなお",
        "first_name": "Yasunao",
        "family_name": "Okazaki",
        "height": 177,
        "weight": 88,
        "position": "Staff",
        "hometown": "埼玉県飯能市",
        "school": "東京大学",
        "bio": "HCとして選手が輝くfootballを実現していきます",
        "role": "",
        "enthusiasm": "",
        "watchme": "",
        "hobbies": "",
        "favorite": "",
        "what_i_like_about_triax": "",
        "custom_fields": null,
        "portrait_formal_url": "https://storage.googleapis.com/triax-football/hp/photos/.../formal-...jpg",
        "portrait_casual_url": "https://storage.googleapis.com/triax-football/hp/photos/.../casual-...jpg",
        "additional_photo_urls": null,
        "hide_from_hp": false,
        "hidden_fields": null
      }
    }
  ]
}
```

- `digest` は `members` 配列の中身だけから計算した公開ペイロードのダイジェスト（triax/hub#704）。
  `path` / `generated_at` は含まない。公開内容が同じなら何度取得しても同じ値になる

### digest エンドポイント

```
GET https://hub.triax.football/api/1/public/members/digest
X-API-Key: <HUB_API_KEY>
```

```json
{
  "digest": "sha256:387068e42720c5b64fdcb2957a508c06036fde874019764628ba19ae60168374",
  "count": 60,
  "generated_at": "2026-09-15T00:00:00Z"
}
```

- 認証・キャッシュは `/members` と同じ（`X-API-Key` 必須・未指定や不正キーは `401`、`Cache-Control: private`、CORSヘッダなし）
- `digest` は同じ時点の `/members` 直下の `digest` と一致する。homepage はこれを公開中の `roster.json` の `hub_digest` と文字列比較し、違うときだけデプロイする（`scripts/check-deploy.ts`）
- `count` は掲載メンバー数（ログ・目視用）。`generated_at` はリクエストのたびに変わるので判定には使わない
- 変わる: 名前（Slack 同期）・背番号・退団・非掲載化・掲載項目の編集・写真の差し替え・`custom_fields` / 追加写真の並べ替え
- 非公開項目だけの編集や、何も変えずに保存し直した場合も変わる（`updated_at` が計算対象に含まれるため）

### 実装上の注意（実測ベース）

| 項目                                      | 内容                                                                                                                                                  |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `updated_at`                              | 一度も保存されていないプロフィールでは**キーごと省略される**（hub 側 omitzero）。欠落を許容すること                                                   |
| `position`                                | hub 側で正規化済み。`QB RB WR TE OL DL LB DB K P Staff Coach` または**空文字**。空文字は入力済みメンバーにも残るため、homepage 側の除外条件として使う |
| 未入力メンバー                            | hub 側で除外済み。homepage 側でも防御的にフィルタする                                                                                                 |
| `hide_from_hp` / `hidden_fields`          | hub 側の `PublicView()` が非掲載メンバーを除外し、非掲載フィールドを空値化する。homepage 側は「空なら表示しない」で足りる                             |
| `custom_fields` / `additional_photo_urls` | 未設定時は `[]` ではなく `null` が返る                                                                                                                |
| `height` / `weight`                       | 未入力時は `0` が返る                                                                                                                                 |
| `display_name`                            | 空のことがある。その場合は top-level の `name`（Slack の表示名）を使う                                                                                |
| 写真                                      | `https://storage.googleapis.com/triax-football/hp/photos/{slack_id}/{formal                                                                           | casual | additional}-{ms}.{ext}`。公開バケット・リサイズなし・最大10MB・`.jpg`と`.png` が混在 |

---

## 2. 生成物: `docs/assets/roster.json`（v2）

`scripts/build-members.ts` が上記を正規化して書き出す。ブラウザ（`docs/index.js`）が読むのはこれだけ。

```json
{
  "version": "2.0",
  "generated_at": "2026-09-01T11:47:11.839607653Z",
  "hub_digest": "sha256:387068e42720c5b64fdcb2957a508c06036fde874019764628ba19ae60168374",
  "source": "https://hub.triax.football/api/1/public/members",
  "members": [
    {
      "id": "U06T6DDL0F6",
      "updated_at": null,
      "name": {
        "default": "岡崎恭直",
        "kana": "おかざきやすなお",
        "alphabet": "Yasunao Okazaki"
      },
      "number": 99,
      "position": "Staff",
      "role": "",
      "photos": {
        "formal": "assets/members/U06T6DDL0F6-formal.jpg",
        "casual": ["assets/members/U06T6DDL0F6-casual.jpg"]
      },
      "height": 177,
      "weight": 88,
      "hometown": "埼玉県飯能市",
      "school": "東京大学",
      "bio": "HCとして選手が輝くfootballを実現していきます",
      "enthusiasm": "",
      "watchme": "",
      "hobbies": "",
      "favorite": "",
      "what_i_like_about_triax": "",
      "custom_fields": []
    }
  ]
}
```

### フィールド定義

| フィールド                                                                              | 型               | 説明                                                              |
| --------------------------------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------- |
| `version`                                                                               | string           | スキーマバージョン。現行 `"2.0"`                                  |
| `generated_at`                                                                          | string           | hub のレスポンスの `generated_at`（RFC3339）                      |
| `hub_digest`                                                                            | string           | hub のレスポンス直下の `digest`。デプロイ要否の判定に使う         |
| `source`                                                                                | string           | 取得元URL                                                         |
| `members[].id`                                                                          | string           | Slack ID（写真ファイル名の接頭辞にも使う）                        |
| `members[].updated_at`                                                                  | string \| null   | hub 側のプロフィール更新日時。未保存なら `null`                   |
| `members[].name.default`                                                                | string           | 表示名。hub の `display_name`、空なら Slack の `name`             |
| `members[].name.kana`                                                                   | string           | ふりがな                                                          |
| `members[].name.alphabet`                                                               | string           | `first_name` + `family_name`                                      |
| `members[].number`                                                                      | number \| null   | 背番号                                                            |
| `members[].position`                                                                    | string           | ポジション（`QB`…`P` / `Staff` / `Coach`）                        |
| `members[].role`                                                                        | string           | 役職                                                              |
| `members[].photos.formal`                                                               | string           | 正面写真の相対パス。未登録なら空文字                              |
| `members[].photos.casual`                                                               | string[]         | カジュアル写真 + 追加写真の相対パス                               |
| `members[].height` / `weight`                                                           | number \| null   | 身長(cm) / 体重(kg)。未入力は `null`                              |
| `members[].hometown` / `school` / `bio`                                                 | string           | 出身地 / 出身校 / ひとこと                                        |
| `members[].enthusiasm` / `watchme` / `hobbies` / `favorite` / `what_i_like_about_triax` | string           | 意気込み / 注目ポイント / 趣味 / 最近の推し / TRIAXの好きなところ |
| `members[].custom_fields`                                                               | `{key, value}[]` | 自由項目。未設定なら `[]`                                         |

### 掲載条件

`position` が空でなく、`hide_from_hp` が false のメンバーのみを含める。

---

## 3. 生成物: `docs/assets/members/`

| 種別           | ファイル名                                       |
| -------------- | ------------------------------------------------ |
| 正面写真       | `{slack_id}-formal.jpg`                          |
| カジュアル写真 | `{slack_id}-casual.jpg`                          |
| 追加写真       | `{slack_id}-additional-{n}.jpg`（n は 1 始まり） |

- すべて **長辺 800px 以下・品質 85 の JPEG** に正規化（PNG の透過は白背景に落とす）
- 退団者の写真が残らないよう、ビルドのたびにディレクトリごと作り直す

---

## 4. 生成物: `docs/assets/build-info.json`

`.github/workflows/deploy-pages.yml` の「Write build info」ステップが、`build:members` の後に書き出す（git 管理外）。
ブラウザの表示には使わず、次回の `check` ジョブが公開中のサイトから読む。

```json
{
  "commit": "37fcee41a085ff1db821053db0aa164ae72968c4",
  "built_at": "2026-09-15T00:01:54Z"
}
```

| フィールド | 型     | 説明                                     |
| ---------- | ------ | ---------------------------------------- |
| `commit`   | string | ビルドしたコミットの SHA（`github.sha`） |
| `built_at` | string | ビルドした日時（UTC、RFC3339）           |

公開中の値の読み方と判定ルールは [hub-members-sync.md](/knowledge/04-operations/hub-members-sync.md) の「反映タイミング」を参照。

---

## 5. 表示側（`docs/index.js`）

| 関数                                 | 役割                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `fetchRoster()`                      | `assets/roster.json` を取得する                                                                      |
| `collectMemberPhotos(member)`        | `formal` → `casual[]` の順に写真を並べる。正面写真が無ければカジュアル写真が先頭＝カードの表面になる |
| `createMemberCard(member)`           | 一覧のカード。2枚目以降の写真があれば flip 対応にする                                                |
| `showMemberDetail(member)`           | 詳細モーダル。写真カルーセルと定義リストを描画する                                                   |
| `memberDetailRow(label, value)`      | 定義リスト1行。**値が空の項目は行ごと出さない**                                                      |
| `displayMembers()`                   | ポジションフィルタ適用（比較は `toUpperCase()` で大文字小文字非依存）                                |
| `displayRandomMemberPickup(members)` | ヒーロー下のランダムピックアップ                                                                     |

ポジションフィルタのボタンは `QB RB WR TE OL DL LB DB K P`。`Staff` / `Coach` は `ALL` のときのみ表示される。

写真が1枚も無いメンバーは "No Image" プレースホルダ（`NO_IMAGE_PLACEHOLDER`）を表示する。
