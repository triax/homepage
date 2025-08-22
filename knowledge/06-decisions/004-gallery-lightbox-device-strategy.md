# ADR-004: ギャラリーLightboxのデバイス戦略

## ステータス
承認済み

## コンテキスト
フォトギャラリーにLightbox機能（クリックで拡大表示）を実装する際、モバイルとPCで異なる体験を提供する必要があった。

## 検討した選択肢

### 選択肢1: 全デバイスでLightbox有効
- 利点: 一貫した体験
- 欠点: モバイルでは画面が小さく意味が薄い、タッチ操作と相性悪い

### 選択肢2: 画面サイズのみで判定
- 利点: シンプルな実装
- 欠点: タブレットの扱いが曖昧

### 選択肢3: UserAgentと画面サイズの複合判定
- 利点: より正確なデバイス判定
- 欠点: 実装がやや複雑

## 決定事項

**選択肢3（複合判定）を採用**

### 判定ロジック
```javascript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const isSmallScreen = window.innerWidth < 1024;
const isDesktop = !isMobile && !isSmallScreen;
```

### 動作仕様
- **PC（1024px以上 かつ 非モバイルUA）**: Lightbox有効
- **モバイル/タブレット**: Lightbox無効、ホバーエフェクトのみ

## 根拠

1. **UXの最適化**
   - モバイルでは画像が既に画面幅いっぱい
   - ピンチズームの方が自然

2. **パフォーマンス**
   - モバイルでの不要なJavaScript実行を削減
   - メモリ使用量の削減

3. **実装の柔軟性**
   - UserAgentのフォールバックとして画面サイズも確認
   - 将来的な調整が容易

## 結果

### 良い結果
- モバイルユーザーは軽快な閲覧体験
- PCユーザーはリッチな拡大表示機能
- コードの保守性が高い

### 懸念事項
- UserAgent判定の将来的な非推奨化
- 新しいデバイスタイプへの対応

## 学び
- デバイスごとに最適な体験は異なる
- 複数の判定方法を組み合わせることで堅牢性向上
- プログレッシブエンハンスメントの考え方が有効

## 参考
- [GALLERY.md](/knowledge/01-requirements/functional/pages/GALLERY.md)
- [gallery-management.md](/knowledge/04-operations/gallery-management.md)