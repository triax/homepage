#!/usr/bin/env node

/**
 * ギャラリーHTML生成スクリプト
 * docs/assets/gallery/内の画像からHTMLを生成
 * 
 * 使用法: node scripts/generate-gallery-html.js
 */

const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, '../docs/assets/gallery');
const OUTPUT_FILE = path.join(__dirname, 'gallery-html-output.html');

// 画像ファイルを取得（数字.jpg形式のみ）
function getGalleryImages() {
    try {
        const files = fs.readdirSync(GALLERY_DIR);
        return files
            .filter(file => /^\d+\.jpg$/i.test(file))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)[0]);
                const numB = parseInt(b.match(/\d+/)[0]);
                return numA - numB;
            });
    } catch (error) {
        console.error('❌ Error reading gallery directory:', error);
        return [];
    }
}

// 単一の画像アイテムHTMLを生成
function generateImageItem(filename, index, isLast, totalCount) {
    const altText = `Club TRIAX Photo ${index + 1}`;
    
    // 最後の画像で、合計が3の倍数でない場合は幅広表示
    const shouldSpanTwo = isLast && totalCount % 3 !== 0;
    const spanClass = shouldSpanTwo ? ' lg:col-span-2' : '';
    
    return `                <!-- Image ${index + 1} -->
                <div class="gallery-item group relative overflow-hidden shadow-lg${spanClass}">
                    <img src="./assets/gallery/${filename}" 
                         alt="${altText}" 
                         class="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-110">
                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300"></div>
                </div>`;
}

// ギャラリーセクション全体のHTMLを生成
function generateGalleryHTML(images) {
    const imageItems = images.map((img, index) => 
        generateImageItem(img, index, index === images.length - 1, images.length)
    ).join('\n                \n');
    
    return `    <!-- Photo Gallery Section -->
    <section id="photo-gallery" class="py-4 bg-gray-50">
        <div class="container mx-auto px-4">

            <!-- Gallery Grid -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 fade-in">
${imageItems}
            </div>
        </div>
        
        <!-- Lightbox Modal (PC only) -->
        <div id="lightbox" class="fixed inset-0 bg-black bg-opacity-90 z-50 hidden items-center justify-center p-4">
            <button id="close-lightbox" class="absolute top-4 right-4 text-white text-4xl hover:text-gray-300">&times;</button>
            <button id="prev-image" class="absolute left-4 text-white text-4xl hover:text-gray-300">&#8249;</button>
            <button id="next-image" class="absolute right-4 text-white text-4xl hover:text-gray-300">&#8250;</button>
            <img id="lightbox-image" src="" alt="" class="max-w-full max-h-full object-contain">
        </div>
    </section>`;
}

// メイン処理
function main() {
    console.log('🖼️  Gallery HTML Generator');
    console.log('=========================\n');
    
    const images = getGalleryImages();
    
    if (images.length === 0) {
        console.log('❌ No images found in gallery directory');
        console.log('   Please add images to: docs/assets/gallery/');
        console.log('   Format: 01.jpg, 02.jpg, etc.');
        return;
    }
    
    console.log(`📸 Found ${images.length} images:`);
    images.forEach(img => console.log(`   - ${img}`));
    console.log('');
    
    const html = generateGalleryHTML(images);
    
    // ファイルに出力
    fs.writeFileSync(OUTPUT_FILE, html);
    console.log(`✅ HTML generated successfully!`);
    console.log(`📄 Output saved to: ${OUTPUT_FILE}`);
    console.log('');
    console.log('📋 To use this HTML:');
    console.log('   1. Copy the generated code from the output file');
    console.log('   2. Replace the existing <section id="photo-gallery"> in docs/index.html');
    console.log('   3. The JavaScript (initGallery) will automatically handle the interactions');
    console.log('');
    console.log('💡 Tips:');
    console.log('   - Run scripts/optimize-gallery.sh first to optimize images');
    console.log('   - Images should be named: 01.jpg, 02.jpg, etc.');
    console.log('   - The last image spans 2 columns if total count is not divisible by 3');
}

// 実行
main();