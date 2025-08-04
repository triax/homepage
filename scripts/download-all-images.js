#!/usr/bin/env node

/**
 * Club TRIAX メンバー画像ダウンロードスクリプト
 * 
 * このスクリプトは以下の機能を提供します：
 * - Roster APIからすべてのメンバー画像をダウンロード
 * - 並列処理による高速ダウンロード
 * - プログレス表示とエラーハンドリング
 * - GitHub Actions対応
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

// 設定
const CONFIG = {
    IMAGES_DIR: path.join(__dirname, '..', 'docs', 'assets', 'members'),
    API_URL: 'https://raw.githubusercontent.com/triax/roster-api/refs/heads/main/data/roster.json',
    CONCURRENT_DOWNLOADS: 5,  // 同時ダウンロード数
    RETRY_COUNT: 3,          // リトライ回数
    RETRY_DELAY: 1000,       // リトライ間隔（ミリ秒）
    SKIP_EXISTING: process.env.SKIP_EXISTING !== 'false',  // 既存ファイルをスキップするか
    GITHUB_ACTIONS: process.env.GITHUB_ACTIONS === 'true'  // GitHub Actionsで実行中か
};

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(CONFIG.IMAGES_DIR)) {
    fs.mkdirSync(CONFIG.IMAGES_DIR, { recursive: true });
    console.log(`Created directory: ${CONFIG.IMAGES_DIR}`);
}

// ユーティリティ関数
const sleep = promisify(setTimeout);

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
        'image/heif': 'heif',
        'image/heic': 'heic'
    };
    return mimeToExt[contentType] || 'jpg';
}

// プログレス表示
class ProgressTracker {
    constructor(total) {
        this.total = total;
        this.completed = 0;
        this.failed = 0;
        this.skipped = 0;
        this.startTime = Date.now();
    }

    update(type = 'completed') {
        this[type]++;
        this.display();
    }

    display() {
        const progress = this.completed + this.failed + this.skipped;
        const percentage = Math.round((progress / this.total) * 100);
        const elapsed = Math.round((Date.now() - this.startTime) / 1000);
        
        if (CONFIG.GITHUB_ACTIONS) {
            // GitHub Actions用の出力
            console.log(`::group::Progress: ${percentage}% (${progress}/${this.total})`);
            console.log(`Completed: ${this.completed}, Failed: ${this.failed}, Skipped: ${this.skipped}`);
            console.log(`Elapsed time: ${elapsed}s`);
            console.log('::endgroup::');
        } else {
            // 通常のコンソール出力
            const progressBar = this.getProgressBar(percentage);
            const statusLine = `\rProgress: ${progressBar} ${percentage}% [${progress}/${this.total}] ` +
                `✓${this.completed} ✗${this.failed} ⏭${this.skipped} ` +
                `Time: ${elapsed}s`;
            
            // TTY環境でのみクリアラインを使用
            if (process.stdout.isTTY) {
                process.stdout.clearLine(0);
                process.stdout.cursorTo(0);
                process.stdout.write(statusLine);
            } else {
                // 非TTY環境では単純に出力
                if (progress % 10 === 0 || progress === this.total) {
                    console.log(statusLine.substring(1)); // \rを除去
                }
            }
        }
    }
    
    getProgressBar(percentage) {
        const width = 20;
        const filled = Math.round(width * percentage / 100);
        const empty = width - filled;
        return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
    }

    finish() {
        if (!CONFIG.GITHUB_ACTIONS) {
            process.stdout.write('\n');
        }
        console.log('\n=== Download Summary ===');
        console.log(`Total images: ${this.total}`);
        console.log(`Completed: ${this.completed}`);
        console.log(`Failed: ${this.failed}`);
        console.log(`Skipped: ${this.skipped}`);
        console.log(`Total time: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
    }
}

// 画像ダウンロード（リトライ機能付き）
async function downloadImageWithRetry(url, googleDriveId, retryCount = CONFIG.RETRY_COUNT) {
    for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
            return await downloadImage(url, googleDriveId);
        } catch (error) {
            if (attempt === retryCount) {
                throw error;
            }
            if (CONFIG.GITHUB_ACTIONS) {
                console.log(`::warning::Retry attempt ${attempt}/${retryCount} for ${googleDriveId}`);
            }
            await sleep(CONFIG.RETRY_DELAY * attempt);
        }
    }
}

// Google Drive URLから画像をダウンロード
function downloadImage(url, googleDriveId) {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(CONFIG.IMAGES_DIR, `${googleDriveId}.tmp`);
        const file = fs.createWriteStream(tempFilePath);

        const handleResponse = (response) => {
            const contentType = response.headers['content-type'];
            const extension = getExtensionFromContentType(contentType);
            const finalFilename = `${googleDriveId}.${extension}`;
            const finalFilePath = path.join(CONFIG.IMAGES_DIR, finalFilename);

            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                // 正しい拡張子でリネーム
                fs.renameSync(tempFilePath, finalFilePath);
                resolve(finalFilename);
            });

            file.on('error', (err) => {
                fs.unlink(tempFilePath, () => {});
                reject(err);
            });
        };

        https.get(url, (response) => {
            // リダイレクトを処理
            if (response.statusCode === 302 || response.statusCode === 301) {
                https.get(response.headers.location, handleResponse).on('error', (err) => {
                    fs.unlink(tempFilePath, () => {});
                    reject(err);
                });
            } else if (response.statusCode === 200) {
                handleResponse(response);
            } else {
                file.close();
                fs.unlink(tempFilePath, () => {});
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err) => {
            fs.unlink(tempFilePath, () => {});
            reject(err);
        });
    });
}

// 画像ダウンロードタスク
async function createDownloadTask(imageInfo, progress) {
    const { url, mimeType, memberName, photoType, googleDriveId } = imageInfo;
    
    try {
        // 既存ファイルをチェック
        if (CONFIG.SKIP_EXISTING) {
            const files = fs.readdirSync(CONFIG.IMAGES_DIR);
            if (files.some(f => f.startsWith(googleDriveId))) {
                progress.update('skipped');
                return { status: 'skipped', googleDriveId };
            }
        }

        const filename = await downloadImageWithRetry(url, googleDriveId);
        progress.update('completed');
        return { status: 'success', filename, googleDriveId };
    } catch (error) {
        progress.update('failed');
        if (CONFIG.GITHUB_ACTIONS) {
            console.log(`::error::Failed to download ${memberName} ${photoType}: ${error.message}`);
        }
        return { status: 'failed', error: error.message, googleDriveId };
    }
}

// 並列ダウンロード実行
async function downloadImagesInParallel(downloadTasks, progress) {
    const results = [];
    
    for (let i = 0; i < downloadTasks.length; i += CONFIG.CONCURRENT_DOWNLOADS) {
        const batch = downloadTasks.slice(i, i + CONFIG.CONCURRENT_DOWNLOADS);
        const batchResults = await Promise.all(
            batch.map(task => createDownloadTask(task, progress))
        );
        results.push(...batchResults);
    }
    
    return results;
}

// メインの処理
async function main() {
    try {
        console.log('=== Club TRIAX Image Downloader ===');
        console.log(`API URL: ${CONFIG.API_URL}`);
        console.log(`Output directory: ${CONFIG.IMAGES_DIR}`);
        console.log(`Skip existing files: ${CONFIG.SKIP_EXISTING}`);
        console.log(`Concurrent downloads: ${CONFIG.CONCURRENT_DOWNLOADS}`);
        console.log('');

        // Roster APIからデータを取得
        console.log('Fetching roster data...');
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch API: ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`Found ${data.members.length} members in roster`);

        // ダウンロードタスクを作成
        const downloadTasks = [];
        
        for (const member of data.members) {
            const memberInfo = `${member.name.default}${member.jersey ? ` (#${member.jersey})` : ''}`;
            
            // serious画像
            if (member.photos && member.photos.serious) {
                const seriousUrl = member.photos.serious.url || member.photos.serious;
                const seriousMimeType = member.photos.serious.mime_type;
                const googleDriveId = extractGoogleDriveId(seriousUrl);
                
                if (googleDriveId) {
                    downloadTasks.push({
                        url: seriousUrl,
                        mimeType: seriousMimeType,
                        memberName: memberInfo,
                        photoType: 'serious',
                        googleDriveId
                    });
                }
            }
            
            // casual画像
            if (member.photos && member.photos.casual && Array.isArray(member.photos.casual)) {
                member.photos.casual.forEach((casual, index) => {
                    const casualUrl = casual.url || casual;
                    const casualMimeType = casual.mime_type;
                    const googleDriveId = extractGoogleDriveId(casualUrl);
                    
                    if (googleDriveId) {
                        downloadTasks.push({
                            url: casualUrl,
                            mimeType: casualMimeType,
                            memberName: memberInfo,
                            photoType: `casual-${index + 1}`,
                            googleDriveId
                        });
                    }
                });
            }
        }

        console.log(`Total images to process: ${downloadTasks.length}`);
        console.log('');

        // プログレストラッカーを初期化
        const progress = new ProgressTracker(downloadTasks.length);

        // 並列ダウンロード実行
        console.log('Starting downloads...');
        const results = await downloadImagesInParallel(downloadTasks, progress);
        
        // 完了
        progress.finish();

        // ファイル統計
        const files = fs.readdirSync(CONFIG.IMAGES_DIR);
        const stats = {
            total: files.length,
            jpg: files.filter(f => f.endsWith('.jpg')).length,
            png: files.filter(f => f.endsWith('.png')).length,
            other: files.filter(f => !f.endsWith('.jpg') && !f.endsWith('.png')).length
        };

        console.log('\n=== File Statistics ===');
        console.log(`Total files: ${stats.total}`);
        console.log(`JPG: ${stats.jpg}`);
        console.log(`PNG: ${stats.png}`);
        if (stats.other > 0) {
            console.log(`Other: ${stats.other}`);
        }

        // 失敗したダウンロードをリスト
        const failed = results.filter(r => r.status === 'failed');
        if (failed.length > 0) {
            console.log('\n=== Failed Downloads ===');
            failed.forEach(f => console.log(`- ${f.googleDriveId}: ${f.error}`));
            process.exit(1);
        }

        console.log('\n✅ All downloads completed successfully!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (CONFIG.GITHUB_ACTIONS) {
            console.log(`::error::${error.message}`);
        }
        process.exit(1);
    }
}

// スクリプトを実行
if (require.main === module) {
    main();
}