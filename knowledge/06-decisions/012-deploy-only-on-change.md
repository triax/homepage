# ADR-012: 変化があったときだけデプロイし、hub の変化は 1 時間ごとに確認する

## ステータス

承認済み（2026-09-15）

## コンテキスト

ADR-009 で GitHub Pages を Actions 配信に切り替え、デプロイのたびに hub の公開 API から
メンバー情報と写真を取り直すようにした。その結果、`deploy-pages.yml` は次の状態になっていた。

- `workflow_run`（Update Instagram Feed 完了時・1 日 2 回）と `schedule`（毎日 03:00 JST）が、
  **何も変わっていなくても**毎回デプロイしていた。`fetch-instagram-posts.yml` は `posts.json` に
  差分が無ければコミットしないが、`workflow_run` は完了すれば発火する
- 1 回のデプロイのうち「Build members data from hub」（全写真のダウンロードと ImageMagick 変換）が
  約 2 分 15 秒かかる（2026-09-14 06:09 UTC の実行）。変化が無くても 1 日 3 回これが走っていた
- 一方で hub での編集は、次の定期デプロイ（最長で約 12 時間後）まで反映されない。
  急ぐときは手動で `workflow_dispatch` を実行していた（直近では 2026-09-03 と 2026-09-14）

2026-09-14 のセッションで、hub 側に「連携すべきデータに更新があったか」を返すエンドポイントを用意し、
homepage は更新があったときだけビルドする方針で合意した。hub 側は triax/hub#704（PR #705）で
`GET /api/1/public/members/digest` と `/members` 直下の `digest` を本番に出した。

関連 Issue: homepage#35 / triax/hub#704

## 決定

### 1. hub の変化は、hub が返す公開ペイロードの digest で検知する

- hub の `GET /api/1/public/members/digest`（`X-API-Key` 必須）が返す `digest` を使う
- `digest` は `members` 配列の中身だけから計算され、`path` / `generated_at` を含まない。
  公開内容が同じなら何度取得しても同じ値になる
- `build-members.ts` は `/members` 直下の同じ `digest` を `roster.json` の `hub_digest` に保存する。
  hub と homepage でハッシュの作り方を二重に実装しない

### 2. 「公開中のサイトがどの状態からビルドされたか」は公開中のサイト自身に持たせる

- デプロイ時に `docs/assets/build-info.json`（`{commit, built_at}`）を書き出す。
  hub の digest は `roster.json` の `hub_digest` にある。どちらも git 管理外
- `check` ジョブは `https://www.triax.football/assets/build-info.json` と `roster.json` を
  `?t=<epoch ms>` 付きで取得し（CDN の `max-age=600` を避ける）、今の `github.sha` と hub の digest を比べる
- 状態をリポジトリや Actions cache に置かないので、コミットが増えず、cache の消失にも左右されない。
  「公開されているもの」と「比較の基準」がずれることも起きない

### 3. トリガーごとの判定

| トリガー                                  | デプロイする条件                        |
| ----------------------------------------- | --------------------------------------- |
| `push`（main）                            | 常に                                    |
| `workflow_dispatch`（`force=true`、既定） | 常に（手動で強制反映する手段を残す）    |
| `workflow_run` / `schedule`               | コミットか hub の digest が公開中と違う |
| `workflow_dispatch`（`force=false`）      | 同上（判定をテストするための実行）      |

- 公開中の `build-info.json` / `roster.json` が読めない（初回・404・JSON でない）ときはデプロイする。
  公開中の値や hub の値が欠けている場合も「違う」とみなす（取りこぼすより余分に 1 回デプロイする）
- hub の digest が取れない（キー未設定・401・到達不能・`digest` が無い）ときは `check` ジョブを失敗させ、
  デプロイしない。公開中のサイトはそのまま残る（ADR-009 §4 の fail-fast と揃える）
- `check` と `deploy` の両ジョブで `actions/checkout` に `ref: ${{ github.sha }}` を指定し、
  判定したコミットとビルドするコミットを一致させる

