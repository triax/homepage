# Architecture Decision Records (ADR) - アーキテクチャ決定記録

## 📌 概要

プロジェクトにおける重要な技術的決定とその理由を記録し、将来の参照と理解を促進します。

## 📂 構成

- `template.md` - ADRテンプレート
- `001-static-site.md` - 静的サイト選定理由（作成予定）
- `002-tailwind-css.md` - Tailwind CSS採用理由（作成予定）
- `003-image-storage.md` - 画像ストレージ戦略（作成予定）
- `003-sponsor-section-layout.md` - スポンサーセクションのレイアウト設計
- `004-gallery-lightbox-device-strategy.md` - ギャラリーLightboxのデバイス戦略
- `005-image-optimization-strategy.md` - 画像最適化戦略
- `006-x-crosspost-watermark-guard.md` - Instagram→Xクロスポストのwatermarkガード
- `007-remove-recruit-banner-add-crowdfunding.md` - 「メンバー募集」フローティングの撤去とクラウドファンディングカードの追加
- `008-hero-video-and-section-order.md` - ヒーロー背景動画・プロモ動画の配信方式とセクション順序
- `009-members-from-hub.md` - メンバーデータを hub 公開 API からビルド時取得へ移行（roster-api 廃止）
- `010-member-photo-placeholder.md` - 写真未登録メンバーのプレースホルダーを TRIAX ロゴ透かし画像にする
- `011-pnpm-and-prettier.md` - パッケージマネージャを pnpm に一本化し、整形を Prettier + editorconfig-checker に委ねる
- `instagram-integration-decisions.md` - Instagram連携に関する決定事項

## 📝 ADRとは

Architecture Decision Record（ADR）は、アーキテクチャに関する重要な決定を文書化したものです。

### なぜADRが必要か

- 決定の背景と理由を保存
- 新メンバーへの知識共有
- 将来の見直し時の参考資料
- 同じ議論の繰り返しを防ぐ

## 🔍 使い方

1. 重要な技術的決定を行う際に作成
2. テンプレートを使用して記録
3. 連番を付けて管理
4. 定期的に見直し

## ✏️ ADR作成ルール

- タイトルは簡潔に
- 決定事項を明確に記述
- 代替案も記録
- 結果と影響を予測

## 📄 テンプレート例

```markdown
# {番号}-{タイトル}

## ステータス

提案中 | 承認済み | 非推奨 | 置き換え済み

## コンテキスト

この決定が必要になった背景と問題

## 決定

実際に決定した内容

## 代替案

検討した他の選択肢

## 結果

この決定による影響（良い点・悪い点）

## 更新履歴

- YYYY-MM-DD: 初版作成
```

## 🔗 関連リンク

- [プロジェクト概要](../00-project-overview/)
- [アーキテクチャ](../02-architecture/)
- [ADRについて](https://adr.github.io/)

## 📅 最終更新

- 日付: 2026-08-30
- 更新者: Claude
- 変更内容: ADR-007（募集フローティング撤去・クラファンカード追加）、ADR-008（ヒーロー動画・セクション順序）を追加、既存ADRの一覧を更新
