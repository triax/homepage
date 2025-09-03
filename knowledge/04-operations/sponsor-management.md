# スポンサー管理ガイド

## 概要
Club TRIAXのスポンサー企業情報の管理と表示に関するガイドライン。

## スポンサー情報

### 現在のスポンサー一覧

#### Silver Tier
- **研精会グループ**
  - 正式名称: 医療法人研精会
  - ローマ字表記: kenseikai
  - ロゴ: `assets/sponsors/silver/kenseikai.jpg`
  - URL: https://www.kenseikai-group.or.jp/

#### Bronze Tier
- **DINER ANDRA**
  - ロゴ: `assets/sponsors/bronze/andra.jpg`
  - URL: https://www.instagram.com/diner_andra/

- **Insurance Total Service**
  - ロゴ: `assets/sponsors/bronze/insurancetotalservice.png`
  - URL: https://insurance.co.jp

- **Own Studio**
  - ロゴ: `assets/sponsors/bronze/ownstudio.png`
  - URL: https://369suits.com

- **Digital Love**
  - ロゴ: `assets/sponsors/bronze/digitallove.png`
  - URL: https://digitallove.jp/

## データ構造

### index.json
スポンサー情報は `docs/assets/sponsors/index.json` で管理されています：

```json
{
  "gold": [],
  "silver": [
    {
      "logo": "assets/sponsors/silver/kenseikai.jpg",
      "link": "https://www.kenseikai-group.or.jp/"
    }
  ],
  "bronze": [
    // Bronze tierのスポンサー
  ]
}
```

### 表示の仕組み
1. `sponsor-loader.js` が `index.json` を読み込み
2. 各Tierごとに動的にHTML要素を生成
3. リンクがある場合は `<a>` タグで画像をラップ

### ディレクトリ構造の変更（2025年1月）
以前は `docs/assets/sponsors/1/`, `2/`, `3/` という数字でTierを表現していましたが、
より直感的な命名として `gold/`, `silver/`, `bronze/` に変更されました。

## スポンサー追加・更新手順

### 新規スポンサー追加
1. ロゴ画像を適切なTierディレクトリに配置
   - Gold: `docs/assets/sponsors/gold/`
   - Silver: `docs/assets/sponsors/silver/`
   - Bronze: `docs/assets/sponsors/bronze/`

2. `index.json` にスポンサー情報を追加
   ```json
   {
     "logo": "assets/sponsors/{tier}/{filename}",
     "link": "https://example.com/"  // オプション
   }
   ```

3. 画像最適化（必要に応じて）
   ```bash
   ./scripts/optimize-images.sh --target=docs/assets/sponsors
   ```

### スポンサー情報更新
1. `index.json` の該当エントリを編集
2. リンクURLやロゴファイル名を更新

## 注意事項

### 命名規則
- ファイル名: 企業名の英語表記を使用（例: `kenseikai.jpg`）
- 日本語の正式名称はこのドキュメントに記録

### 画像仕様
- 推奨サイズ: 600px幅
- 形式: JPG, PNG
- 背景: 透過PNGが望ましい（ロゴの場合）

## 関連ドキュメント
- `/knowledge/01-requirements/functional/pages/SPONSORS.md` - スポンサーセクション仕様
- `/knowledge/06-decisions/003-sponsor-section-layout.md` - レイアウト設計決定