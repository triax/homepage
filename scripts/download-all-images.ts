#!/usr/bin/env npx tsx

/**
 * Club TRIAX メンバー画像ダウンロードスクリプト
 * 
 * 【概要】
 * Roster API (https://github.com/triax/roster-api) から
 * メンバーの画像をダウンロードして docs/assets/members/ に保存します。
 * Google Drive の画像IDをファイル名として使用し、適切な拡張子を付与します。
 * 
 * 【主な機能】
 * - Roster APIからすべてのメンバー画像（serious/casual）をダウンロード
 * - 並列処理による高速ダウンロード（デフォルト5並列）
 * - リトライ機能（デフォルト3回）
 * - プログレスバー表示
 * - 同期モード：不要な画像の自動削除
 * - GitHub Actions対応
 * 
 * 【使い方】
 * ```bash
 * # 基本的な使用（既存ファイルはスキップ）
 * npm run img:download
 * npx tsx scripts/download-all-images.ts
 * 
 * # すべての画像を再ダウンロード
 * npm run img:download:force
 * SKIP_EXISTING=false npx tsx scripts/download-all-images.ts
 * 
 * # 同期モード（ダウンロード＋不要ファイル削除）
 * npm run img:sync
 * npx tsx scripts/download-all-images.ts --sync
 * 
 * # 同期モードのテスト実行（削除はしない）
 * npm run img:sync:dry
 * npx tsx scripts/download-all-images.ts --sync --dry-run
 * ```
 * 
 * 【環境変数】
 * - SKIP_EXISTING: 'false' に設定すると既存ファイルも再ダウンロード（デフォルト: true）
 * - GITHUB_ACTIONS: 'true' の場合、GitHub Actions用の出力形式を使用
 * 
 * 【コマンドラインオプション】
 * - --sync: 同期モードを有効化（不要な画像を削除）
 * - --dry-run: 削除処理をシミュレート（実際には削除しない）
 * 
 * 【出力ファイル】
 * docs/assets/members/ ディレクトリに以下の形式で保存：
 * - ファイル名: {Google Drive ID}.{拡張子}
 * - 例: 1RkyEPOq0CELzOCIICoanFWrFYnWD_bZ5.jpg
 * 
 * 【エラー処理】
 * - ダウンロード失敗時は3回までリトライ
 * - 失敗した画像はリストアップして最後に表示
 * - 1つでも失敗があれば終了コード1で終了
 */

import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

// TypeScript用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const CONFIG = {
    IMAGES_DIR: path.join(__dirname, '..', 'docs', 'assets', 'members'),
    API_URL: 'https://raw.githubusercontent.com/triax/roster-api/refs/heads/main/data/roster.json',
    CONCURRENT_DOWNLOADS: 5,  // 同時ダウンロード数
    RETRY_COUNT: 3,          // リトライ回数
    RETRY_DELAY: 1000,       // リトライ間隔（ミリ秒）
    SKIP_EXISTING: process.env.SKIP_EXISTING !== 'false',  // 既存ファイルをスキップするか
    GITHUB_ACTIONS: process.env.GITHUB_ACTIONS === 'true',  // GitHub Actionsで実行中か
    SYNC_MODE: process.argv.includes('--sync'),  // 同期モード（不要なファイルを削除）
    DRY_RUN: process.argv.includes('--dry-run')  // Dry-runモード
};

// 型定義
interface Photo {
    url?: string;
    mime_type?: string;
    caption?: string;
}

interface Member {
    name: {
        default: string;
    };
    jersey?: number;
    photos?: {
        serious?: Photo | string;
        casual?: (Photo | string)[];
    };
}

interface RosterData {
    members: Member[];
}

interface DownloadTask {
    url: string;
    mimeType?: string;
    memberName: string;
    photoType: string;
    googleDriveId: string;
}

interface DownloadResult {
    status: 'success' | 'failed' | 'skipped';
    filename?: string;
    googleDriveId: string;
    error?: string;
}

interface CleanupResult {
    deleted: number;
    totalSize: number;
}

// ディレクトリが存在しない場合は作成
if (!fs.existsSync(CONFIG.IMAGES_DIR)) {
    fs.mkdirSync(CONFIG.IMAGES_DIR, { recursive: true });
    console.log(`Created directory: ${CONFIG.IMAGES_DIR}`);
}

