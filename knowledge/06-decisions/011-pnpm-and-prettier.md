# ADR-011: パッケージマネージャを pnpm に一本化し、整形を Prettier + editorconfig-checker に委ねる

## ステータス

承認済み（2026-09-06）

## コンテキスト

Issue #26 / #27 で挙がった 2 つの問題は、根が同じところにある。

- パッケージマネージャが確定していない。ロックファイルは npm 由来だったが、CLAUDE.md や
  `scripts/*.ts` の usage には pnpm 前提の記述が混ざっていた。実際に pnpm を一度でも使うと
  `node_modules` のレイアウトが書き換わり、手作業での復旧が必要になった
- Claude Code のセッションでは `Bash(npm:*)` が拒否されるため、lint も build も人手に頼っていた
- 整形は `scripts/format-check.ts`（241 行）の自前実装で、Prettier / editorconfig-checker が
  提供する機能を再発明していた。検査対象の列挙、ignore の扱い、JSON の整形比較、
  ESLint 出力の文字列パースまで自前で持っていたため、Issue #23 のような不具合が生まれた
- ESLint は警告があっても終了コード 0 を返すが、`format-check.ts` は標準出力に `problems` が
  含まれるかで判定していたため、警告 14 件しかない状態でも lint 全体が失敗していた

## 決定

### 1. パッケージマネージャは pnpm に一本化する

- `package.json` に `packageManager` を宣言し、`pnpm-lock.yaml` を唯一のロックファイルにする
- `preinstall` に `only-allow` を仕込み、他のパッケージマネージャでの導入を弾く
- pnpm 固有の設定は `pnpm-workspace.yaml` に置く。旧 `.npmrc` の `min-release-age`（日）は
  `minimumReleaseAge`（分）へ移設し、`allowBuilds` で esbuild のビルドスクリプトを明示的に許可する
- CI は `pnpm/action-setup@v4` → `actions/setup-node`（`cache: 'pnpm'`）→ `--frozen-lockfile` の順

### 2. Node は 24 系に上げる

pnpm 11 は Node >= 22.13、editorconfig-checker 7 は Node >= 24.14 を要求する。
Node 20 は既にサポートが終わっているため、CI は Node 24 に統一する。

### 3. 整形は Prettier、Prettier が扱えない範囲は editorconfig-checker

- `format:check` / `format:fix` は Prettier に置き換え、`scripts/format-check.ts` は削除する
- Prettier は `.editorconfig` の indent 設定を読むので、`.prettierrc` は置かない。
  整形規則の正は `.editorconfig` ひとつに保つ
- editorconfig-checker は改行・末尾空白・最終行改行・文字コードだけを見る。
  インデント幅の検査は Prettier と二重管理になるため無効化する。
  無効化と除外は `.editorconfig-checker.json` に置き、コマンドラインに特例を持ち込まない
- editorconfig-checker の npm パッケージは実行時に Go バイナリを取得する。
  既定が `latest` で再現性がないため、`EC_VERSION` でバージョンを固定する
- `engines` で Node と pnpm の下限を宣言する。`allowBuilds` は pnpm 11 のキーで、
  古い pnpm では黙って無視されるため、バージョン不一致は導入時に弾く

### 4. 所有権の線引き

| 範囲                                            | 整形の所有者         |
| ----------------------------------------------- | -------------------- |
| `scripts/**/*.ts`, `eslint.config.mjs`          | ESLint               |
| JSON / YAML / Markdown / HTML / CSS / その他 JS | Prettier             |
| シェルスクリプトなど Prettier 非対応            | editorconfig-checker |
| ロックファイル・機械生成 JSON                   | 生成側（検査しない） |

ESLint はシングルクォート・100 文字などのスタイル規則を持っており、Prettier の既定と衝突する。
どちらか一方に寄せるまでは、TypeScript を Prettier の対象から外して二重管理を避ける。

### 5. 初回の一括整形は独立したコミットにする

`prettier --write .` の結果だけを 1 コミットにまとめ、その SHA を `.git-blame-ignore-revs` に
登録する。利用者は初回だけ次を実行する。

```bash
git config blame.ignoreRevsFile .git-blame-ignore-revs
```

## 理由

- 設定ファイルだけで挙動が決まるので、自前スクリプトの保守が要らなくなる
- Prettier 3 は `.gitignore` を既定で尊重するため、Issue #23 と同種の不具合が構造的に起きない
- Claude Code のセッション内で lint と build を完結できるようになる
- CI は pnpm の store cache が効き、導入が速くなる

## 代替案

| 案                                                  | 採否 | 理由                                                                    |
| --------------------------------------------------- | ---- | ----------------------------------------------------------------------- |
| `eslint-config-prettier` を入れて TS も Prettier に | 見送 | 依存が増え、13 ファイルに未測定の巨大な差分が出る。所有権の分離で足りる |
| `editorconfig-checker` 6 系に留めて Node 22 のまま  | 却下 | サポートの切れた Node を延命するだけ                                    |
| 生成 JSON を書き出し時に Prettier へ通す            | 却下 | 生成スクリプトに整形依存を持ち込む。検査対象から外すほうが単純          |
| `.prettierrc` に明示的な設定を書く                  | 見送 | `.editorconfig` と二重管理になる。差分が要るときに初めて置く            |

## 結果

### 良い影響

- lint が ESLint → Prettier → editorconfig-checker の直列になり、終了コードだけで判定できる
- Pull Request 用の `lint.yml` を追加したため、依存解決の破綻をマージ前に捕まえられる
- hook（`scripts/format.sh`）から編集直後のファイルを自動整形できる

### 悪い影響

- 初回の一括整形で 69 ファイルに差分が出る。blame は `.git-blame-ignore-revs` で回避する
- `docs/index.html` は 4 スペース、属性は 80 桁で折り返される形に変わる

### リスク

- 生成 JSON を検査対象から外したため、生成側の整形が崩れても lint では気づけない
- `knowledge/01-requirements/functional/pages/TOP.md` は元から文字化けしており、
  Prettier / editorconfig-checker の対象から除外した。復旧は別 Issue で扱う

## 関連ドキュメント

- Issue #26 / #27
- `AGENTS.md` の「ビルド・テスト・開発コマンド」節
- `knowledge/03-development/README.md`

## 更新履歴

- 2026-09-06: 初版
