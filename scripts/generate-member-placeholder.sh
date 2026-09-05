#!/bin/bash

# メンバー写真プレースホルダー生成スクリプト（Issue #22 / ADR-010）
# TRIAX ロゴ（docs/assets/triax-logo.png）を透かしとして配した 800x800 の画像を生成する。
# 写真未登録メンバーのカード・詳細モーダル・ピックアップ表示で使う。
#
# 使用法:
#   ./scripts/generate-member-placeholder.sh --production     # 採用案を docs/assets/member-placeholder.jpg に生成（本番用）
#   ./scripts/generate-member-placeholder.sh                  # 比較用サンプル全パターンを knowledge/plans/member-placeholder-samples に生成
#   ./scripts/generate-member-placeholder.sh --out=<dir>      # サンプルの出力先を指定
#   ./scripts/generate-member-placeholder.sh --only=<name>    # 指定した1パターンだけ生成（例: --only=maroon-center-60）
#
# 採用案のパラメータは下の ADOPTED_* にまとめてある。変更するときはそこだけ直し、
# --production で再生成する（サンプル一覧の該当行も同じ定数を参照している）。
#
# 要件: ImageMagick 7（magick コマンド）
# キャプション付きパターン（light-center-60-caption）は macOS 標準の Helvetica を
# フォントファイルのパス指定で使う（/System/Library/Fonts/Helvetica.ttc）。
# `magick -list font` に登録されていない環境でも動くが、他 OS ではパスを差し替えること。

set -euo pipefail

# ---------------------------------------------------------------------------
# 設定
# ---------------------------------------------------------------------------
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGO="$REPO_ROOT/docs/assets/triax-logo.png"
PRODUCTION_FILE="$REPO_ROOT/docs/assets/member-placeholder.jpg"   # docs/assets/members/ はビルド生成物で消えるためその外に置く
SAMPLES_DIR="$REPO_ROOT/knowledge/plans/member-placeholder-samples"

CANVAS=800                # 出力サイズ（正方形）。build-members.ts の PHOTO_MAX_EDGE と揃える
JPEG_QUALITY=85           # JPEG 品質。optimize-images.sh / build-members.ts と揃える

# ロゴ本来の色（triax-logo.png の不透明ピクセルを実測。index.css の --primary-color と同じ）
LOGO_MAROON="#853734"
LOGO_MAROON_DARK="#6f2d2a"   # maroon-dark サンプル用。LOGO_MAROON をやや暗くした地色

# 採用案（gradient-center-60-op18）: 上→下の縦グラデーション地にえんじ色ロゴを 18% で中央配置
ADOPTED_NAME="gradient-center-60-op18"
ADOPTED_BG="gradient:#f3f4f6-#d1d5db"
ADOPTED_LOGO_COLOR="$LOGO_MAROON"
ADOPTED_OPACITY=18        # ロゴの不透明度（%）
ADOPTED_SIZE=60           # ロゴの高さ（キャンバス高に対する %）
ADOPTED_POSITION="center"

# キャプション付きサンプル用
CAPTION_FONT="/System/Library/Fonts/Helvetica.ttc"
CAPTION_COLOR="#9ca3af"   # 旧 "No Image" の文字色（Tailwind gray-400）
CAPTION_POINTSIZE=26
CAPTION_KERNING=6         # 英字の字間（レタースペーシング）
CAPTION_BOTTOM_MARGIN=60  # 下端からの距離

# ---------------------------------------------------------------------------
# オプション解析
# ---------------------------------------------------------------------------
PRODUCTION=false
OUT_DIR="$SAMPLES_DIR"
ONLY=""

for arg in "$@"; do
    case $arg in
        --production)
            PRODUCTION=true
            ;;
        --out=*)
            OUT_DIR="${arg#*=}"
            ;;
        --only=*)
            ONLY="${arg#*=}"
            ;;
        --help)
            echo "Usage: $0 [--production] [--out=<dir>] [--only=<variant-name>]"
            echo ""
            echo "Options:"
            echo "  --production    Write only the adopted variant to docs/assets/member-placeholder.jpg"
            echo "  --out=<dir>     Sample output directory (default: knowledge/plans/member-placeholder-samples)"
            echo "  --only=<name>   Generate only the named sample variant (e.g. maroon-center-60)"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

