#!/bin/bash

# プロモ動画エンコードスクリプト
# 納品された元動画（リポジトリ直下・非コミット）から、Web配信用のMP4とポスター画像を
# docs/assets/videos/ に生成します。
#
# 使用法:
#   ./scripts/encode-promo-videos.sh [--dry-run] [--only=<name>]
#
# 生成物:
#   hero-landscape.mp4              ヒーロー用ショート版（横 1280x720, 無音）
#   hero-portrait.mp4               ヒーロー用ショート版（縦 720x1280, 無音）
#   promo-full.mp4                  フル尺プロモ（横 1280x720, 音声あり）
#   promo-full-portrait.mp4         フル尺プロモ（縦 720x1280, 音声あり）
#   promo-full-poster.jpg           promo-full.mp4 のポスター画像（1280x720）
#   promo-full-portrait-poster.jpg  promo-full-portrait.mp4 のポスター画像（720x1280）

set -euo pipefail

# ==============================================================================
# 設定（必要に応じてここを編集）
# ==============================================================================

# ffmpeg / ffprobe のパス（環境変数で上書き可）
FFMPEG="${FFMPEG:-ffmpeg}"
FFPROBE="${FFPROBE:-ffprobe}"

# 元動画（リポジトリ直下。Gitには含めない。環境変数で上書き可）
SRC_LANDSCAPE="${SRC_LANDSCAPE:-nohin0814.mp4}"        # 横 1920x1080
SRC_PORTRAIT="${SRC_PORTRAIT:-nohin0814_tate+.mp4}"    # 縦 1080x1920

# 出力先ディレクトリ
OUTPUT_DIR="docs/assets/videos"

# 生成ターゲット（--only の候補・生成順・サマリー表示順）
# 名前に portrait を含むものは縦元動画・縦サイズ、末尾 -poster は JPEG 出力
TARGETS=(
    hero-landscape hero-portrait
    promo-full promo-full-portrait
    promo-full-poster promo-full-portrait-poster
)

# 出力サイズ（W:H）
LANDSCAPE_SIZE="1280:720"
PORTRAIT_SIZE="720:1280"

# --- ヒーロー用ショート版 -------------------------------------------------------
# 元動画の HERO_START 秒から末尾までを切り出す
HERO_START=27.0         # 切り出し開始（秒）※終了は動画末尾まで
HERO_CRF=28             # 品質（大きいほど低品質・小容量。目安: 28〜30）

# --- フル尺プロモ ---------------------------------------------------------------
PROMO_CRF=26                 # 品質（ヒーローより高品質）
PROMO_AUDIO_BITRATE="96k"    # AAC 音声ビットレート

# --- ポスター画像 ---------------------------------------------------------------
POSTER_TIME=43.0     # 切り出す位置（秒）※チーム全員が走ってくるカット
POSTER_QUALITY=3     # JPEG品質（ffmpeg -q:v。2〜5 が高品質、値が小さいほど高画質）

# --- 共通エンコード設定 ---------------------------------------------------------
X264_PRESET="slow"   # 圧縮効率優先（時間はかかるがファイルが小さくなる）
X264_PROFILE="high"
PIX_FMT="yuv420p"    # ブラウザ互換性のため固定
X264_ARGS=(
    -c:v libx264 -preset "$X264_PRESET" -profile:v "$X264_PROFILE"
    -pix_fmt "$PIX_FMT"
    -write_tmcd 0
    -movflags +faststart
)

# ==============================================================================
# オプション解析
# ==============================================================================

DRY_RUN=false
ONLY=""

usage() {
    echo "Usage: $0 [--dry-run] [--only=<name>]"
    echo ""
    echo "Options:"
    echo "  --dry-run        Print ffmpeg commands without running them"
    echo "  --only=<name>    Generate only the given target(s):"
    echo "                   ${TARGETS[*]}"
    echo "                   Aliases: hero (= hero-*), promo (= promo-full + promo-full-portrait),"
    echo "                            poster (= *-poster)"
    echo "  --help           Show this help"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --dry-run"
    echo "  $0 --only=hero"
    echo "  $0 --only=promo-full-portrait"
    echo "  $0 --only=poster"
}

is_target() {
    local target
    for target in "${TARGETS[@]}"; do
        [ "$target" = "$1" ] && return 0
    done
    return 1
}

for arg in "$@"; do
    case $arg in
        --dry-run) DRY_RUN=true ;;
        --only=*)  ONLY="${arg#*=}" ;;
        --help)    usage; exit 0 ;;
        *)
            echo "Unknown option: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

is_alias() {
    case "$1" in hero|promo|poster) return 0 ;; *) return 1 ;; esac
}

if [ -n "$ONLY" ] && ! is_alias "$ONLY" && ! is_target "$ONLY"; then
    echo "❌ Error: unknown --only target: $ONLY"
    usage
    exit 1
fi

# ==============================================================================
# 事前チェック
# ==============================================================================

# リポジトリルートで実行する（元動画のパスが相対のため）
cd "$(dirname "$0")/.."

for tool in "$FFMPEG" "$FFPROBE"; do
    if ! command -v "$tool" &> /dev/null; then
        echo "❌ Error: $tool not found. Please install:"
        echo "     brew install ffmpeg"
        exit 1
    fi
done

for src in "$SRC_LANDSCAPE" "$SRC_PORTRAIT"; do
    if [ ! -f "$src" ]; then
        echo "❌ Error: Source video not found: $src"
        echo "   元動画をリポジトリ直下に配置してください（Gitにはコミットしないこと）"
        exit 1
    fi
done

# ==============================================================================
# ヘルパー
# ==============================================================================

