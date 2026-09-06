# Repository Guidelines

## プロジェクト構造 / Project Structure & Module Organization

- `docs/` は GitHub Pages に配置される静的サイト本体です。`docs/index.html` `index.css` `index.js` でレイアウトと振る舞いを更新し、画像やロゴは機能ごとに `docs/assets/` 配下へ整理してください。
- `scripts/` にはロスター同期・Instagram 連携・画像クリーニングを自動化する TypeScript とシェルのユーティリティがあります。拡張する際はファイル冒頭のコメントと出力フォーマットを踏襲してください。
- `knowledge/` には運用手順とアーキテクチャノートが蓄積されています。特にギャラリーやロスターの更新前に `04-operations/` のプレイブックを確認すると事故を防げます。
- ルートの `package.json` `eslint.config.mjs` `tsconfig.json` がツールチェーンの基準値です。依存追加やターゲット変更時は三点セットで整合性を保ってください。

## ビルド・テスト・開発コマンド / Build, Test, and Development Commands

- `pnpm install` で tsx・ESLint・Playwright など開発依存を取得します。パッケージマネージャは pnpm に固定されており、他のツールでのインストールは `preinstall` で弾かれます。
- `pnpm dev` でローカルプレビュー環境（http://localhost:3000）を起動できます。別ポートが必要な場合は `pnpm exec http-server -p <port> -c-1` を使ってください。
- `HUB_API_KEY=<key> pnpm build:members` は hub の公開 API からメンバーデータと写真を取得し、`docs/assets/roster.json` と `docs/assets/members/` を生成します。どちらもビルド生成物で git 管理外です。取得に失敗した場合は生成物を書き換えずに終了コード 1 で失敗します。
- `pnpm instagram:fetch` と `pnpm instagram:refresh-token` は Instagram フィードを管理します。トークン更新は 24 時間以内に繰り返さないよう注意します。
- `pnpm lint` は ESLint と整形確認を一括実行します。修正は `pnpm lint:fix` や `pnpm format:fix` で適用してください。

## コーディング規約 / Coding Style & Naming Conventions

- TypeScript は `scripts/**/*.ts` に配置し、ファイル名は `build-members.ts` のように kebab-case を使用します。シェルスクリプトも同じ規則です。
- ESLint 設定で 2 スペースインデント・シングルクォート・セミコロン必須・最大 100 文字/行が求められます。意図的に未使用の変数は `_example` のようにアンダースコア接頭で警告を回避します。
- 整形は Prettier が担当します。`pnpm format:fix` で JSON/YAML/Markdown/HTML/CSS/JS を一括整形し、Prettier が扱わないファイル（シェルスクリプト等）の改行・末尾空白は `pnpm lint:editorconfig` が `.editorconfig` に基づいて検査します。
- このプロジェクトの公用語は日本語です。コミットメッセージ、PR 説明、ドキュメントは原則として日本語で統一し、必要に応じて英語訳を補ってください。

## テスト方針 / Testing Guidelines

- UI オートメーションは Playwright を想定しています。初回は `pnpm exec playwright install` でブラウザバイナリを導入してください。
- PR 前には最低限 `pnpm lint` と該当する画像・ロスターコマンドを実行し、動的セクション（Instagram フィードやロスターカード）を変更した場合は簡易 Playwright チェックを追加するのが理想です。

## コミットと PR / Commit & Pull Request Guidelines

- コミットメッセージは「Roster同期ワークフローを改善」「Instagram投稿データを更新」のように対象と目的を一行で記述します。データ更新単位でまとめ、雑多な差分は極力スクワッシュしてください。
- 自動生成データやスクリプト変更は分けてコミットし、レビュアーが影響範囲を追いやすくします。
- PR には影響ディレクトリ、関連する Club TRIAX の Issue、UI 変更時の before/after スクリーンショットを添付してください。

## セキュリティと設定 / Security & Configuration Tips

- API 認証情報は `.env` に保存し、`.env.example` を更新して必須キーを明示します。実値は決してコミットしないでください。
- Instagram の長期トークンを更新する際は既存トークンの発行日時を確認し、不要なリクエストでレート制限を招かないようにします。
- `docs/assets/sponsors/` やギャラリーへ追加する画像は提供元を確認し、命名規則（ティア別フォルダやファイル名）に揃えてレビューを通過させてください。
