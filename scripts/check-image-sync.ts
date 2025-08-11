#!/usr/bin/env npx tsx

/**
 * Club TRIAX 画像同期チェックスクリプト
 *
 * 【概要】
 * ローカルの roster.json と docs/assets/members/ ディレクトリ内の画像ファイルを比較し、
 * 同期状態を確認します。不足している画像と余分な画像を特定して報告します。
 *
 * 【主な機能】
 * - ローカルのroster.jsonから期待される画像リストを取得
 * - 実際のファイルシステム上の画像と比較
 * - 不足している画像の詳細表示（メンバー名、画像タイプ）
 * - 余分な画像の詳細表示（ファイル名、サイズ）
 * - 同期率の計算と統計情報の表示
 *
 * 【使い方】
 * ```bash
 * # 同期状態をチェック
 * npm run img:check
 * npx tsx scripts/check-image-sync.ts
 * ```
 *
 * 【出力内容】
 * 1. APIから取得したメンバー数
 * 2. 期待される画像数 vs 実際のファイル数
 * 3. 不足している画像のリスト
 *    - メンバー名（背番号）
 *    - 画像タイプ（serious/casual）
 *    - Google Drive ID
 * 4. 余分な画像のリスト
 *    - ファイル名
 *    - ファイルサイズ
 * 5. 統計情報
 *    - 総メンバー数
 *    - 写真を持つメンバー数
 *    - 同期率
 *
 * 【終了コード】
 * - 0: 完全に同期されている
 * - 1: 同期が必要（不足または余分な画像がある）
 *
 * 【関連スクリプト】
 * - download-all-images.ts: 不足している画像をダウンロード
 * - cleanup-unused-images.ts: 余分な画像を削除
 *
 * 【エクスポート関数】
 * 他のスクリプトから以下の関数を利用可能：
 * - fetchRosterData(): ローカルのroster.jsonからデータを取得
 * - collectExpectedIds(roster): 期待される画像IDを収集
 * - collectActualIds(): 実際のファイルからIDを収集
 * - analyzeDifferences(): 差分を分析
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// TypeScript用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  IMAGES_DIR: path.join(__dirname, '..', 'docs', 'assets', 'members'),
  ROSTER_JSON_PATH: path.join(__dirname, '..', 'docs', 'assets', 'roster.json'), // ローカルのroster.json
};

// 型定義
interface Photo {
  url?: string;
  caption?: string;
}

interface Member {
  name: {
    default: string;
    [key: string]: string;
  };
  jersey?: number;
  photos?: {
    serious?: Photo | string;
    casual?: (Photo | string)[];
  };
}

interface Roster {
  members: Member[];
}

interface MemberImageInfo {
  member: string;
  type: string;
}

interface MissingFile {
  id: string;
  member: string;
  type: string;
}

interface ExtraFile {
  id: string;
  filename: string;
  fullPath: string;
}

// Google Drive URLからIDを抽出
function extractGoogleDriveId(url: string): string | null {
  const match = url.match(/id=([^&]+)/);
  return match ? match[1] : null;
}

// ローカルのroster.jsonからデータを取得
export function fetchRosterData(): Promise<Roster> {
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(CONFIG.ROSTER_JSON_PATH)) {
        reject(new Error(`roster.json not found at ${CONFIG.ROSTER_JSON_PATH}. Run 'npm run roster:download' first.`));
        return;
      }
      const data = fs.readFileSync(CONFIG.ROSTER_JSON_PATH, 'utf-8');
      resolve(JSON.parse(data));
    } catch (error) {
      reject(error);
    }
  });
}

// APIから期待される画像IDを収集
export function collectExpectedIds(roster: Roster): {
  expectedIds: Set<string>;
  memberImageMap: Record<string, MemberImageInfo>;
} {
  const expectedIds = new Set<string>();
  const memberImageMap: Record<string, MemberImageInfo> = {};

  roster.members.forEach((member) => {
    if (!member.photos) return;

    const memberInfo = `${member.name.default}${member.jersey ? ` (#${member.jersey})` : ''}`;

    // serious画像
    if (member.photos.serious) {
      const photo = member.photos.serious;
      const url = typeof photo === 'string' ? photo : photo.url;
      if (url) {
        const id = extractGoogleDriveId(url);
        if (id) {
          expectedIds.add(id);
          memberImageMap[id] = {
            member: memberInfo,
            type: 'serious',
          };
        }
      }
    }

    // casual画像
    if (member.photos.casual && Array.isArray(member.photos.casual)) {
      member.photos.casual.forEach((casual, index) => {
        const url = typeof casual === 'string' ? casual : casual.url;
        if (url) {
          const id = extractGoogleDriveId(url);
          if (id) {
            expectedIds.add(id);
            memberImageMap[id] = {
              member: memberInfo,
              type: `casual-${index + 1}`,
            };
          }
        }
      });
    }
  });

  return { expectedIds, memberImageMap };
}

// 実際のファイルからIDを収集
export function collectActualIds(): { actualIds: Set<string>; fileMap: Record<string, string> } {
  const actualIds = new Set<string>();
  const fileMap: Record<string, string> = {};

  if (!fs.existsSync(CONFIG.IMAGES_DIR)) {
    console.error(`ディレクトリが存在しません: ${CONFIG.IMAGES_DIR}`);
    return { actualIds, fileMap };
  }

  const files = fs.readdirSync(CONFIG.IMAGES_DIR);

  files.forEach((file) => {
    // 画像ファイルのみを対象
    if (/\.(jpg|png|gif|webp|svg|heif|heic)$/i.test(file)) {
      const id = file.replace(/\.(jpg|png|gif|webp|svg|heif|heic)$/i, '');
      actualIds.add(id);
      fileMap[id] = file;
    }
  });

  return { actualIds, fileMap };
}

// 差分を分析
export function analyzeDifferences(
  expectedIds: Set<string>,
  actualIds: Set<string>,
  memberImageMap: Record<string, MemberImageInfo>,
  fileMap: Record<string, string>
): { missingInFiles: MissingFile[]; extraInFiles: ExtraFile[] } {
  const missingInFiles: MissingFile[] = [];
  const extraInFiles: ExtraFile[] = [];

  // 不足している画像を特定
  expectedIds.forEach((id) => {
    if (!actualIds.has(id)) {
      missingInFiles.push({
        id,
        ...memberImageMap[id],
      });
    }
  });

  // 余分な画像を特定
  actualIds.forEach((id) => {
    if (!expectedIds.has(id)) {
      extraInFiles.push({
        id,
        filename: fileMap[id],
        fullPath: path.join(CONFIG.IMAGES_DIR, fileMap[id]),
      });
    }
  });

  return { missingInFiles, extraInFiles };
}

// ファイルサイズの合計を計算
function calculateTotalSize(files: ExtraFile[]): number {
  let totalSize = 0;

  files.forEach((file) => {
    if (file.fullPath && fs.existsSync(file.fullPath)) {
      const stats = fs.statSync(file.fullPath);
      totalSize += stats.size;
    }
  });

  return totalSize;
}

// バイト数を人間が読みやすい形式に変換
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// メイン処理
async function main(): Promise<void> {
  try {
    console.log('=== Club TRIAX 画像同期チェック ===\n');

    // ローカルのroster.jsonからデータを取得
    console.log('ローカルのroster.jsonからデータを取得中...');
    const roster = await fetchRosterData();
    console.log(`✓ ${roster.members.length}名のメンバー情報を取得\n`);

    // 期待される画像IDを収集
    const { expectedIds, memberImageMap } = collectExpectedIds(roster);
    console.log(`roster.jsonから期待される画像数: ${expectedIds.size}`);

    // 実際のファイルからIDを収集
    const { actualIds, fileMap } = collectActualIds();
    console.log(`実際のファイル数: ${actualIds.size}\n`);

    // 差分を分析
    const { missingInFiles, extraInFiles } = analyzeDifferences(
      expectedIds,
      actualIds,
      memberImageMap,
      fileMap
    );

    // 結果を表示
    console.log('=== 分析結果 ===\n');

    // 同期状態のサマリ
    if (missingInFiles.length === 0 && extraInFiles.length === 0) {
      console.log('✅ 完全に同期されています！');
    } else {
      if (missingInFiles.length > 0) {
        console.log(`⚠️  不足している画像: ${missingInFiles.length}個`);
      }
      if (extraInFiles.length > 0) {
        console.log(`⚠️  余分な画像: ${extraInFiles.length}個`);
      }
    }

    // 不足している画像の詳細
    if (missingInFiles.length > 0) {
      console.log('\n--- 不足している画像 ---');
      missingInFiles.forEach((item) => {
        console.log(`  • ${item.member} (${item.type})`);
        console.log(`    ID: ${item.id}`);
      });
      console.log('\n💡 ヒント: npm run img:download を実行して不足画像をダウンロードできます');
    }

    // 余分な画像の詳細
    if (extraInFiles.length > 0) {
      const totalSize = calculateTotalSize(extraInFiles);
      console.log('\n--- 余分な画像 ---');
      console.log(`合計サイズ: ${formatBytes(totalSize)}\n`);

      extraInFiles.forEach((item) => {
        const stats = fs.statSync(item.fullPath);
        console.log(`  • ${item.filename} (${formatBytes(stats.size)})`);
      });

      console.log('\n💡 ヒント: npm run img:cleanup を実行して余分な画像を削除できます');
    }

    // 統計情報
    console.log('\n=== 統計情報 ===');
    console.log(`総メンバー数: ${roster.members.length}`);
    console.log(`写真を持つメンバー: ${roster.members.filter((m) => m.photos).length}`);
    console.log(`期待される画像総数: ${expectedIds.size}`);
    console.log(`実際の画像総数: ${actualIds.size}`);
    console.log(`同期率: ${Math.round((actualIds.size / expectedIds.size) * 100)}%`);

    // 終了コードを設定
    if (missingInFiles.length > 0 || extraInFiles.length > 0) {
      process.exit(1); // 同期が必要な場合は1を返す
    }
  } catch (error) {
    console.error('❌ エラー:', (error as Error).message);
    process.exit(1);
  }
}

// 直接実行された場合
if (import.meta.url === `file://${__filename}`) {
  main();
}
