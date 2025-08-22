#!/bin/bash

# ギャラリー画像最適化スクリプト
# 使用法: ./scripts/optimize-gallery.sh

GALLERY_DIR="docs/assets/gallery"
BACKUP_DIR="$GALLERY_DIR/original"
MAX_WIDTH=1920
QUALITY=85

echo "🖼️  Gallery Image Optimizer"
echo "=========================="

# ギャラリーディレクトリに移動
cd "$GALLERY_DIR" || exit 1

# 画像ファイルが存在するかチェック
shopt -s nullglob
images=(*.{jpg,JPG,jpeg,JPEG,png,PNG})
shopt -u nullglob

if [ ${#images[@]} -eq 0 ]; then
    echo "❌ No images found in $GALLERY_DIR"
    exit 1
fi

echo "📁 Found ${#images[@]} images"

# バックアップディレクトリ作成
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "📂 Created backup directory: $BACKUP_DIR"
fi

# 画像をリネーム＆最適化
counter=1
for file in "${images[@]}"; do
    # 新しいファイル名を生成（01.jpg, 02.jpg, ...）
    new_name=$(printf "%02d.jpg" $counter)
    
    echo ""
    echo "Processing: $file → $new_name"
    
    # オリジナルをバックアップ（まだバックアップがない場合）
    if [ ! -f "$BACKUP_DIR/$file" ]; then
        cp "$file" "$BACKUP_DIR/$file"
        echo "  ✅ Backed up original"
    fi
    
    # ImageMagick/GraphicsMagickで最適化
    if command -v magick &> /dev/null; then
        # ImageMagick 7.x
        magick "$file" \
            -resize "${MAX_WIDTH}>" \
            -quality $QUALITY \
            -interlace Plane \
            -strip \
            "$new_name.tmp"
    elif command -v convert &> /dev/null; then
        # ImageMagick 6.x
        convert "$file" \
            -resize "${MAX_WIDTH}>" \
            -quality $QUALITY \
            -interlace Plane \
            -strip \
            "$new_name.tmp"
    else
        echo "  ❌ ImageMagick not found. Please install it first:"
        echo "     brew install imagemagick"
        exit 1
    fi
    
    # 一時ファイルを正式なファイル名に移動
    if [ -f "$new_name.tmp" ]; then
        mv "$new_name.tmp" "$new_name"
        
        # サイズ比較
        original_size=$(ls -lh "$BACKUP_DIR/$file" 2>/dev/null | awk '{print $5}')
        new_size=$(ls -lh "$new_name" | awk '{print $5}')
        
        echo "  ✅ Optimized: $original_size → $new_size"
        
        # 元のファイルが新しいファイル名と異なる場合は削除
        if [ "$file" != "$new_name" ] && [ -f "$file" ]; then
            rm "$file"
        fi
    else
        echo "  ❌ Optimization failed"
    fi
    
    counter=$((counter + 1))
done

echo ""
echo "✨ Gallery optimization complete!"
echo ""
echo "📊 Summary:"
echo "  - Optimized images: $(ls -1 *.jpg 2>/dev/null | wc -l)"
echo "  - Backup location: $BACKUP_DIR"
echo "  - Total size: $(du -sh . | cut -f1)"
echo ""
echo "💡 Tips:"
echo "  - Original images are saved in: $BACKUP_DIR"
echo "  - To restore originals: cp $BACKUP_DIR/* ."
echo "  - Add new images and run this script again to maintain numbering"