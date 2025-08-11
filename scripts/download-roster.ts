#!/usr/bin/env tsx

/**
 * Roster APIから最新のroster.jsonをダウンロードしてローカルに保存するスクリプト
 *
 * 使用方法:
 *   npm run roster:download
 *   または
 *   npx tsx scripts/download-roster.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROSTER_API_URL = 'https://raw.githubusercontent.com/triax/roster-api/refs/heads/main/data/roster.json';
const OUTPUT_PATH = path.join(__dirname, '..', 'docs', 'assets', 'roster.json');

async function downloadRoster() {
  console.log('📥 Roster APIからroster.jsonをダウンロード中...');
  console.log(`   URL: ${ROSTER_API_URL}`);

  try {
    // Roster APIからデータを取得
    const response = await fetch(ROSTER_API_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch roster: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // 出力ディレクトリが存在することを確認
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // JSONファイルとして保存（整形済み）
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2));

    // 統計情報を表示
    const stats = {
      members: data.members?.length || 0,
      fileSize: fs.statSync(OUTPUT_PATH).size,
      timestamp: new Date().toISOString()
    };

    console.log('✅ roster.jsonのダウンロードが完了しました！');
    console.log(`   保存先: ${OUTPUT_PATH}`);
    console.log(`   メンバー数: ${stats.members}人`);
    console.log(`   ファイルサイズ: ${(stats.fileSize / 1024).toFixed(2)} KB`);
    console.log(`   更新日時: ${stats.timestamp}`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// メイン処理を実行
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadRoster();
}
