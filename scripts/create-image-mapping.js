#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'docs', 'assets', 'members');

// 画像ディレクトリからマッピングを作成
function createImageMapping() {
    const files = fs.readdirSync(IMAGES_DIR);
    const imageMapping = {};
    
    files.forEach(file => {
        // .tmpファイルは無視
        if (!file.endsWith('.tmp')) {
            // ファイル名から拡張子を除いたものをIDとして使用
            const googleDriveId = file.split('.')[0];
            imageMapping[googleDriveId] = file;
        }
    });
    
    return imageMapping;
}

// メイン処理
const imageMapping = createImageMapping();
const mappingPath = path.join(__dirname, '..', 'docs', 'image-mapping.json');

fs.writeFileSync(mappingPath, JSON.stringify(imageMapping, null, 2));

console.log(`Created image mapping with ${Object.keys(imageMapping).length} entries`);
console.log(`Saved to: ${mappingPath}`);

// サンプル出力（最初の5件）
const entries = Object.entries(imageMapping).slice(0, 5);
console.log('\nSample entries:');
entries.forEach(([id, filename]) => {
    console.log(`  ${id} => ${filename}`);
});