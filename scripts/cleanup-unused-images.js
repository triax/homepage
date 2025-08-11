#!/usr/bin/env node

/**
 * Club TRIAX 不要画像クリーンアップスクリプト
 * 
 * 【概要】
 * Roster API に存在しない画像ファイルを docs/assets/members/ から削除します。
 * メンバーが退団したり、画像が更新された際に残る不要なファイルをクリーンアップします。
 * デフォルトでは dry-run モードで動作し、実際の削除は行いません。
 * 
 * 【主な機能】
 * - Roster APIと実際のファイルを比較
 * - APIに存在しない画像を特定
 * - Dry-runモード（デフォルト）で削除対象を確認
 * - 実際の削除（--forceオプション使用時）
 * - インタラクティブモード（削除前に確認）
 * - 削除されるファイルのサイズ計算
 * 
 * 【使い方】
 * ```bash
 * # Dry-runモード（削除対象を確認するだけ）
 * npm run img:cleanup
 * npm run img:cleanup:dry
 * node scripts/cleanup-unused-images.js
 * 
 * # 実際に削除（確認なし）
 * npm run img:cleanup:force
 * node scripts/cleanup-unused-images.js --force
 * 
 * # 実際に削除（確認あり）
 * npm run img:cleanup:interactive
 * node scripts/cleanup-unused-images.js --force --interactive
 * 
 * # 詳細ログ付きで実行
 * node scripts/cleanup-unused-images.js --force --verbose
 * 
 * # ヘルプを表示
 * node scripts/cleanup-unused-images.js --help
 * ```
 * 
 * 【コマンドラインオプション】
 * - --force: 実際にファイルを削除（デフォルトはdry-run）
 * - --interactive: 削除前に確認プロンプトを表示
 * - --verbose: 詳細なログを表示
 * - --help: ヘルプメッセージを表示
 * 
 * 【安全性】
 * - デフォルトはdry-runモードで、実際の削除は行わない
 * - --forceオプションを明示的に指定した場合のみ削除実行
 * - --interactiveオプションで削除前に確認可能
 * 
 * 【出力内容】
 * - 削除対象のファイル数とリスト
 * - 各ファイルのサイズ
 * - 合計サイズ（解放される容量）
 * - 実行結果（成功/失敗）
 * 
 * 【関連スクリプト】
 * - check-image-sync.js: 同期状態の確認
 * - download-all-images.js --sync: ダウンロードと同時にクリーンアップ
 * 
 * 【依存関係】
 * check-image-sync.js の関数を利用して同期状態を分析
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// 同期チェックスクリプトの関数を使用
const {
    fetchRosterData,
    collectExpectedIds,
    collectActualIds,
    analyzeDifferences
} = require('./check-image-sync');

const CONFIG = {
    IMAGES_DIR: path.join(__dirname, '..', 'docs', 'assets', 'members'),
    DRY_RUN: !process.argv.includes('--force'),
    INTERACTIVE: process.argv.includes('--interactive'),
    VERBOSE: process.argv.includes('--verbose')
};

// バイト数を人間が読みやすい形式に変換
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ユーザーに確認を求める
function askQuestion(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}

// 削除処理
async function deleteFiles(files) {
    const results = {
        deleted: [],
        failed: [],
        totalSize: 0
    };
    
    for (const file of files) {
        try {
            const stats = fs.statSync(file.fullPath);
            
            if (CONFIG.DRY_RUN) {
                // Dry-runモード：実際には削除しない
                if (CONFIG.VERBOSE) {
                    console.log(`  [DRY-RUN] Would delete: ${file.filename} (${formatBytes(stats.size)})`);
                }
                results.deleted.push(file);
                results.totalSize += stats.size;
            } else {
                // 実際に削除
                fs.unlinkSync(file.fullPath);
                if (CONFIG.VERBOSE) {
                    console.log(`  ✓ Deleted: ${file.filename} (${formatBytes(stats.size)})`);
                }
                results.deleted.push(file);
                results.totalSize += stats.size;
            }
        } catch (error) {
            results.failed.push({
                ...file,
                error: error.message
            });
            if (CONFIG.VERBOSE) {
                console.log(`  ✗ Failed to delete ${file.filename}: ${error.message}`);
            }
        }
    }
    
    return results;
}

// メイン処理
async function main() {
    try {
        console.log('=== Club TRIAX 不要画像クリーンアップ ===\n');
        
        // モード表示
        if (CONFIG.DRY_RUN) {
            console.log('🔍 DRY-RUNモード: 実際の削除は行いません');
            console.log('   実際に削除するには --force オプションを使用してください\n');
        } else {
            console.log('⚠️  削除モード: ファイルが実際に削除されます\n');
        }
        
        // APIデータを取得
        console.log('Roster APIからデータを取得中...');
        const roster = await fetchRosterData();
        console.log(`✓ ${roster.members.length}名のメンバー情報を取得\n`);
        
        // 期待される画像IDを収集
        const { expectedIds, memberImageMap } = collectExpectedIds(roster);
        
        // 実際のファイルからIDを収集
        const { actualIds, fileMap } = collectActualIds();
        
        // 差分を分析
        const { extraInFiles } = analyzeDifferences(
            expectedIds, 
            actualIds, 
            memberImageMap, 
            fileMap
        );
        
        // 削除対象がない場合
        if (extraInFiles.length === 0) {
            console.log('✅ 削除対象のファイルはありません。');
            console.log('   すべての画像はRoster APIと同期されています。');
            return;
        }
        
        // 削除対象を表示
        console.log(`削除対象: ${extraInFiles.length}個のファイル\n`);
        
        let totalSize = 0;
        extraInFiles.forEach(file => {
            const stats = fs.statSync(file.fullPath);
            totalSize += stats.size;
            console.log(`  • ${file.filename} (${formatBytes(stats.size)})`);
        });
        
        console.log(`\n合計サイズ: ${formatBytes(totalSize)}\n`);
        
        // インタラクティブモードで確認
        if (CONFIG.INTERACTIVE && !CONFIG.DRY_RUN) {
            const answer = await askQuestion('これらのファイルを削除しますか？ (y/N): ');
            if (answer.toLowerCase() !== 'y') {
                console.log('キャンセルしました。');
                return;
            }
        }
        
        // 削除実行
        console.log(CONFIG.DRY_RUN ? '\n--- Dry-run結果 ---' : '\n--- 削除実行中 ---');
        const results = await deleteFiles(extraInFiles);
        
        // 結果表示
        console.log('\n=== 実行結果 ===');
        
        if (CONFIG.DRY_RUN) {
            console.log(`削除対象ファイル数: ${results.deleted.length}`);
            console.log(`削除対象の合計サイズ: ${formatBytes(results.totalSize)}`);
            
            if (results.deleted.length > 0) {
                console.log('\n実際に削除するには以下のコマンドを実行してください:');
                console.log('  npm run img:cleanup:force');
                console.log('または');
                console.log('  node scripts/cleanup-unused-images.js --force');
            }
        } else {
            console.log(`✅ 削除成功: ${results.deleted.length}個のファイル`);
            console.log(`   解放された容量: ${formatBytes(results.totalSize)}`);
            
            if (results.failed.length > 0) {
                console.log(`\n⚠️  削除失敗: ${results.failed.length}個のファイル`);
                results.failed.forEach(file => {
                    console.log(`  • ${file.filename}: ${file.error}`);
                });
            }
        }
        
        // GitHub Actions出力
        if (process.env.GITHUB_ACTIONS === 'true') {
            console.log(`::set-output name=deleted_count::${results.deleted.length}`);
            console.log(`::set-output name=deleted_size::${results.totalSize}`);
            if (results.failed.length > 0) {
                console.log(`::warning::Failed to delete ${results.failed.length} files`);
            }
        }
        
    } catch (error) {
        console.error('❌ エラー:', error.message);
        process.exit(1);
    }
}

// ヘルプメッセージ
function showHelp() {
    console.log(`
Club TRIAX 不要画像クリーンアップツール

使用方法:
  node scripts/cleanup-unused-images.js [オプション]

オプション:
  --force        実際にファイルを削除します（デフォルトはdry-run）
  --interactive  削除前に確認プロンプトを表示します
  --verbose      詳細なログを表示します
  --help         このヘルプを表示します

例:
  # Dry-runモードで削除対象を確認
  node scripts/cleanup-unused-images.js

  # 実際に削除（確認あり）
  node scripts/cleanup-unused-images.js --force --interactive

  # 実際に削除（確認なし、詳細ログ付き）
  node scripts/cleanup-unused-images.js --force --verbose
`);
}

// 直接実行された場合
if (require.main === module) {
    if (process.argv.includes('--help')) {
        showHelp();
    } else {
        main();
    }
}