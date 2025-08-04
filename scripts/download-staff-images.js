#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '..', 'docs', 'assets', 'members');

// Google Drive URLからIDを抽出
function extractGoogleDriveId(url) {
    const match = url.match(/id=([^&]+)/);
    return match ? match[1] : null;
}

// Content-Typeから拡張子を取得
function getExtensionFromContentType(contentType) {
    const mimeToExt = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/svg+xml': 'svg',
        'image/heif': 'heif',  // HEIF形式も追加
        'image/heic': 'heic'   // HEIC形式も追加
    };
    return mimeToExt[contentType] || 'jpg';
}

// Google Drive URLから画像をダウンロード
function downloadImage(url, googleDriveId) {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(IMAGES_DIR, `${googleDriveId}.tmp`);
        const file = fs.createWriteStream(tempFilePath);

        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                https.get(response.headers.location, (redirectResponse) => {
                    const contentType = redirectResponse.headers['content-type'];
                    const extension = getExtensionFromContentType(contentType);
                    const finalFilename = `${googleDriveId}.${extension}`;
                    const finalFilePath = path.join(IMAGES_DIR, finalFilename);

                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        fs.renameSync(tempFilePath, finalFilePath);
                        console.log(`Downloaded: ${finalFilename}`);
                        resolve(finalFilename);
                    });
                }).on('error', (err) => {
                    fs.unlink(tempFilePath, () => {});
                    reject(err);
                });
            } else if (response.statusCode === 200) {
                const contentType = response.headers['content-type'];
                const extension = getExtensionFromContentType(contentType);
                const finalFilename = `${googleDriveId}.${extension}`;
                const finalFilePath = path.join(IMAGES_DIR, finalFilename);

                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    fs.renameSync(tempFilePath, finalFilePath);
                    console.log(`Downloaded: ${finalFilename}`);
                    resolve(finalFilename);
                });
            } else {
                file.close();
                fs.unlink(tempFilePath, () => {});
                reject(new Error(`Failed to download: ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(tempFilePath, () => {});
            reject(err);
        });
    });
}

// メインの処理
async function main() {
    try {
        console.log('Fetching roster data...');
        const response = await fetch('https://raw.githubusercontent.com/triax/roster-api/refs/heads/main/data/roster.json');
        const data = await response.json();
        
        // スタッフ・コーチ（背番号なし）のメンバーのみ処理
        const staffMembers = data.members.filter(m => !m.jersey);
        console.log(`Found ${staffMembers.length} staff/coach members without jersey numbers`);
        
        for (const member of staffMembers) {
            console.log(`\nProcessing: ${member.name.default} (${member.position || 'No position'})`);
            
            try {
                if (member.photos && member.photos.serious) {
                    const seriousUrl = member.photos.serious.url || member.photos.serious;
                    const seriousMimeType = member.photos.serious.mime_type;
                    const googleDriveId = extractGoogleDriveId(seriousUrl);
                    
                    if (googleDriveId) {
                        console.log(`  Mime type: ${seriousMimeType}`);
                        
                        // 既にダウンロード済みかチェック
                        const existingFiles = fs.readdirSync(IMAGES_DIR);
                        const exists = existingFiles.some(f => f.startsWith(googleDriveId));
                        
                        if (exists) {
                            console.log(`  Already downloaded: ${googleDriveId}`);
                        } else {
                            // HEIF/HEIC形式の警告
                            if (seriousMimeType && (seriousMimeType.includes('heif') || seriousMimeType.includes('heic'))) {
                                console.log(`  WARNING: HEIF/HEIC format may not be supported in browsers`);
                            }
                            await downloadImage(seriousUrl, googleDriveId);
                        }
                    }
                }
                
                // Casual写真も処理
                if (member.photos && member.photos.casual && Array.isArray(member.photos.casual)) {
                    for (let i = 0; i < member.photos.casual.length; i++) {
                        const casualItem = member.photos.casual[i];
                        const casualUrl = casualItem.url || casualItem;
                        const casualMimeType = casualItem.mime_type;
                        const googleDriveId = extractGoogleDriveId(casualUrl);
                        
                        if (googleDriveId) {
                            const existingFiles = fs.readdirSync(IMAGES_DIR);
                            const exists = existingFiles.some(f => f.startsWith(googleDriveId));
                            
                            if (!exists) {
                                if (casualMimeType && (casualMimeType.includes('heif') || casualMimeType.includes('heic'))) {
                                    console.log(`  WARNING: HEIF/HEIC format for casual photo ${i + 1}`);
                                }
                                await downloadImage(casualUrl, googleDriveId);
                            }
                        }
                    }
                }
            } catch (err) {
                console.error(`  Error: ${err.message}`);
            }
        }
        
        console.log('\nCompleted!');
        
        // HEIF/HEIC形式の画像を確認
        const allFiles = fs.readdirSync(IMAGES_DIR);
        const heifFiles = allFiles.filter(f => f.endsWith('.heif') || f.endsWith('.heic'));
        if (heifFiles.length > 0) {
            console.log(`\nWARNING: ${heifFiles.length} HEIF/HEIC files were downloaded.`);
            console.log('These may not display correctly in browsers. Consider converting them to JPEG.');
            heifFiles.forEach(f => console.log(`  - ${f}`));
        }
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();