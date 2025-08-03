# SEO_OGP_SPEC.md

本書は、Club TRIAX ホームページにおけるSEO（検索エンジン最適化）およびOGP（Open Graph Protocol）の仕様を定義する。

---

## 🔍 SEO基本方針

### メタタグ構成

#### 基本メタタグ
```html
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="Club TRIAX（クラブ トライアックス）は東京を拠点に活動する社会人アメリカンフットボールチーム。選手募集中。試合情報、メンバー紹介、活動内容をご覧いただけます。">
<meta name="keywords" content="TRIAX,トライアックス,アメリカンフットボール,アメフト,社会人,東京,Xリーグ,選手募集">
<meta name="author" content="Club TRIAX">
```

#### ページ別タイトル戦略
- **トップページ**: `Club TRIAX | 東京の社会人アメリカンフットボールチーム`
- **メンバー紹介**: `メンバー紹介 | Club TRIAX`
- **スケジュール**: `試合スケジュール・結果 | Club TRIAX`
- **フォトギャラリー**: `フォトギャラリー | Club TRIAX`
- **ニュース**: `最新ニュース | Club TRIAX`
- **チーム紹介**: `チーム紹介・歴史 | Club TRIAX`
- **お問い合わせ**: `お問い合わせ | Club TRIAX`

### URL構造
- 日本語URLは避け、英語表記を使用
- 階層は浅く保つ（最大2階層）
- 例：
  - `/` - トップページ
  - `/members/` - メンバー一覧
  - `/schedule/` - スケジュール
  - `/gallery/` - ギャラリー
  - `/news/` - ニュース一覧
  - `/about/` - チーム紹介
  - `/contact/` - お問い合わせ

### 構造化データ（JSON-LD）
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SportsTeam",
  "name": "Club TRIAX",
  "sport": "American Football",
  "address": {
    "@type": "PostalAddress",
    "addressRegion": "東京都"
  },
  "url": "https://triax.jp",
  "logo": "https://triax.jp/images/logo.png",
  "sameAs": [
    "https://www.instagram.com/club_triax/",
    "https://twitter.com/club_triax"
  ]
}
</script>
```

---

## 📱 OGP（Open Graph Protocol）仕様

### 基本OGPタグ
```html
<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://triax.jp/">
<meta property="og:title" content="Club TRIAX | 東京の社会人アメリカンフットボールチーム">
<meta property="og:description" content="Club TRIAXは東京を拠点に活動する社会人アメリカンフットボールチーム。選手募集中。">
<meta property="og:image" content="https://triax.jp/images/og-image.jpg">
<meta property="og:locale" content="ja_JP">
<meta property="og:site_name" content="Club TRIAX">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://triax.jp/">
<meta property="twitter:title" content="Club TRIAX | 東京の社会人アメリカンフットボールチーム">
<meta property="twitter:description" content="Club TRIAXは東京を拠点に活動する社会人アメリカンフットボールチーム。選手募集中。">
<meta property="twitter:image" content="https://triax.jp/images/og-image.jpg">
```

### OG画像仕様
- **推奨サイズ**: 1200×630px
- **フォーマット**: JPG（圧縮率80%程度）
- **ファイルサイズ**: 300KB以下
- **内容**: チームロゴ、キャッチコピー、選手写真を含む
- **ページ別画像**: 
  - トップページ用
  - メンバー紹介用（チーム集合写真）
  - 試合結果用（試合風景）
  - ニュース用（デフォルト画像）

---

## 🎯 SEO施策チェックリスト

### 技術的SEO
- [ ] robots.txtの設置
- [ ] sitemap.xmlの生成・設置
- [ ] canonical URLの設定
- [ ] 404ページのカスタマイズ
- [ ] ページ読み込み速度の最適化（3秒以内）
- [ ] モバイルフレンドリーテスト合格
- [ ] HTTPS化（SSL証明書）

### コンテンツSEO
- [ ] 各ページに固有のtitle/descriptionを設定
- [ ] h1タグは1ページに1つ
- [ ] 見出しタグ（h2-h6）の適切な階層構造
- [ ] 画像のalt属性を必ず記述
- [ ] 内部リンクの最適化
- [ ] パンくずリストの実装

### ローカルSEO
- [ ] Googleビジネスプロフィールへの登録
- [ ] 活動拠点（練習場所）の明記
- [ ] 地域名を含むコンテンツの作成

---

## 📊 パフォーマンス目標

### Core Web Vitals
- **LCP（Largest Contentful Paint）**: 2.5秒以内
- **FID（First Input Delay）**: 100ms以内
- **CLS（Cumulative Layout Shift）**: 0.1以内

### その他の指標
- **ページサイズ**: 2MB以内（画像圧縮後）
- **リクエスト数**: 50以内
- **Google PageSpeed Insights スコア**: モバイル80以上

---

## 🔄 更新とメンテナンス

### 定期更新項目
- 試合結果の即日更新
- ニュース記事の月2回以上投稿
- メンバー情報の年度更新
- OG画像の季節ごとの更新

### SEO監視項目
- Google Search Consoleでのエラーチェック（週1回）
- 検索順位の定期確認（月1回）
- ページ速度の定期測定（月1回）

---

以上