// ユーティリティ関数
const sleep = promisify(setTimeout);

// Google Drive URLからIDを抽出
function extractGoogleDriveId(url: string): string | null {
    const match = url.match(/id=([^&]+)/);
    return match ? match[1] : null;
}

// Content-Typeから拡張子を取得
function getExtensionFromContentType(contentType: string): string {
    const mimeToExt: Record<string, string> = {
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
    private total: number;
    private completed: number = 0;
    private failed: number = 0;
    private skipped: number = 0;
    private startTime: number;

    constructor(total: number) {
        this.total = total;
        this.startTime = Date.now();
    }

    update(type: 'completed' | 'failed' | 'skipped' = 'completed'): void {
        this[type]++;
        this.display();
    }

    display(): void {
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
    
    private getProgressBar(percentage: number): string {
        const width = 20;
        const filled = Math.round(width * percentage / 100);
        const empty = width - filled;
        return '[' + '█'.repeat(filled) + '░'.repeat(empty) + ']';
    }

    finish(): void {
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
async function downloadImageWithRetry(url: string, googleDriveId: string, retryCount: number = CONFIG.RETRY_COUNT): Promise<string> {
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
    throw new Error('Download failed after retries');
}

// Google Drive URLから画像をダウンロード
function downloadImage(url: string, googleDriveId: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const tempFilePath = path.join(CONFIG.IMAGES_DIR, `${googleDriveId}.tmp`);
        const file = fs.createWriteStream(tempFilePath);

        const handleResponse = (response: any) => {
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

            file.on('error', (err: Error) => {
                fs.unlink(tempFilePath, () => {});
                reject(err);
            });
        };

        https.get(url, (response) => {
            // リダイレクトを処理
            if (response.statusCode === 302 || response.statusCode === 301) {
                const location = response.headers.location;
                if (location) {
                    https.get(location, handleResponse).on('error', (err: Error) => {
                        fs.unlink(tempFilePath, () => {});
                        reject(err);
                    });
                } else {
                    reject(new Error('Redirect location not found'));
                }
            } else if (response.statusCode === 200) {
                handleResponse(response);
            } else {
                file.close();
                fs.unlink(tempFilePath, () => {});
                reject(new Error(`HTTP ${response.statusCode}`));
            }
        }).on('error', (err: Error) => {
            fs.unlink(tempFilePath, () => {});
            reject(err);
        });
    });
}

// 画像ダウンロードタスク
async function createDownloadTask(imageInfo: DownloadTask, progress: ProgressTracker): Promise<DownloadResult> {
    const { url, memberName, photoType, googleDriveId } = imageInfo;
    
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
            console.log(`::error::Failed to download ${memberName} ${photoType}: ${(error as Error).message}`);
        }
        return { status: 'failed', error: (error as Error).message, googleDriveId };
    }
}

// 並列ダウンロード実行
async function downloadImagesInParallel(downloadTasks: DownloadTask[], progress: ProgressTracker): Promise<DownloadResult[]> {
    const results: DownloadResult[] = [];
    
    for (let i = 0; i < downloadTasks.length; i += CONFIG.CONCURRENT_DOWNLOADS) {
        const batch = downloadTasks.slice(i, i + CONFIG.CONCURRENT_DOWNLOADS);
        const batchResults = await Promise.all(
            batch.map(task => createDownloadTask(task, progress))
        );
        results.push(...batchResults);
    }
    
    return results;
}

