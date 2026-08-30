# ADR-008: ヒーロー背景動画・プロモ動画の配信方式とセクション順序

## ステータス
承認済み

## コンテキスト
2026-08-30 のホームページ改善方針会議（第1回）で、納品されたプロモ動画（48秒・横版/縦版）をトップページに組み込む方針と、あわせてページ構成の見直しが決まった。

- ファーストビューが静止画（`assets/headers/TOP.jpg`）のみで、チームの雰囲気が伝わりにくい
- 訪問者の最大の関心事は「次の試合はいつ・どこで」だが、SCHEDULE は NEWS・MEMBERS の下にあった
- 選手モーダルで、カードの外側をタップしても閉じない不具合があった（内側ラッパーがクリックを受け `e.target === modal` が成立しない）。アクションボタン（×／−／♥）も本文をスクロールしないと見えなかった
- 配信先は GitHub Pages（静的ファイルのみ・サーバー処理なし）

## 決定

### 1. ヒーロー背景にショート動画を敷く
- 元動画の **27秒〜末尾**（約21秒、白ロゴカードで終わる区間）を無音・自動再生・ループで背景に流す
- **モバイル（縦画面）= `hero-portrait.mp4`（720x1280）、PC（横画面）= `hero-landscape.mp4`（1280x720）** の振り分けは HTML 側の `<source media="(orientation: portrait)">` で行う（JS での判定はしない）
- `<video>` は `muted loop playsinline preload="none"` で、`autoplay` と `poster` は付けない。`index.js` の `setupHeroVideo` は (a) `prefers-reduced-motion: reduce` または `navigator.connection.saveData` が有効なら `<video>` を取り除いて静止画のまま表示する、(b) それ以外は `window` の `load` 後に `play()` する、の 2 つだけを担う
- フォールバックは背面の静止画 `TOP.jpg`。`playing` イベントでフェードインして切り替えを滑らかにする
- 各ファイル約4MB（CRF 28）。5MB を超えたら CRF を上げる

### 2. フル版プロモは Progressive MP4 で配信する
- `promo-full.mp4`: 1280x720 / CRF 26 / AAC 96k / `-movflags +faststart`、約13MB。縦画面用に縦版 `promo-full-portrait.mp4`（720x1280）も用意し、`<source media="(orientation: portrait)">` で切り替える
- MOVIE セクションにはポスター画像のサムネイルのみを置き、クリックで少し余白のあるモーダル（`#video-modal`、`p-4 sm:p-8`、背景 90% 黒）内の `<video controls preload="none">` で再生する（モバイル・PC 共通）。poster は開く時に向きに応じて切り替える。ユーザーが再生するまで一切ダウンロードしない
- 生成は `scripts/encode-promo-videos.sh` に一本化し、元動画はコミットしない

### 3. セクション順序を変更する
- **SCHEDULE をヒーロー直下**（NEWS の上）へ移動。ヒーローのボタンも「試合日程を見る」→ `#schedule` に変更
- **MOVIE セクションを ABOUT の直下**（MEMBERS → ABOUT → MOVIE → SPONSORS）に新設し、フル版プロモを配置
- ナビゲーション（PC・モバイル）の並びも `TOP → SCHEDULE → NEWS → MEMBERS → ABOUT → MOVIE → CONTACT` に追随

### 4. 選手モーダルの操作性を直す
- 背景クリックの判定を `!e.target.closest('#member-modal-card')` に変更し、カードの外側ならどこをタップしても閉じる
- モーダルを `flex-col` にして本文だけスクロールさせ、アクションボタン（×／−／♥）を**下部の固定フッター**に置く
- 閉じる処理を `closeMemberModal()` に集約する
- キーボード操作は**常設の `keydown` リスナー 1 本**にまとめる（モーダルが開いているときだけ動作。Esc で閉じる、← → で写真カルーセル送り）。モーダルを開くたびにリスナーを付け外ししない

### 5. 付随する実装整理
- `.fade-in` のスクロール連動アニメーションは `initFadeIn()` に集約し、`MutationObserver` で**後から挿入された要素**（スケジュールの試合カード、Instagram 投稿など）も自動で監視対象にする。ロスター取得を待たずに静的セクションのフェードインを開始できる

