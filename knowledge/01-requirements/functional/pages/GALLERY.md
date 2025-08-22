# フォトギャラリー仕様書

## 概要
トップページ下部に写真ギャラリーセクションを表示。PC環境ではLightbox機能で拡大表示可能。

## ディレクトリ構造
```
docs/assets/gallery/
├── 01.jpg
├── 02.jpg
├── 03.jpg
├── 04.jpg
└── 05.jpg
```

## 画像仕様

### ファイル命名規則
- 形式: `%02d.jpg`（01.jpg, 02.jpg, ...）
- 連番で管理
- 拡張子は小文字統一

### 画像最適化基準
- **最大幅**: 1920px（HD解像度）
- **品質**: 85%（視覚的劣化なし）
- **形式**: プログレッシブJPEG
- **メタデータ**: 削除（EXIF情報等）
- **目標サイズ**: 300-600KB/画像

## 表示仕様

### レイアウト
- **グリッド構成**: 
  - モバイル: 1カラム
  - タブレット: 2カラム（sm:grid-cols-2）
  - デスクトップ: 3カラム（lg:grid-cols-3）
- **画像の高さ**: `h-64`（16rem）固定
- **表示方法**: `object-cover`（アスペクト比維持）

### 特殊レイアウト
- 最後の画像が5番目の場合: `lg:col-span-2`（2カラム分の幅）

### インタラクション
- **ホバー効果**: 
  - 画像を110%拡大
  - 半透明黒オーバーレイ（30%）
- **トランジション**: 300ms

## Lightbox機能（PCのみ）

### 有効条件
以下のすべてを満たさない場合に有効：
1. モバイルUserAgent（iPhone/iPad/Android）でない
2. 画面幅1024px以上

### 機能
- クリックで拡大表示
- 左右矢印で画像切り替え
- キーボード操作（←→、Esc）
- 背景クリックで閉じる

## HTML実装テンプレート

```html
<!-- Photo Gallery Section -->
<section id="photo-gallery" class="py-4 bg-gray-50">
    <div class="container mx-auto px-4">
        <!-- Gallery Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
            <!-- 画像アイテム（通常） -->
            <div class="gallery-item group relative overflow-hidden shadow-lg">
                <img src="./assets/gallery/XX.jpg" 
                     alt="Club TRIAX Photo XX" 
                     class="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110">
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300"></div>
            </div>
            
            <!-- 最後の画像（幅広版）※必要に応じて -->
            <div class="gallery-item group relative overflow-hidden shadow-lg lg:col-span-2">
                <!-- 同じ構造 -->
            </div>
        </div>
    </div>
    
    <!-- Lightbox Modal (PC only) -->
    <div id="lightbox" class="fixed inset-0 bg-black bg-opacity-90 z-50 hidden items-center justify-center p-4">
        <button id="close-lightbox" class="absolute top-4 right-4 text-white text-4xl hover:text-gray-300">&times;</button>
        <button id="prev-image" class="absolute left-4 text-white text-4xl hover:text-gray-300">&#8249;</button>
        <button id="next-image" class="absolute right-4 text-white text-4xl hover:text-gray-300">&#8250;</button>
        <img id="lightbox-image" src="" alt="" class="max-w-full max-h-full object-contain">
    </div>
</section>
```

## JavaScript実装
`docs/index.js`の`initGallery()`関数で制御。
デバイス判定とLightbox機能を実装済み。

## 関連ファイル
- `/docs/index.html` - ギャラリーセクション
- `/docs/index.js` - Lightbox機能
- `/docs/assets/gallery/` - 画像ファイル
- `/scripts/optimize-gallery.sh` - 最適化スクリプト（後述）