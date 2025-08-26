# OGPメタタグ仕様

## 概要

Open Graph Protocol (OGP) およびTwitter Cardメタタグの実装仕様。SNSでのシェア時に適切な情報とビジュアルを表示するための設定。

## 実装内容

### 基本メタタグ

```html
<title>Club TRIAX - LIFE・WORK・PLAY</title>
<meta name="description" content="X1リーグ所属 Club TRIAX のホームページです。Club TRIAX は「LIFE・WORK・PLAY」のチーム理念のもと、私生活と仕事とアメフトの相乗効果を通じて、一人一人の個性と充実を最大化することで「強いフットボールチーム」を目指しています。">
<meta name="keywords" content="TRIAX,アメリカンフットボール,アメフト,社会人チーム,東京,選手募集,両立,練習日,新人,スタッフ,歓迎">
```

### OGPタグ

```html
<meta property="og:title" content="Club TRIAX - LIFE・WORK・PLAY">
<meta property="og:description" content="X1リーグ所属 Club TRIAX のホームページです。Club TRIAX は「LIFE・WORK・PLAY」のチーム理念のもと、私生活と仕事とアメフトの相乗効果を通じて、一人一人の個性と充実を最大化することで「強いフットボールチーム」を目指しています。">
<meta property="og:image" content="https://www.triax.football/assets/ogp/default.jpg">
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.triax.football/">
<meta property="og:site_name" content="Club TRIAX">
<meta property="og:locale" content="ja_JP">
```

### Twitter Cardタグ

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Club TRIAX - LIFE・WORK・PLAY">
<meta name="twitter:description" content="X1リーグ所属 Club TRIAX のホームページです。Club TRIAX は「LIFE・WORK・PLAY」のチーム理念のもと、私生活と仕事とアメフトの相乗効果を通じて、一人一人の個性と充実を最大化することで「強いフットボールチーム」を目指しています。">
<meta name="twitter:image" content="https://www.triax.football/assets/ogp/default.jpg">
```

## OGP画像仕様

### 推奨サイズ
- **標準サイズ**: 1200 x 630px
- **アスペクト比**: 1.91:1
- **最小サイズ**: 600 x 315px
- **最大ファイルサイズ**: 5MB以下

### 現在の実装
- **実際のサイズ**: 1920 x 978px
- **アスペクト比**: 約1.96:1
- **ファイル形式**: JPEG
- **ファイルパス**: `/docs/assets/ogp/default.jpg`

### プラットフォーム別対応
- **Facebook/Meta**: 1200 x 630px（高解像度デバイス対応）
- **Twitter**: 1200 x 600px（summary_large_imageの場合）
- **LinkedIn**: 1200 x 627px

現在の1920x978pxの画像は推奨サイズより大きいが、各SNSプラットフォームが自動的にリサイズするため問題なし。

## デザインコンセプト

### ビジュアル要素
- スタジアムでチーム全員が円陣を組む写真
- TRIAXロゴをオーバーレイ
- チームの団結力と個人の集合体としてのチームを表現

### メッセージング
- チーム理念「LIFE・WORK・PLAY」を前面に
- 「個人の充実」を最重要視することを明記
- X1リーグ所属であることを明示
- 社会人チームとしての両立を強調

## URL構成

### 本番環境
- **ドメイン**: `https://www.triax.football/`
- **画像URL**: 絶対パスで指定（`https://www.triax.football/assets/ogp/default.jpg`）

### GitHub Pages環境（開発）
- **ドメイン**: `https://otiai10.github.io/triax-homepage/`
- 本番デプロイ時にURL変更が必要

## 実装上の注意点

1. **URLは絶対パスで指定**
   - 相対パスはSNSクローラーが正しく解釈できない場合がある
   - プロトコル（https://）を含む完全なURLを使用

2. **画像の事前配置**
   - OGP画像は公開前にアップロードしておく必要がある
   - SNSクローラーがアクセス可能な状態にする

3. **キャッシュの考慮**
   - SNSプラットフォームは一度取得したOGP情報をキャッシュする
   - 変更時はFacebook Sharing DebuggerやTwitter Card Validatorでキャッシュをクリア

4. **文字数制限**
   - og:title: 60文字程度まで
   - og:description: 110-120文字程度まで
   - 超過分は省略される可能性がある

## テストツール

### デバッグ・検証ツール
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

### 確認項目
- 画像が正しく表示されるか
- タイトル・説明文が適切に表示されるか
- URLが正しくリンクされるか
- 文字化けや省略が発生していないか

## 更新履歴

### 2025-01-25
- 初回実装
- チーム理念「LIFE・WORK・PLAY」を反映したメタタグに刷新
- OGP画像（default.jpg）を新規作成
- Twitter Cardタグを追加