// 同期モード：不要なファイルを削除
async function syncCleanup(expectedIds: Set<string>): Promise<CleanupResult> {
    const files = fs.readdirSync(CONFIG.IMAGES_DIR);
    const actualIds = new Set<string>();
    const filesToDelete: Array<{ filename: string; path: string }> = [];
    
    // 実際のファイルのIDを収集
    files.forEach(file => {
        if (/\.(jpg|png|gif|webp|svg|heif|heic)$/i.test(file)) {
            const id = file.replace(/\.(jpg|png|gif|webp|svg|heif|heic)$/i, '');
            actualIds.add(id);
            
            // APIに存在しないIDのファイルを削除対象に追加
            if (!expectedIds.has(id)) {
                filesToDelete.push({
                    filename: file,
                    path: path.join(CONFIG.IMAGES_DIR, file)
                });
            }
        }
    });
    
    if (filesToDelete.length === 0) {
        console.log('✅ No unused files to clean up');
        return { deleted: 0, totalSize: 0 };
    }
    
    console.log(`\n=== Sync Cleanup ===`);
    console.log(`Found ${filesToDelete.length} unused files`);
    
    let totalSize = 0;
    let deletedCount = 0;
    
    for (const file of filesToDelete) {
        try {
            const stats = fs.statSync(file.path);
            const size = stats.size;
            
            if (CONFIG.DRY_RUN) {
                console.log(`  [DRY-RUN] Would delete: ${file.filename} (${formatBytes(size)})`);
            } else {
                fs.unlinkSync(file.path);
                console.log(`  ✓ Deleted: ${file.filename} (${formatBytes(size)})`);
            }
            
            totalSize += size;
            deletedCount++;
        } catch (error) {
            console.log(`  ✗ Failed to delete ${file.filename}: ${(error as Error).message}`);
        }
    }
    
    console.log(`${CONFIG.DRY_RUN ? 'Would delete' : 'Deleted'} ${deletedCount} files (${formatBytes(totalSize)})`);
    
    return { deleted: deletedCount, totalSize };
}

// バイト数を人間が読みやすい形式に変換
function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// メインの処理
async function main(): Promise<void> {
    try {
        console.log('=== Club TRIAX Image Downloader ===');
        console.log(`API URL: ${CONFIG.API_URL}`);
        console.log(`Output directory: ${CONFIG.IMAGES_DIR}`);
        console.log(`Skip existing files: ${CONFIG.SKIP_EXISTING}`);
        console.log(`Concurrent downloads: ${CONFIG.CONCURRENT_DOWNLOADS}`);
        if (CONFIG.SYNC_MODE) {
            console.log(`Sync mode: ${CONFIG.SYNC_MODE} ${CONFIG.DRY_RUN ? '(dry-run)' : ''}`);
        }
        console.log('');

        // Roster APIからデータを取得
        console.log('Fetching roster data...');
        const response = await fetch(CONFIG.API_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch API: ${response.statusText}`);
        }
        const data: RosterData = await response.json();
        console.log(`Found ${data.members.length} members in roster`);

        // ダウンロードタスクを作成
        const downloadTasks: DownloadTask[] = [];
        
        for (const member of data.members) {
            const memberInfo = `${member.name.default}${member.jersey ? ` (#${member.jersey})` : ''}`;
            
            // serious画像
            if (member.photos?.serious) {
                const photo = member.photos.serious;
                const seriousUrl = typeof photo === 'string' ? photo : photo.url;
                const seriousMimeType = typeof photo === 'object' ? photo.mime_type : undefined;
                
                if (seriousUrl) {
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
            }
            
            // casual画像
            if (member.photos?.casual && Array.isArray(member.photos.casual)) {
                member.photos.casual.forEach((casual, index) => {
                    const casualUrl = typeof casual === 'string' ? casual : casual.url;
                    const casualMimeType = typeof casual === 'object' ? casual.mime_type : undefined;
                    
                    if (casualUrl) {
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
                    }
                });
            }
        }

        console.log(`Total images to process: ${downloadTasks.length}`);
        console.log('');

        // 期待されるIDのセットを作成（同期モード用）
        const expectedIds = new Set(downloadTasks.map(task => task.googleDriveId));

        // プログレストラッカーを初期化
        const progress = new ProgressTracker(downloadTasks.length);

        // 並列ダウンロード実行
        console.log('Starting downloads...');
        const results = await downloadImagesInParallel(downloadTasks, progress);
        
        // 完了
        progress.finish();
        
        // 同期モード：不要なファイルを削除
        if (CONFIG.SYNC_MODE) {
            const cleanupResult = await syncCleanup(expectedIds);
            if (cleanupResult.deleted > 0 && !CONFIG.DRY_RUN) {
                console.log(`\n✅ Sync complete: ${cleanupResult.deleted} unused files removed`);
            }
        }

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
        console.error('\n❌ Error:', (error as Error).message);
        if (CONFIG.GITHUB_ACTIONS) {
            console.log(`::error::${(error as Error).message}`);
        }
        process.exit(1);
    }
}

// スクリプトを実行
if (import.meta.url === `file://${__filename}`) {
    main();
}