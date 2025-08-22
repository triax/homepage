#!/bin/bash

# 画像最適化統合スクリプト
# 使用法: 
#   ./scripts/optimize-images.sh --target=docs/assets/members [--dry-run]
#   ./scripts/optimize-images.sh --target=docs/assets/gallery [--dry-run]

# デフォルト設定
TARGET_DIR=""
MAX_WIDTH=1920
QUALITY=85
DRY_RUN=false
RENAME_SEQUENTIAL=false

# オプション解析
for arg in "$@"; do
    case $arg in
        --target=*)
            TARGET_DIR="${arg#*=}"
            ;;
        --dry-run)
            DRY_RUN=true
            ;;
        --help)
            echo "Usage: $0 --target=<directory> [--dry-run]"
            echo ""
            echo "Options:"
            echo "  --target=<dir>   Target directory (required)"
            echo "  --dry-run        Preview changes without modifying files"
            echo ""
            echo "Examples:"
            echo "  $0 --target=docs/assets/members"
            echo "  $0 --target=docs/assets/gallery --dry-run"
            echo "  $0 --target=docs/assets/headers"
            exit 0
            ;;
        *)
            echo "Unknown option: $arg"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# ターゲットディレクトリのチェック
if [ -z "$TARGET_DIR" ]; then
    echo "❌ Error: --target is required"
    echo "Use --help for usage information"
    exit 1
fi

if [ ! -d "$TARGET_DIR" ]; then
    echo "❌ Error: Directory not found: $TARGET_DIR"
    exit 1
fi

# ターゲットに応じた設定
case "$TARGET_DIR" in
    *gallery*)
        MAX_WIDTH=1920
        RENAME_SEQUENTIAL=true
        echo "🖼️  Gallery Image Optimizer"
        ;;
    *members*)
        MAX_WIDTH=800
        RENAME_SEQUENTIAL=false
        echo "👥 Member Images Optimizer"
        ;;
    *headers*)
        MAX_WIDTH=1920
        QUALITY=90
        RENAME_SEQUENTIAL=false
        echo "🎨 Header Images Optimizer"
        ;;
    *sponsors*)
        MAX_WIDTH=600
        RENAME_SEQUENTIAL=false
        echo "🤝 Sponsor Images Optimizer"
        ;;
    *)
        echo "📸 General Image Optimizer"
        ;;
esac

echo "=========================="
echo "📐 Auto-orientation enabled (EXIF-safe)"
echo "📁 Target: $TARGET_DIR"
echo "📏 Max width: ${MAX_WIDTH}px"
echo "🎨 Quality: ${QUALITY}%"

if [ "$DRY_RUN" = true ]; then
    echo "🔍 DRY RUN MODE - No files will be modified"
fi

echo ""

# ディレクトリに移動
cd "$TARGET_DIR" || exit 1

# 画像ファイルを取得
shopt -s nullglob
images=(*.{jpg,JPG,jpeg,JPEG,png,PNG})
shopt -u nullglob

