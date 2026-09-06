# プロモ動画管理ガイド

## 概要

ホームページで使用するプロモ動画（ヒーロー背景・フル尺プロモ）の生成と管理手順です。
納品された元動画から、統合エンコードスクリプトでWeb配信用のMP4とポスター画像を生成します。

## 元動画（ソース）

| ファイル              | 内容                                      | 備考                                             |
| --------------------- | ----------------------------------------- | ------------------------------------------------ |
| `nohin0814.mp4`       | 横 1920x1080 / 24fps / 48.06秒 / h264+aac | リポジトリ直下に配置（`SRC_LANDSCAPE` で変更可） |
| `nohin0814_tate+.mp4` | 縦 1080x1920 / 同尺・同内容               | リポジトリ直下に配置（`SRC_PORTRAIT` で変更可）  |

- 元動画（約68MB×2）は **Gitにコミットしない**。リポジトリ直下の `*.mp4` / `*.mov` は `.gitignore` で除外済み
- 元動画は編集せず、常にスクリプトから再生成する

## 生成物（`docs/assets/videos/`）

| ファイル                         | 用途                                     | サイズ                  | エンコード設定                         |
| -------------------------------- | ---------------------------------------- | ----------------------- | -------------------------------------- |
| `hero-landscape.mp4`             | ヒーロー背景（PC/横）                    | 1280x720, 約21秒, 無音  | libx264 slow / CRF 28 / high / yuv420p |
| `hero-portrait.mp4`              | ヒーロー背景（スマホ/縦）                | 720x1280, 約21秒, 無音  | 同上                                   |
| `promo-full.mp4`                 | フル尺プロモ（横画面のモーダル再生用）   | 1280x720, 48秒, AAC 96k | libx264 slow / CRF 26 / high / yuv420p |
| `promo-full-portrait.mp4`        | フル尺プロモ（縦画面のモーダル再生用）   | 720x1280, 48秒, AAC 96k | 同上                                   |
| `promo-full-poster.jpg`          | `promo-full.mp4` のポスター画像          | 1280x720                | JPEG q:v 3                             |
| `promo-full-portrait-poster.jpg` | `promo-full-portrait.mp4` のポスター画像 | 720x1280                | 同上（同じ `POSTER_TIME`）             |

すべてのMP4は `-movflags +faststart` で moov atom をファイル先頭に配置しています。

### ヒーロー動画の構成

元動画の **27.0秒 〜 末尾（48.06秒）** を単一区間として切り出しています（約21秒）。
切り出しは `-ss` を `-i` の**前**に置く入力側シーク（`HERO_START` までのデコードを省略）で行い、フィルタは `scale` のみです。
再エンコードするためフレーム精度で切り出されます。区間の結合やクロスフェードは行いません。

ブラウザ側では `<video preload="none" muted loop playsinline>` に `<source media="(orientation: portrait)">` で縦版、
既定で横版を指定し、`index.js` の `setupHeroVideo` がページ読み込み完了後に `play()` します（省データ・動きの抑制設定時は動画を外して静止画のまま）。

## エンコードスクリプト

### 使用方法

```bash
# すべて生成
./scripts/encode-promo-videos.sh

# ffmpegコマンドを表示するだけ（実行しない）
./scripts/encode-promo-videos.sh --dry-run

# 特定のターゲットのみ生成
./scripts/encode-promo-videos.sh --only=hero                  # エイリアス: hero-landscape + hero-portrait
./scripts/encode-promo-videos.sh --only=promo                 # エイリアス: promo-full + promo-full-portrait
./scripts/encode-promo-videos.sh --only=poster                # エイリアス: promo-full-poster + promo-full-portrait-poster
./scripts/encode-promo-videos.sh --only=promo-full-portrait   # 個別ターゲット名も指定可（TARGETS 参照）

# 元動画の場所を変える（環境変数で上書き）
SRC_LANDSCAPE=~/Downloads/yoko.mp4 SRC_PORTRAIT=~/Downloads/tate.mp4 ./scripts/encode-promo-videos.sh
```

- ffmpeg / ffprobe が必要（`brew install ffmpeg`）。パスは `FFMPEG` / `FFPROBE` 環境変数で上書きできます
- スクリプトはリポジトリルートに `cd` してから動くため、どこから実行しても構いません
- 元動画が見つからない場合はエラー終了します
- 実行後、各ファイルのサイズ・解像度・尺・faststart の状態を自動で表示します

### パラメータ

スクリプト冒頭の変数を編集して調整します。

