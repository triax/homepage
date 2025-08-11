#!/usr/bin/env npx tsx

/**
 * Club TRIAX 画像マッピング作成スクリプト
 *
 * 【概要】
 * docs/assets/members/ ディレクトリ内の画像ファイルをスキャンし、
 * Google Drive ID とファイル名のマッピングを JSON ファイルとして出力します。
 * このマッピングは、画像のロードやデバッグ時に役立ちます。
 *
 * 【主な機能】
 * - 画像ディレクトリ内のすべてのファイルをスキャン
 * - Google Drive ID（ファイル名から拡張子を除いた部分）を抽出
 * - ID とファイル名のマッピングをJSON形式で保存
 * - マッピングのサンプルをコンソールに表示
 *
 * 【使い方】
 * ```bash
 * # マッピングファイルを作成
 * npx tsx scripts/create-image-mapping.ts
 * ```
 *
 * 【出力ファイル】
 * docs/image-mapping.json に以下の形式で保存：
 * ```json
 * {
 *   "1RkyEPOq0CELzOCIICoanFWrFYnWD_bZ5": "1RkyEPOq0CELzOCIICoanFWrFYnWD_bZ5.jpg",
 *   "1peoJ3_pSss3ydbSI3Kh0Env0AwuL4FEC": "1peoJ3_pSss3ydbSI3Kh0Env0AwuL4FEC.png",
 *   ...
 * }
 * ```
 *
 * 【用途】
 * - フロントエンドでGoogle Drive IDから実際のファイル名を取得
 * - 画像ファイルの拡張子を動的に判定
 * - デバッグ時の画像ファイル確認
 * - 画像リソースの管理
 *
 * 【注意事項】
 * - .tmpファイルは除外される
 * - ファイル名の最初のドット(.)より前をIDとして使用
 * - 画像が追加/削除された後は再実行が必要
 *
 * 【関連ファイル】
 * - docs/assets/members/: 画像ファイルの格納ディレクトリ
 * - docs/image-mapping.json: 出力されるマッピングファイル
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// TypeScript用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IMAGES_DIR = path.join(__dirname, '..', 'docs', 'assets', 'members');

// 型定義
type ImageMapping = Record<string, string>;

// 画像ディレクトリからマッピングを作成
function createImageMapping(): ImageMapping {
  const files = fs.readdirSync(IMAGES_DIR);
  const imageMapping: ImageMapping = {};

  files.forEach((file) => {
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
function main(): void {
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
}

// 直接実行された場合
if (import.meta.url === `file://${__filename}`) {
  main();
}
