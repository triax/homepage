#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// メンバー画像保存先ディレクトリ
const IMAGES_DIR = path.join(__dirname, '..', 'docs', 'assets', 'members');

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
    console.log(`Created directory: ${IMAGES_DIR}`);
}

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
        'image/svg+xml': 'svg'
    };
    return mimeToExt[contentType] || 'jpg'; // デフォルトはjpg
}

// Google Drive URLから画像をダウンロード
function downloadImage(url, googleDriveId) {
    return new Promise((resolve, reject) => {
        // 一時ファイル名（拡張子は後で決定）
        const tempFilePath = path.join(IMAGES_DIR, `${googleDriveId}.tmp`);
        const file = fs.createWriteStream(tempFilePath);

        https.get(url, (response) => {
            // リダイレクトを処理
            if (response.statusCode === 302 || response.statusCode === 301) {
                https.get(response.headers.location, (redirectResponse) => {
                    const contentType = redirectResponse.headers['content-type'];
                    const extension = getExtensionFromContentType(contentType);
                    const finalFilename = `${googleDriveId}.${extension}`;
                    const finalFilePath = path.join(IMAGES_DIR, finalFilename);

                    redirectResponse.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        // 正しい拡張子でリネーム
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
                    // 正しい拡張子でリネーム
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
        // Roster APIからデータを取得
        console.log('Fetching roster data...');
        const response = await fetch('https://raw.githubusercontent.com/triax/roster-api/refs/heads/main/data/roster.json');
        const data = await response.json();
        
        console.log(`Found ${data.members.length} members`);
        
        // 更新されたメンバーデータを保存
        const updatedMembers = [];
        
        // 各メンバーの画像をダウンロード
        for (let i = 0; i < data.members.length; i++) {
            const member = data.members[i];
            const memberInfo = `${member.name.default}${member.jersey ? ` (#${member.jersey})` : ''}`;
            
            console.log(`\nProcessing member: ${memberInfo}`);
            
            try {
                // photos内のすべての画像を処理
                if (member.photos) {
                    // serious画像（新しいAPI形式対応）
                    if (member.photos.serious) {
                        let seriousUrl, seriousMimeType;
                        
                        // 新しい形式（オブジェクト）の場合
                        if (typeof member.photos.serious === 'object' && member.photos.serious.url) {
                            seriousUrl = member.photos.serious.url;
                            seriousMimeType = member.photos.serious.mime_type;
                        } else {
                            // 旧形式（文字列）の場合
                            seriousUrl = member.photos.serious;
                            seriousMimeType = null;
                        }
                        
                        const googleDriveId = extractGoogleDriveId(seriousUrl);
                        if (googleDriveId) {
                            // MIMEタイプが提供されている場合は拡張子を決定
                            let expectedExt = null;
                            if (seriousMimeType) {
                                expectedExt = getExtensionFromContentType(seriousMimeType);
                                console.log(`  Expected extension for serious photo: ${expectedExt} (${seriousMimeType})`);
                            }
                            
                            const filename = await downloadImage(seriousUrl, googleDriveId);
                            member.photos.serious = `assets/members/${filename}`;
                        } else {
                            console.warn(`  Could not extract Google Drive ID from serious photo URL`);
                        }
                    }
                    
                    // casual画像（配列）
                    if (member.photos.casual && Array.isArray(member.photos.casual)) {
                        const updatedCasualPhotos = [];
                        for (let j = 0; j < member.photos.casual.length; j++) {
                            const casualItem = member.photos.casual[j];
                            let casualUrl, casualMimeType;
                            
                            // 新しい形式（オブジェクト）の場合
                            if (typeof casualItem === 'object' && casualItem.url) {
                                casualUrl = casualItem.url;
                                casualMimeType = casualItem.mime_type;
                            } else {
                                // 旧形式（文字列）の場合
                                casualUrl = casualItem;
                                casualMimeType = null;
                            }
                            
                            const googleDriveId = extractGoogleDriveId(casualUrl);
                            if (googleDriveId) {
                                if (casualMimeType) {
                                    const expectedExt = getExtensionFromContentType(casualMimeType);
                                    console.log(`  Expected extension for casual photo ${j + 1}: ${expectedExt} (${casualMimeType})`);
                                }
                                
                                const filename = await downloadImage(casualUrl, googleDriveId);
                                updatedCasualPhotos.push(`assets/members/${filename}`);
                            } else {
                                console.warn(`  Could not extract Google Drive ID from casual photo ${j + 1} URL`);
                                updatedCasualPhotos.push(casualUrl); // 元のURLを保持
                            }
                        }
                        member.photos.casual = updatedCasualPhotos;
                    }
                }
                
                updatedMembers.push(member);
            } catch (err) {
                console.error(`Failed to download images for ${memberInfo}: ${err.message}`);
                // エラーが発生してもメンバーデータは保持
                updatedMembers.push(member);
            }
        }
        
        // 更新されたデータを保存
        const updatedData = {
            ...data,
            members: updatedMembers,
            localImages: true,
            downloadedAt: new Date().toISOString()
        };
        
        const outputPath = path.join(__dirname, '..', 'docs', 'roster-local.json');
        fs.writeFileSync(outputPath, JSON.stringify(updatedData, null, 2));
        console.log(`\nSaved updated roster data to: ${outputPath}`);
        
        // マッピングファイルも作成（簡易版）
        const imageMapping = {};
        updatedMembers.forEach(member => {
            if (member.photos && member.photos.serious) {
                const googleDriveId = extractGoogleDriveId(member.photos.serious);
                if (googleDriveId) {
                    // 実際のファイルパスからマッピング
                    const files = fs.readdirSync(IMAGES_DIR);
                    const actualFile = files.find(f => f.startsWith(googleDriveId));
                    if (actualFile) {
                        imageMapping[googleDriveId] = actualFile;
                    }
                }
            }
        });
        
        const mappingPath = path.join(__dirname, '..', 'docs', 'image-mapping.json');
        fs.writeFileSync(mappingPath, JSON.stringify(imageMapping, null, 2));
        console.log(`Saved image mapping to: ${mappingPath}`);
        
        console.log('\nAll images downloaded successfully!');
        console.log(`Total members processed: ${updatedMembers.length}`);
        
        // ダウンロードされた画像の統計
        const downloadedFiles = fs.readdirSync(IMAGES_DIR);
        const pngFiles = downloadedFiles.filter(f => f.endsWith('.png'));
        const jpgFiles = downloadedFiles.filter(f => f.endsWith('.jpg'));
        
        console.log(`\nDownload statistics:`);
        console.log(`  Total images: ${downloadedFiles.length}`);
        console.log(`  PNG files: ${pngFiles.length}`);
        console.log(`  JPG files: ${jpgFiles.length}`);
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// スクリプトを実行
main();