if [ "$PRODUCTION" = true ] && { [ "$OUT_DIR" != "$SAMPLES_DIR" ] || [ -n "$ONLY" ]; }; then
    echo "❌ Error: --production cannot be combined with --out / --only"
    exit 1
fi

if ! command -v magick >/dev/null 2>&1; then
    echo "❌ Error: ImageMagick 7 (magick) is required"
    exit 1
fi

if [ ! -f "$LOGO" ]; then
    echo "❌ Error: Logo not found: $LOGO"
    exit 1
fi

# ---------------------------------------------------------------------------
# 1枚描画
#
# compose <output> <bg> <logo-color> <opacity%> <logo-size%> <position> [caption]
#   output      出力ファイルパス（拡張子で PNG / JPEG を決める）
#   bg          地色。"#rrggbb" か ImageMagick の擬似画像指定（例: "gradient:#f3f4f6-#d1d5db"）
#   logo-color  ロゴの塗り色（"#rrggbb" / "white" など）
#   opacity%    ロゴの不透明度（0〜100）
#   logo-size%  ロゴの高さをキャンバス高に対する % で指定（100 超でキャンバスからはみ出す）
#   position    "center"（中央）または "corner"（右下にはみ出す配置。size% は 100 超を想定）
#   caption     任意。下部に添える英字キャプション
#
# ロゴの再着色は「アルファチャンネルをマスクとして塗り色で shape」する方式。
# 元 PNG の色に依存せず、任意の色・不透明度に変えられる。
# 出力は 8-bit 固定（gradient: 擬似画像は 16-bit になり PNG が肥大化するため）。
# ---------------------------------------------------------------------------
compose() {
    local out="$1" bg="$2" color="$3" opacity="$4" size="$5" position="$6" caption="${7:-}"

    # 地色: 擬似画像指定（gradient: 等）はそのまま、単色は xc: を付ける
    local canvas_spec="$bg"
    case "$bg" in
        *:*) ;;
        *) canvas_spec="xc:$bg" ;;
    esac

    local logo_height=$(( CANVAS * size / 100 ))
    local alpha_multiplier
    alpha_multiplier=$(awk "BEGIN { printf \"%.4f\", $opacity / 100 }")

    # 配置: corner はキャンバスの 20% ぶん右下へ押し出してクロップさせる
    local gravity="center" geometry="+0+0"
    if [ "$position" = "corner" ]; then
        local overflow=$(( CANVAS * 20 / 100 ))
        gravity="SouthEast"
        geometry="-${overflow}-${overflow}"
    fi

    # キャプション（指定時のみ）。空配列の展開は bash 3.2 + set -u で失敗するため ${arr[@]+...} 形式で渡す
    local caption_args=()
    if [ -n "$caption" ]; then
        caption_args=(
            -gravity South
            -font "$CAPTION_FONT" -pointsize "$CAPTION_POINTSIZE" -kerning "$CAPTION_KERNING"
            -fill "$CAPTION_COLOR"
            # -kerning は末尾にも字間が付くため、その半分だけ右へずらして見た目の中央に揃える
            -annotate "+$(( CAPTION_KERNING / 2 ))+${CAPTION_BOTTOM_MARGIN}" "$caption"
        )
    fi

    # -quality は JPEG 出力時の品質。PNG 出力では圧縮レベルとして解釈されるだけで画質には影響しない
    magick -size "${CANVAS}x${CANVAS}" "$canvas_spec" \
        \( "$LOGO" -resize "x${logo_height}" \
           -alpha extract -background "$color" -alpha shape \
           -channel A -evaluate multiply "$alpha_multiplier" +channel \) \
        -gravity "$gravity" -geometry "$geometry" -composite \
        ${caption_args[@]+"${caption_args[@]}"} \
        -depth 8 -quality "$JPEG_QUALITY" -strip "$out"
}

# ファイルサイズを "  name  12.3 KB" 形式で表示
print_size() {
    local bytes
    bytes=$(wc -c < "$1" | tr -d ' ')
    printf "  %-32s %7.1f KB\n" "$(basename "$1")" "$(awk "BEGIN { print $bytes / 1024 }")"
}