# コマンドを表示し、dry-run でなければ実行する
run() {
    printf '  $'
    printf ' %q' "$@"
    echo ""
    if [ "$DRY_RUN" = false ]; then
        "$@"
    fi
}

# 指定ターゲットを生成すべきか（エイリアスは複数ターゲットにマッチ）
should_run() {
    case "$ONLY" in
        "")     return 0 ;;
        hero)   [[ "$1" == hero-* ]] ;;
        promo)  [[ "$1" == promo-full || "$1" == promo-full-portrait ]] ;;
        poster) [[ "$1" == *-poster ]] ;;
        *)      [ "$ONLY" = "$1" ] ;;
    esac
}

# ターゲット名 → 出力ファイルパス
output_file() {
    case "$1" in
        *-poster) echo "$OUTPUT_DIR/$1.jpg" ;;
        *)        echo "$OUTPUT_DIR/$1.mp4" ;;
    esac
}

file_size_mb() {
    local bytes
    bytes=$(stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null)
    awk -v b="$bytes" 'BEGIN { printf "%.2fMB", b / 1048576 }'
}

# ヒーロー用ショート版を生成する（-ss を -i の前に置き、HERO_START までのデコードを省く。
# 再エンコードなのでフレーム精度で切り出される）
#   $1: 元動画  $2: 出力サイズ(W:H)  $3: 出力ファイル
encode_hero() {
    local src="$1" size="$2" out="$3"
    run "$FFMPEG" -v error -stats -y \
        -ss "$HERO_START" -i "$src" \
        -vf "scale=${size}" \
        -an \
        "${X264_ARGS[@]}" -crf "$HERO_CRF" \
        "$out"
}

# フル尺プロモを生成する（音声あり）
#   $1: 元動画  $2: 出力サイズ(W:H)  $3: 出力ファイル
encode_promo_full() {
    local src="$1" size="$2" out="$3"
    run "$FFMPEG" -v error -stats -y \
        -i "$src" \
        -map 0:v:0 -map 0:a:0 \
        -vf "scale=${size}" \
        "${X264_ARGS[@]}" -crf "$PROMO_CRF" \
        -c:a aac -b:a "$PROMO_AUDIO_BITRATE" \
        "$out"
}

# ポスター画像を生成する
#   $1: 元動画  $2: 出力サイズ(W:H)  $3: 出力ファイル
encode_poster() {
    local src="$1" size="$2" out="$3"
    run "$FFMPEG" -v error -y \
        -ss "$POSTER_TIME" -i "$src" \
        -frames:v 1 \
        -vf "scale=${size}" \
        -q:v "$POSTER_QUALITY" \
        "$out"
}

# ターゲット名に応じたエンコードを実行する
#   $1: ターゲット名  $2: 出力ファイル
#   名前に portrait を含めば縦元動画・縦サイズ、それ以外は横
encode_target() {
    local target="$1" out="$2"
    local src="$SRC_LANDSCAPE" size="$LANDSCAPE_SIZE"
    if [[ "$target" == *portrait* ]]; then
        src="$SRC_PORTRAIT"
        size="$PORTRAIT_SIZE"
    fi
    case "$target" in
        hero-*)      encode_hero "$src" "$size" "$out" ;;
        *-poster)    encode_poster "$src" "$size" "$out" ;;
        promo-full*) encode_promo_full "$src" "$size" "$out" ;;
    esac
}

# 生成結果を ffprobe で検証・表示する
verify_video() {
    local file="$1"
    local info
    info=$("$FFPROBE" -v error \
        -show_entries stream=codec_type,codec_name,width,height:format=duration \
        -of compact=p=0:nk=1 "$file" | tr '\n' ' ')
    echo "  📊 $info"
    # moov atom がファイル先頭（ftyp 直後）にあるか（faststart の確認）
    if head -c 64 "$file" | LC_ALL=C grep -aq moov; then
        echo "  ✅ faststart: moov atom is at the head"
    else
        echo "  ⚠️  faststart: moov atom is NOT at the head"
    fi
}

# ==============================================================================
# メイン
# ==============================================================================

echo "🎬 Promo Video Encoder"
echo "=========================="
echo "📁 Output: $OUTPUT_DIR"
echo "🎞️  Hero: ${HERO_START}s-end, CRF ${HERO_CRF}"
echo "🎞️  Promo full: CRF ${PROMO_CRF}, audio ${PROMO_AUDIO_BITRATE}"
echo "🖼️  Poster: ${POSTER_TIME}s, q:v ${POSTER_QUALITY}"
if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No files will be generated"
fi
echo ""

if [ "$DRY_RUN" = false ]; then
    mkdir -p "$OUTPUT_DIR"
fi

for target in "${TARGETS[@]}"; do
    should_run "$target" || continue
    out=$(output_file "$target")
    echo "🔄 $(basename "$out")"
    encode_target "$target" "$out"
    echo ""
done

if [ "$DRY_RUN" = true ]; then
    echo "💡 Run without --dry-run to generate files"
    exit 0
fi

# 結果サマリー
echo "✨ Encoding complete!"
echo ""
echo "📊 Summary:"
for target in "${TARGETS[@]}"; do
    file=$(output_file "$target")
    [ -f "$file" ] || continue
    echo "  $(basename "$file") ($(file_size_mb "$file"))"
    if [[ "$file" == *.mp4 ]]; then
        verify_video "$file"
    fi
done
echo ""
echo "💡 Tips:"
echo "  - Adjust HERO_CRF / PROMO_CRF at the top of this script to trade size for quality"
echo "  - Use --dry-run to preview the ffmpeg commands"
echo "  - See knowledge/04-operations/video-management.md for details"
