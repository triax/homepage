# ADR-009: メンバーデータを hub 公開 API からビルド時取得へ移行（roster-api 廃止）

## ステータス
承認済み

## コンテキスト
2026-08-30 のホームページ改善方針会議（第1回）の ToDo #8「選手・スタッフ情報の更新」/ #9「選手写真の追加登録」を受けた対応。

- メンバーデータの正は `triax/roster-api`（Google Form 回答由来の `data/roster.json`）だった。`docs/assets/roster.json` の `updated_at` は 2025-09-30 で、63 名分が 2026 シーズンでも掲載され続けていた
- 更新経路は roster-api → `repository_dispatch` → `sync-roster.yml` → `download-roster.ts` / `download-all-images.ts` → `docs/assets/roster.json` と `docs/assets/members/`（147 ファイル・59MB）をコミット、という運営主導のバッチだった。**メンバー本人が更新する手段が無い**
- 一方 hub には既にメンバー自己編集 UI（`https://hub.triax.football/members/{slack_id}`）と公開 API `GET /api/1/public/members` が本番稼働していた（triax/hub#560）
- GitHub Pages は `build_type: legacy`（main の `/docs` を直接公開）で、ビルドステップを挟めなかった
- 公開 API にアクセス制御が無かった（triax/hub#645 でキー認証を導入）

関連 Issue: homepage#16 / homepage#17 / hub#643 / hub#645

## 決定

### 1. メンバーデータの正を hub に移す（roster-api は廃止）
- ビルド時に hub の公開 API を取得する `scripts/build-members.ts` を新設し、`docs/assets/roster.json`（v2）と `docs/assets/members/*.jpg` を生成する
- **即時完全切替**とし、roster-api 経路との併存・ハイブリッドはしない
- roster 独自項目（役職・意気込み・注目ポイント・趣味・推し・TRIAX の好きなところ）は hub 側に固定フィールドを追加して引き継いだ（hub#643）
- `sync-roster.yml` / `download-roster.ts` / `download-all-images.ts` / `check-image-sync.ts` / `cleanup-unused-images.ts` と、Google Drive ID から画像パスを解決する `docs/index.js` のロジック（`extractGoogleDriveId` / `handleImageError` / `convertGoogleDriveUrl` / `getExtensionFromMimeType` / `loadImageMapping`）は削除した

### 2. 生成物はコミットしない
- `docs/assets/roster.json` と `docs/assets/members/` を `.gitignore` に入れ、コミット済みの実体（147 ファイル・59MB）を削除した
- データの鮮度がコミット操作から独立し、リポジトリの肥大化も止まる

### 3. GitHub Pages を Actions ビルド配信へ切り替える
- `.github/workflows/deploy-pages.yml`（`upload-pages-artifact` + `deploy-pages`）を追加し、Settings > Pages > Source を **GitHub Actions** に変更する（管理者操作）
- **`GITHUB_TOKEN` による push は他のワークフローを起動しない**ため、12 時間ごとに `docs/assets/instagram/posts.json` をコミットする `fetch-instagram-posts.yml` の push では `push` トリガーが発火しない。legacy 配信では Pages 側の自動ビルド（`event: dynamic`）がこれを拾っていたので、切替にあたり `workflow_run`（Update Instagram Feed 完了時）トリガーを足して同じ効果を得る。加えて毎日 03:00 JST の `schedule` を保険に置く

### 4. 取得失敗時は fail-fast にする
- `HUB_API_KEY` 未設定・非 200（401 含む）・到達不能・掲載対象 0 名のいずれでも、生成物を一切書き換えずに終了コード 1 で失敗する
- 書き出し順序も「取得 → 検証 → 全写真の取得と変換 → 写真の書き出し → **最後に roster.json**」とし、途中で失敗しても既存の生成物を壊さない
- 空のメンバー一覧で本番を上書きする事故を、実装レベルで起こせなくすることを優先した

### 5. 写真は JPEG に正規化する
- hub の写真はリサイズなし・最大 10MB で、`.jpg` と `.png` が混在する。長辺 800px・品質 85 の JPEG に正規化し、PNG の透過は白背景に落とす（既存の `optimize-images.sh` と同等の仕様）
- 変換は **ImageMagick（`magick` / `convert`）へのシェルアウト**で行い、npm 依存は増やさない。`optimize-images.sh` が既に ImageMagick を前提にしており、リポジトリとして道具が増えない。`sharp` も候補だったが、ネイティブ依存と `package-lock.json` の更新を伴うため見送った
- ファイル名は `{slack_id}-formal.jpg` / `{slack_id}-casual.jpg` / `{slack_id}-additional-{n}.jpg`。拡張子を固定することで、旧実装の「拡張子総当たり」を再発させない

### 6. API キーは Actions secret 1 箇所に置く
- `X-API-Key` ヘッダに `HUB_API_KEY` を載せる。キーは GitHub Actions secret `HUB_API_KEY` にのみ置き、リポジトリ・生成物・ログには出さない
- ローテーションは hub 側で新旧併記 → homepage の secret 更新 → hub 側で旧削除、の順で無停止に行う

## 検討したが採用しなかった案

- **ブラウザから hub API を直接叩く**: 公開 API は `Cache-Control: private` かつ CORS ヘッダを返さない。キーをフロントに置くことにもなるため不可
- **roster-api と hub の併存（ハイブリッド）**: どちらが正か曖昧になり、二重管理のコストが残る。移行の途中状態を長引かせないため即時切替を選んだ
- **`sync-roster.yml` の取得先だけ hub に差し替える**: 生成物のコミットが残り、リポジトリ肥大化とメンバー本人の更新が即反映されない問題が解決しない
- **写真の元拡張子を維持する**: 透過は保てるが、`roster.json` がパスを持つ以上メリットが薄く、拡張子の分岐を残すことになる
- **`fetch-instagram-posts.yml` の末尾から `gh workflow run` でデプロイを起動する**: `actions: write` 権限が要る。デプロイ側の `workflow_run` トリガーで完結する方が権限が小さい

## 影響

- **メンバー**: 自分の掲載内容・写真を hub から自分で管理できる（写真 2 枚目＝ToDo #9 も casual / additional で満たせる）
- **運営**: 年次のメンバー更新作業と roster-api の保守が不要になる
- **移行時の注意**: 切替時点で hub の入力済みメンバーは 24 名中 20 名（`position` 入力あり）、写真は 5 枚のみ。**merge・Pages 設定切替の前にメンバーへの入力依頼が必要**。また Settings > Pages を Actions に切り替える前に merge すると、`docs/assets/roster.json` がブランチから消えて本番の MEMBERS が壊れるため、切替と merge の順序に注意する
- **ビルド時間**: 毎ビルドで全写真を再取得・再変換する。掲載枚数が増えたらキャッシュを検討する（`build-members.ts` に `stellar:debt(perf)` タグあり）

## 関連ドキュメント
- `knowledge/04-operations/hub-members-sync.md` - 運用手順
- `knowledge/01-requirements/functional/api/MEMBER_API.md` - API 仕様