# ---------------------------------------------------------------------------
# 本番用: 採用案だけを JPEG で書き出す
# ---------------------------------------------------------------------------
if [ "$PRODUCTION" = true ]; then
    echo "🎨 Generating production placeholder ($ADOPTED_NAME) -> $PRODUCTION_FILE"
    compose "$PRODUCTION_FILE" "$ADOPTED_BG" "$ADOPTED_LOGO_COLOR" "$ADOPTED_OPACITY" "$ADOPTED_SIZE" "$ADOPTED_POSITION"
    print_size "$PRODUCTION_FILE"
    exit 0
fi

# ---------------------------------------------------------------------------
# サンプル用: 各パターンを PNG と JPEG（サイズ比較用）で書き出す
# --only 指定時は該当パターンだけ描画する
# ---------------------------------------------------------------------------
variant() {
    local name="$1"
    if [ -n "$ONLY" ] && [ "$ONLY" != "$name" ]; then
        return
    fi
    compose "$OUT_DIR/$name.png" "${@:2}"
    magick "$OUT_DIR/$name.png" -quality "$JPEG_QUALITY" -strip "$OUT_DIR/$name.jpg"
    echo "✅ $name  (bg=$2 logo=$3 opacity=$4% size=$5% pos=$6${7:+ caption=\"$7\"})"
}

mkdir -p "$OUT_DIR"
echo "🎨 Generating member placeholder samples -> $OUT_DIR"
echo ""

# 第1ラウンド: 地色・ロゴ色・配置・キャプション有無の比較（10 案）
#       name                        bg                          logo-color     op%  size%  position  caption
variant light-center-60             "#e5e7eb"                   "$LOGO_MAROON" 12   60     center
variant offwhite-center-60          "#f5f5f4"                   "$LOGO_MAROON" 10   60     center
variant light-center-40             "#e5e7eb"                   "$LOGO_MAROON" 18   40     center
variant dark-center-60              "#1f2937"                   "white"        12   60     center
variant black-center-60             "#111111"                   "white"        10   60     center
variant maroon-center-60            "$LOGO_MAROON"              "white"        15   60     center
variant light-corner-130            "#e5e7eb"                   "$LOGO_MAROON" 10   130    corner
variant dark-corner-130             "#1f2937"                   "white"        10   130    corner
variant light-center-60-caption     "#e5e7eb"                   "$LOGO_MAROON" 12   60     center    "PHOTO COMING SOON"
variant gradient-center-60          "gradient:#f3f4f6-#d1d5db"  "$LOGO_MAROON" 12   60     center

# 第2ラウンド: 最終候補 2 案（maroon-center-60 / gradient-center-60）の派生パターン
#   - maroon 系: ロゴ不透明度の振り幅（10/15/20/25%）と、やや暗い地色
#   - gradient 系: ロゴ不透明度 18%（採用案）、放射グラデーション（中央明→周辺暗）、ロゴ 70%
# 地色の "radial-gradient:<c1>-<c2>" は ImageMagick の擬似画像（中央 c1 → 外周 c2）
#       name                        bg                                logo-color            op%                size%           position
variant maroon-center-60-op10       "$LOGO_MAROON"                    "white"               10                 60              center
variant maroon-center-60-op20       "$LOGO_MAROON"                    "white"               20                 60              center
variant maroon-center-60-op25       "$LOGO_MAROON"                    "white"               25                 60              center
variant maroon-dark-center-60       "$LOGO_MAROON_DARK"               "white"               15                 60              center
variant "$ADOPTED_NAME"             "$ADOPTED_BG"                     "$ADOPTED_LOGO_COLOR" "$ADOPTED_OPACITY" "$ADOPTED_SIZE" "$ADOPTED_POSITION"
variant gradient-radial-center-60   "radial-gradient:#f5f5f4-#cfd3d9" "$LOGO_MAROON"        12                 60              center
variant gradient-center-70          "gradient:#f3f4f6-#d1d5db"        "$LOGO_MAROON"        12                 70              center

# ---------------------------------------------------------------------------
# サイズ一覧
# ---------------------------------------------------------------------------
echo ""
echo "📦 Output files:"
printf "  %-32s %10s\n" "FILE" "SIZE"
for f in "$OUT_DIR"/*.png "$OUT_DIR"/*.jpg; do
    [ -f "$f" ] || continue
    print_size "$f"
done