### 4. 定期確認は 1 時間ごとにする

- `schedule` を `0 18 * * *`（毎日 03:00 JST）から `0 * * * *`（毎時）に変える
- 変化が無ければ `check` ジョブ（依存導入と API 2〜3 回の取得）だけで終わる。
  hub での編集は最長 1 時間ほどで反映され、手動デプロイは要らなくなる

### 5. 判定ロジックは純粋関数に切り出してテストする

- `scripts/lib/deploy-decision.ts` の `shouldDeploy` が判定だけを持ち、I/O は `scripts/check-deploy.ts` が持つ
- テストは `node:test` で `pnpm test` から実行し、`lint.yml` で Pull Request ごとに回す

## 理由

- digest は hub 側で公開ペイロードそのものから計算されるため、名前・背番号・退団・非掲載化など
  「プロフィールの `updated_at` に現れない変化」も漏れなく拾える
- 公開中のサイトを状態の置き場にすると、状態の書き込み・掃除・整合性の管理が要らない。
  デプロイが途中で失敗しても、公開中の値は「実際に公開されているもの」を指したままになる
- `push` と手動実行を無条件にしておけば、判定に不具合があっても人手で必ず反映できる

## 代替案

| 案                                                                    | 採否 | 理由                                                                                                                           |
| --------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| hub のメンバーの `max(updated_at)` を比べる                           | 却下 | Slack 同期による名前の変化・背番号・退団・非掲載化はプロフィールの `updated_at` を動かさず、取りこぼす                         |
| `/members` に ETag / `If-None-Match`（304）を実装してもらう           | 却下 | hub は `Cache-Control: private` の API で、条件付きリクエストの実装と検証が hub 側に増える。比較の基準も結局どこかに保存が要る |
| homepage 側で `/members` を取得してハッシュを計算する                 | 却下 | 判定のたびに全件の JSON を取得する。hub と homepage でハッシュ対象の定義が二重になり、ずれうる                                 |
| 最後にデプロイした digest / commit をリポジトリにコミットして保存する | 却下 | 判定のたびにコミットが増える。`GITHUB_TOKEN` の push の扱いや競合も絡み、公開中の状態とずれうる                                |
| `actions/cache` に最後の digest を保存する                            | 却下 | cache は 7 日で消え、ブランチ単位のスコープもある。消えたときの挙動が「公開されているもの」と無関係に決まる                    |

## 結果

### 良い影響

- 変化が無いときは写真の取得もデプロイも走らず、数十秒の確認だけで終わる
- hub での編集が最長 1 時間ほどで反映され、手動デプロイの手間が無くなる
- `workflow_run` は `posts.json` がコミットされて main が進んだ回だけデプロイする

### 悪い影響

- hub の digest は `hp_profile.updated_at` を含むため、非公開項目だけの編集や何も変えずに保存し直した
  場合も変わり、見た目の変化が無いデプロイが 1 回走る（取りこぼしは起きない）
- 公開中のファイルは CDN に `max-age=600` でキャッシュされる。クエリで回避しているが、
  デプロイ直後にエッジが古い値を返した場合は、同じ内容のデプロイが 1 回余分に走りうる
- hub の `/digest` への取得が 1 日あたり約 26 回（毎時 24 回 + `workflow_run` 2 回）に増える

### リスク

- 公開中のサイトの読み取りに失敗し続けると、毎時デプロイする（従来より頻度が上がる）。
  `check` ジョブのログの `公開中のビルド情報を読めませんでした` で気づける
- GitHub の `schedule` は混雑時に遅延・間引きされることがある。反映が遅いときは手動実行する

## 関連ドキュメント

- `knowledge/04-operations/hub-members-sync.md` - 反映タイミングと障害時の見方
- `knowledge/01-requirements/functional/api/MEMBER_API.md` - `digest` / `hub_digest` / `build-info.json` の仕様
- `knowledge/06-decisions/009-members-from-hub.md` - hub 連携の決定（本 ADR で §3 のトリガー条件を変更）

## 更新履歴

- 2026-09-15: 初版
