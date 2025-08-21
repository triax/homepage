# Requirements - 要件定義

## 📌 概要
Club TRIAXホームページの機能要件、非機能要件、ユーザーストーリーを管理します。

## 📂 構成
- `functional/` - 機能要件
  - `pages/` - ページ別仕様
    - `TOP.md` - トップページ仕様
  - `api/` - API仕様
    - `MEMBER_API.md` - メンバーAPI仕様
- `non-functional/` - 非機能要件
  - `performance.md` - パフォーマンス要件（作成予定）
  - `security.md` - セキュリティ要件（作成予定）
  - `accessibility.md` - アクセシビリティ要件（作成予定）
- `user-stories/` - ユーザーストーリー（作成予定）
- `COMMON_SPEC.md` - 共通仕様
- `NAVIGATION_SPEC.md` - ナビゲーション仕様
- `SEO_OGP_SPEC.md` - SEO・OGP仕様
- `PROJECT_STATEMENT.md` - プロジェクトステートメント
- `image-proxy-solutions.md` - 画像プロキシソリューション

## 🔍 使い方
1. 新機能開発時は、まず該当する仕様書を確認
2. 仕様変更時は、関連するドキュメントを更新
3. レビュー時は仕様との整合性を確認

## ✏️ 更新ルール
- 仕様変更は必ずドキュメントに反映
- 重要な変更は `06-decisions/` にも記録
- ユーザーストーリーは定期的に見直し

## 🔗 関連リンク
- [プロジェクト概要](../00-project-overview/)
- [アーキテクチャ](../02-architecture/)
- [開発ガイド](../03-development/)

## 📅 最終更新
- 日付: 2025-01-21
- 更新者: Claude
- 変更内容: specsフォルダから移行