## 理由
- 動画は「チームの空気」を数秒で伝える最も強い素材であり、ファーストビューに置く価値が最も高い
- 縦・横で別ファイルを用意することで、モバイルで横動画を無理に拡大して被写体が切れる問題を避けられる
- reduced-motion / saveData を尊重することで、アクセシビリティと通信量の懸念に先回りできる
- 訪問者の主目的（試合情報）に最短で到達させるのが、集客サイトとして最も合理的
- 静的ホスティングでは Progressive MP4 + faststart が最も単純で、動画4本・約20MB の規模なら十分

## 代替案

### 代替案1: HLS（セグメント + m3u8）を GitHub Pages に静的配置
- 利点: 回線に応じた画質切り替え、シーク時の無駄なダウンロードが少ない
- 欠点: セグメント生成の手順が増える。Safari 以外は hls.js が必要。ファイル数が数百に膨らむ
- 不採用の理由: 動画1本・13MB・ユーザー操作起点の再生に対して過剰。必要になったら移行可能な形で `encode-promo-videos.sh` を残している

### 代替案2: YouTube 埋め込み
- 利点: 配信コストゼロ、画質・回線対応はすべて YouTube 任せ
- 欠点: iframe による外部ドメイン読み込み、関連動画・ロゴなどデザインの制御が効かない。ヒーロー背景の自動再生には使えない
- 不採用の理由: サイトの世界観の中で完結させたい。将来、視聴数を YouTube 側に集約したい場合は再検討

### 代替案3: ヒーローを静止画のまま、動画は MOVIE セクションのみ
- 利点: ヒーローの転送量ゼロ、実装が最小
- 欠点: ファーストビューの印象が変わらず、動画を作った効果が薄い
- 不採用の理由: 約4MB・無音・ループの背景動画は許容範囲であり、reduced-motion / saveData のフォールバックで懸念を潰せる

### 代替案4: セクション順序は変えず、ヒーローのボタンだけ `#schedule` に向ける
- 利点: 変更が少ない
- 欠点: スクロールで自然に到達する導線がなく、ボタンに気づかない人には届かない
- 不採用の理由: 「最も知りたい情報を最初に」というシンプルな原則を優先

## 結果

### 良い影響
- ファーストビューで動きのある映像が流れ、チームの雰囲気が伝わる
- 試合情報にスクロール1画面で到達できる
- 選手モーダルが直感的に閉じられ、アクションボタンが常に見える

### 悪い影響
- ページ読み込み完了後に約4MB の転送が発生する（ヒーロー動画。`preload="none"` のため初回描画は妨げない）
- `docs/assets/videos/` に約22MB のバイナリがリポジトリに入る

### リスク
- モバイル回線で再生がブロックされる → 背面の静止画にフォールバックするため表示が崩れない
- 動画の差し替え時にファイルサイズが膨らむ → `encode-promo-videos.sh` の実行後サマリーとサイズ目安（video-management.md）で確認

## 実装への影響
- 必要な作業: `docs/index.html`（ヒーロー `<video>` と `<source media>`、SCHEDULE/MOVIE 配置、ナビ、モーダル構造）、`docs/index.js`（`setupHeroVideo`、`closeMemberModal`、常設 `keydown` リスナー、`initFadeIn` の `MutationObserver`）、`docs/assets/videos/`（4ファイル）、`scripts/encode-promo-videos.sh`
- 影響を受けるコンポーネント: ヒーロー、SCHEDULE、NEWS（背景色を白に変更）、MEMBERS モーダル、ナビゲーション
- 移行計画: 不要（アンカー ID は変更していないため既存リンクはそのまま有効）

## 参考
- 会議: `~/proj/triax/projects/homepage-remake/1_Meeting/Minutes/20260830_1105_ホームページ改善方針_第1回.md`
- 実行計画: [2026-08-30-homepage-remake-phase1.md](../plans/2026-08-30-homepage-remake-phase1.md)
- 運用手順: [video-management.md](../04-operations/video-management.md)
- 関連: [ADR-007 募集フローティングの撤去とクラファンカード](./007-remove-recruit-banner-add-crowdfunding.md)

## 更新履歴
- 2026-08-30: 初版作成（ホームページ改善方針 第1回会議を受けて）(@otiai10)
