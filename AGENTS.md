# Repository Guidelines

## プロジェクト構造 / Project Structure & Module Organization
- `docs/` は GitHub Pages に配置される静的サイト本体です。`docs/index.html` `index.css` `index.js` でレイアウトと振る舞いを更新し、画像やロゴは機能ごとに `docs/assets/` 配下へ整理してください。
- `scripts/` にはロスター同期・Instagram 連携・画像クリーニングを自動化する TypeScript とシェルのユーティリティがあります。拡張する際はファイル冒頭のコメントと出力フォーマットを踏襲してください。
- `knowledge/` には運用手順とアーキテクチャノートが蓄積されています。特にギャラリーやロスターの更新前に `04-operations/` のプレイブックを確認すると事故を防げます。
- ルートの `package.json` `eslint.config.mjs` `tsconfig.json` がツールチェーンの基準値です。依存追加やターゲット変更時は三点セットで整合性を保ってください。

## ビルド・テスト・開発コマンド / Build, Test, and Development Commands
- `npm install` で tsx・ESLint・Playwright など開発依存を取得します。
- `npx http-server docs -p 3000` でローカルプレビュー環境を起動できます。別ポートが必要な場合は `-p` を調整してください。
- `npm run roster:download` は Roster API からメンバーデータを再取得します。公開前の差分確認に必須です。
- `npm run img:check` `img:download` `img:cleanup` `img:sync` は画像同期ワークフローです。まず `img:check` を実行し、削除対象を確認してから `img:cleanup` を走らせてください。
- `npm run instagram:fetch` と `npm run instagram:refresh-token` は Instagram フィードを管理します。トークン更新は 24 時間以内に繰り返さないよう注意します。
- `npm run lint` は ESLint と整形確認を一括実行します。修正は `npm run lint:fix` や `npm run format:fix` で適用してください。

## コーディング規約 / Coding Style & Naming Conventions
- TypeScript は `scripts/**/*.ts` に配置し、ファイル名は `download-roster.ts` のように kebab-case を使用します。シェルスクリプトも同じ規則です。
- ESLint 設定で 2 スペースインデント・シングルクォート・セミコロン必須・最大 100 文字/行が求められます。意図的に未使用の変数は `_example` のようにアンダースコア接頭で警告を回避します。
- `docs/` 内の HTML/CSS を編集後は `npm run format` で末尾スペースを削除し、Pages デプロイ前の差分をクリーンに保ってください。
- このプロジェクトの公用語は日本語です。コミットメッセージ、PR 説明、ドキュメントは原則として日本語で統一し、必要に応じて英語訳を補ってください。

## テスト方針 / Testing Guidelines
- UI オートメーションは Playwright を想定しています。初回は `npx playwright install` でブラウザバイナリを導入してください。
- PR 前には最低限 `npm run lint` と該当する画像・ロスターコマンドを実行し、動的セクション（Instagram フィードやロスターカード）を変更した場合は簡易 Playwright チェックを追加するのが理想です。

## コミットと PR / Commit & Pull Request Guidelines
- コミットメッセージは「Roster同期ワークフローを改善」「Instagram投稿データを更新」のように対象と目的を一行で記述します。データ更新単位でまとめ、雑多な差分は極力スクワッシュしてください。
- 自動生成データやスクリプト変更は分けてコミットし、レビュアーが影響範囲を追いやすくします。
- PR には影響ディレクトリ、関連する Club TRIAX の Issue、UI 変更時の before/after スクリーンショットを添付してください。

## セキュリティと設定 / Security & Configuration Tips
- API 認証情報は `.env` に保存し、`.env.example` を更新して必須キーを明示します。実値は決してコミットしないでください。
- Instagram の長期トークンを更新する際は既存トークンの発行日時を確認し、不要なリクエストでレート制限を招かないようにします。
- `docs/assets/sponsors/` やギャラリーへ追加する画像は提供元を確認し、命名規則（ティア別フォルダやファイル名）に揃えてレビューを通過させてください。