if [ ${#images[@]} -eq 0 ]; then
    echo "❌ No images found in $TARGET_DIR"
    exit 1
fi

echo "📊 Found ${#images[@]} images"
echo "💾 Current total size: $(du -sh . | cut -f1)"
echo ""

# dry-runモード
if [ "$DRY_RUN" = true ]; then
    echo "📋 Preview of changes:"
    echo ""
    
    total_original=0
    total_estimated=0
    will_process=0
    
    for file in "${images[@]}"; do
        file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        
        # 500KB以下はスキップ
        if [ $file_size -lt 512000 ]; then
            echo "  ⏭️  Skip: $file ($(ls -lh "$file" | awk '{print $5}'))"
        else
            echo "  🔄 Process: $file ($(ls -lh "$file" | awk '{print $5}'))"
            will_process=$((will_process + 1))
            total_original=$((total_original + file_size))
            # 約90%削減を想定
            estimated_size=$((file_size / 10))
            total_estimated=$((total_estimated + estimated_size))
        fi
    done
    
    echo ""
    echo "📈 Estimated Results:"
    echo "  Images to process: $will_process"
    if [ $will_process -gt 0 ]; then
        echo "  Original size: ~$(echo "scale=1; $total_original/1048576" | bc)MB"
        echo "  Estimated size: ~$(echo "scale=1; $total_estimated/1048576" | bc)MB"
        echo "  Estimated reduction: ~90%"
    fi
    echo ""
    echo "💡 Run without --dry-run to apply optimizations"
    exit 0
fi

# 処理カウンター
processed=0
skipped=0
failed=0
counter=1

echo "🔄 Processing images..."
echo ""

# 連番リネーム用の処理
if [ "$RENAME_SEQUENTIAL" = true ]; then
    # ギャラリーモード：連番でリネーム
    for file in "${images[@]}"; do
        new_name=$(printf "%02d.jpg" $counter)
        
        echo "📸 Processing: $file → $new_name"
        
        # ImageMagickで最適化
        if command -v magick &> /dev/null; then
            # ImageMagick 7.x
            magick "$file" \
                -auto-orient \
                -resize "${MAX_WIDTH}>" \
                -quality $QUALITY \
                -interlace Plane \
                -strip \
                "$new_name.tmp" 2>/dev/null
        elif command -v convert &> /dev/null; then
            # ImageMagick 6.x
            convert "$file" \
                -auto-orient \
                -resize "${MAX_WIDTH}>" \
                -quality $QUALITY \
                -interlace Plane \
                -strip \
                "$new_name.tmp" 2>/dev/null
        else
            echo "  ❌ ImageMagick not found. Please install:"
            echo "     brew install imagemagick"
            exit 1
        fi
        
        # 結果確認
        if [ -f "$new_name.tmp" ]; then
            mv "$new_name.tmp" "$new_name"
            
            # 元のファイルが新しい名前と異なる場合は削除
            if [ "$file" != "$new_name" ] && [ -f "$file" ]; then
                rm "$file"
            fi
            
            echo "  ✅ Optimized and renamed"
            processed=$((processed + 1))
        else
            echo "  ❌ Failed"
            failed=$((failed + 1))
        fi
        
        counter=$((counter + 1))
        echo ""
    done
else
    # 通常モード：ファイル名維持
    for file in "${images[@]}"; do
        # ファイルサイズチェック（500KB以下はスキップ）
        file_size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null)
        if [ $file_size -lt 512000 ]; then
            echo "⏭️  Skipping $file (already optimized: $(ls -lh "$file" | awk '{print $5}'))"
            skipped=$((skipped + 1))
            continue
        fi
        
        echo "📸 Processing: $file"
        
        # 一時ファイル名
        temp_file="${file}.tmp"
        
        # ImageMagickで最適化
        if command -v magick &> /dev/null; then
            # ImageMagick 7.x
            magick "$file" \
                -auto-orient \
                -resize "${MAX_WIDTH}>" \
                -quality $QUALITY \
                -interlace Plane \
                -strip \
                -sampling-factor 4:2:0 \
                "$temp_file" 2>/dev/null
        elif command -v convert &> /dev/null; then
            # ImageMagick 6.x
            convert "$file" \
                -auto-orient \
                -resize "${MAX_WIDTH}>" \
                -quality $QUALITY \
                -interlace Plane \
                -strip \
                -sampling-factor 4:2:0 \
                "$temp_file" 2>/dev/null
        else
            echo "  ❌ ImageMagick not found. Please install:"
            echo "     brew install imagemagick"
            exit 1
        fi
        
        # 最適化結果を確認
        if [ -f "$temp_file" ]; then
            new_size=$(stat -f%z "$temp_file" 2>/dev/null || stat -c%s "$temp_file" 2>/dev/null)
            
            # 新しいファイルが元より小さい場合のみ置き換え
            if [ $new_size -lt $file_size ]; then
                mv "$temp_file" "$file"
                
                # サイズ比較を表示
                original_size_h=$(echo "scale=1; $file_size/1048576" | bc)M
                new_size_h=$(ls -lh "$file" | awk '{print $5}')
                reduction=$((100 - (new_size * 100 / file_size)))
                
                echo "  ✅ Optimized: $original_size_h → $new_size_h (${reduction}% reduction)"
                processed=$((processed + 1))
            else
                rm "$temp_file"
                echo "  ⏭️  Already optimal"
                skipped=$((skipped + 1))
            fi
        else
            echo "  ❌ Optimization failed"
            failed=$((failed + 1))
        fi
        
        echo ""
    done
fi

# 結果サマリー
echo "✨ Image optimization complete!"
echo ""
echo "📊 Summary:"
echo "  ✅ Optimized: $processed images"
echo "  ⏭️  Skipped: $skipped images"
if [ $failed -gt 0 ]; then
    echo "  ❌ Failed: $failed images"
fi
echo "  💾 New total size: $(du -sh . | cut -f1)"
echo ""
echo "💡 Tips:"
echo "  - Use 'git diff' to see what changed"
echo "  - Use 'git checkout -- $TARGET_DIR' to restore if needed"
echo "  - Run with --dry-run to preview changes"