| 変数                                       | 既定値                                                                                                       | 説明                                                                                                                                      |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `SRC_LANDSCAPE` / `SRC_PORTRAIT`           | `nohin0814.mp4` / `nohin0814_tate+.mp4`                                                                      | 元動画のパス。**環境変数で上書き可**                                                                                                      |
| `OUTPUT_DIR`                               | `docs/assets/videos`                                                                                         | 出力先                                                                                                                                    |
| `TARGETS`                                  | `(hero-landscape hero-portrait promo-full promo-full-portrait promo-full-poster promo-full-portrait-poster)` | 生成ターゲット。`--only` の候補・生成順・サマリー表示順を兼ねる。名前に `portrait` を含むものは縦元動画・縦サイズ、末尾 `-poster` は JPEG |
| `LANDSCAPE_SIZE` / `PORTRAIT_SIZE`         | 1280:720 / 720:1280                                                                                          | 出力サイズ（横版・縦版の動画とポスターに共通）                                                                                            |
| `HERO_START`                               | 27.0                                                                                                         | ヒーロー動画の切り出し開始（秒）。終了は末尾まで                                                                                          |
| `HERO_CRF`                                 | 28                                                                                                           | ヒーロー動画の品質（大きいほど小容量）                                                                                                    |
| `PROMO_CRF`                                | 26                                                                                                           | フル尺プロモ（横・縦）の品質                                                                                                              |
| `PROMO_AUDIO_BITRATE`                      | 96k                                                                                                          | フル尺プロモ（横・縦）の音声ビットレート                                                                                                  |
| `POSTER_TIME`                              | 43.0                                                                                                         | ポスター画像を切り出す位置（秒）。横・縦共通                                                                                              |
| `POSTER_QUALITY`                           | 3                                                                                                            | JPEG品質（`-q:v`、小さいほど高画質）                                                                                                      |
| `X264_PRESET` / `X264_PROFILE` / `PIX_FMT` | slow / high / yuv420p                                                                                        | 共通の libx264 設定                                                                                                                       |
| `X264_ARGS`                                | 配列                                                                                                         | 上記から組み立てる共通引数（`-c:v libx264 … -movflags +faststart`）。全MP4に適用                                                          |

ヒーロー2本は `encode_hero`、フル尺2本は `encode_promo_full`、ポスター2枚は `encode_poster` の各関数が担当します。
いずれも「元動画・出力サイズ・出力先」を引数に取り、横版と縦版で同じ関数を共用します
（`encode_target` がターゲット名に `portrait` を含むかで元動画とサイズを切り替える）。
`TARGETS` を順に回して `--only` に合致するものだけを生成します。

## 再生成の手順

1. 元動画2本をリポジトリ直下に配置する
2. 必要に応じてスクリプト冒頭のパラメータを変更する
3. `./scripts/encode-promo-videos.sh` を実行する
4. 出力サマリーでサイズと faststart を確認する
5. ローカルで表示確認し、`docs/assets/videos/` の変更をコミットする

## サイズの目安

| ファイル                                                   | 目安      | 備考                                   |
| ---------------------------------------------------------- | --------- | -------------------------------------- |
| `hero-landscape.mp4`                                       | 約4MB     | 5MBを超える場合は `HERO_CRF=30` を試す |
| `hero-portrait.mp4`                                        | 約4MB     | 同上                                   |
| `promo-full.mp4`                                           | 約13MB    | ユーザー操作で再生するため許容         |
| `promo-full-portrait.mp4`                                  | 約12.5MB  | 同上                                   |
| `promo-full-poster.jpg` / `promo-full-portrait-poster.jpg` | 200KB以下 |                                        |

## 配信方式の考え方

現状は **プログレッシブMP4 + faststart + `preload="none"`** で十分と判断しています。

- faststart により、ダウンロード完了を待たず再生を開始できる
- `preload="none"` により、ページ表示時に動画を読み込まない。フル尺はユーザーの再生操作時、ヒーロー動画は `window` の `load` 後に `play()` した時点で取得を開始する
- 動画は4本・合計約34MB（ヒーロー2本 約8MB + フル尺2本 約26MB）と小規模で、GitHub Pagesの静的配信で問題ない。フル尺は横・縦のどちらか一方しか読み込まれない

将来、動画本数や尺が増えて転送量・初回表示が問題になった場合の代替案：

- **HLS（アダプティブ配信）**: 回線状況に応じて画質を切り替えられるが、セグメント生成と再生ライブラリ（hls.js）が必要
- **YouTube埋め込み**: 配信コストがゼロになるが、デザインの自由度が下がり、外部ドメインの読み込みが発生する

## トラブルシューティング

### ffmpegがインストールされていない場合

```bash
brew install ffmpeg
```

### ヒーロー動画が5MBを超える場合

`HERO_CRF` を 30 に上げて再生成してください。画質とサイズのトレードオフです。

### 動画がすぐに再生されない場合

moov atom が先頭にあるか確認します（スクリプトの `verify_video` も同じ方法で判定しています）。

```bash
head -c 64 docs/assets/videos/hero-landscape.mp4 | LC_ALL=C grep -aq moov && echo OK || echo NG
# 先頭64バイト（ftyp 直後）に moov があれば正常
```

## 関連ドキュメント

- [画像最適化ガイド](./image-optimization.md)
- [OGP画像管理](./ogp-image-management.md)
