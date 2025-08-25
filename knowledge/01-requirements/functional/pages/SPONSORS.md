# スポンサーセクション仕様書

## 概要
トップページにスポンサー企業を表示するセクションを実装する。スポンサーは3つのTier（階層）に分けて表示し、各Tierごとに表示サイズと配置を差別化する。

## 実装状況
- ✅ 実装完了（2025年1月）
- HTMLにセクション追加済み
- スポンサー画像配置済み

## ディレクトリ構造
```
docs/assets/sponsors/
├── 1/              # Tier 1スポンサー
│   └── refinverse.png
├── 2/              # Tier 2スポンサー
│   └── pineal.png
├── 3/              # Tier 3スポンサー
│   ├── bridgepoint.png
│   ├── insurancetotalservice.png
│   └── ownstudio.png
└── index.json      # スポンサー情報（URLなど）
```

## 表示仕様

### Tier別表示ルール

#### Tier 1（最上位スポンサー）
- **表示数**: 1段に1社
- **サイズ**: 最大（max-w-md相当）
- **配置**: 中央配置
- **用途**: プラチナスポンサーなど最重要パートナー

#### Tier 2（中位スポンサー）
- **表示数**: 1段に最大2社
- **サイズ**: 中（w-5/12, max-w-sm）
- **配置**: 中央寄せ、横並び
- **用途**: ゴールドスポンサーなど

#### Tier 3（一般スポンサー）
- **表示数**: 1段に最大3社
- **サイズ**: 小（w-1/4, max-w-[200px]）
- **配置**: 中央寄せ、横並び
- **用途**: シルバースポンサーなど

### レスポンシブ対応
- モバイル: 全Tier縦並び（w-full）
- PC: 上記の仕様通り

## HTML実装

```html
<!-- SPONSOR Section -->
<section id="sponsors" class="py-20 bg-white">
    <div class="container max-w-4xl text-center">
        <h2 class="text-4xl font-bold mb-16 fade-in">SPONSORS</h2>
        <div class="space-y-12 fade-in">

            <!-- Tier 1: 1段1社 -->
            <div class="flex justify-center mx-auto">
                <div class="sponsor-t1 w-full p-8">
                    <a href="https://r-inverse.com/">
                        <img src="./assets/sponsors/1/refinverse.png" class="w-full h-auto" />
                    </a>
                </div>
            </div>

            <!-- Tier 2: 1段最大2社 -->
            <div class="flex flex-wrap justify-center mx-auto gap-6">
                <div class="sponsor-t2 w-5/12 max-w-sm p-2">
                    <a href="https://pineal.co.jp/">
                        <img src="./assets/sponsors/2/pineal.png" class="w-full h-auto" />
                    </a>
                </div>
            </div>

            <!-- Tier 3: 1段最大3社 -->
            <div class="flex flex-wrap justify-center items-center mx-auto gap-4">
                <div class="sponsor-t3 w-1/4 max-w-[200px] p-2">
                    <a href="https://369suits.com">
                        <img src="./assets/sponsors/3/ownstudio.png" class="w-full h-auto" />
                    </a>
                </div>
                <!-- 他のTier 3スポンサー -->
            </div>
        </div>
    </div>
</section>
```

## スポンサー情報管理

### index.json形式
```json
{
    "1": [
        {
            "name": "REFINVERSE",
            "logo": "assets/sponsors/1/refinverse.png",
            "url": "https://r-inverse.com/"
        }
    ],
    "2": [
        {
            "name": "PINEAL",
            "logo": "assets/sponsors/2/pineal.png",
            "url": "https://pineal.co.jp/"
        }
    ],
    "3": [
        {
            "name": "BRIDGE POINT",
            "logo": "assets/sponsors/3/bridgepoint.png",
            "url": "https://bridge-point.co.jp/"
        },
        {
            "name": "Insurance Total Service",
            "logo": "assets/sponsors/3/insurancetotalservice.png",
            "url": "https://insurance.co.jp/"
        },
        {
            "name": "Own Studio",
            "logo": "assets/sponsors/3/ownstudio.png",
            "url": "https://369suits.com/"
        }
    ]
}
```

## 技術的な実装詳細

### Flexboxレイアウトの採用理由
- **柔軟性**: 要素数が変動しても中央配置を維持
- **レスポンシブ**: `flex-wrap`で自動的な折り返し
- **間隔管理**: `gap`属性で一貫した間隔制御

### サイズ階層の実現
- 各Tierに`max-w-*`を設定することで、要素数に関わらず適切なサイズを維持
- Tier 1 > Tier 2 > Tier 3のビジュアルヒエラルキーを確立

### カスタムクラス
- `sponsor-t1`, `sponsor-t2`, `sponsor-t3`: 各Tierの識別とスタイリング用

## 今後の拡張性

### 動的読み込み（将来的な実装）
現在は静的HTMLだが、将来的にJavaScriptで`index.json`を読み込んで動的に生成することも可能。

### スポンサー追加時の作業
1. 適切なTierのディレクトリに画像を配置
2. HTMLに新しいスポンサーの要素を追加
3. （オプション）index.jsonを更新

## 関連ファイル
- `/docs/index.html` - メインHTML
- `/docs/assets/sponsors/` - スポンサー画像ディレクトリ
- `/docs/assets/sponsors/index.json` - スポンサー情報