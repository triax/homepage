#!/usr/bin/env npx tsx

/**
 * Club TRIAX 画像表示チェックスクリプト（Playwright版）
 *
 * 【概要】
 * Playwright を使用して実際のWebページをブラウザで開き、
 * メンバーカードの画像が正しく表示されているかをチェックします。
 * ローカルサーバーが起動していることが前提です。
 *
 * 【主な機能】
 * - ローカルサーバー（http://localhost:8080）にアクセス
 * - メンバーカードの画像読み込み状態を確認
 * - 画像が正しく表示されているかチェック（naturalWidth/Height）
 * - 表示されていない画像のリストアップ
 * - ローカルのroster.jsonとの比較
 * - 背番号なしメンバーの確認
 *
 * 【前提条件】
 * - ローカルサーバーが起動していること
 *   ```bash
 *   npx http-server
 *   # または
 *   python3 -m http.server 8080
 *   ```
 * - Playwrightがインストールされていること
 *   ```bash
 *   npm install --save-dev playwright
 *   ```
 *
 * 【使い方】
 * ```bash
 * # ローカルサーバーを起動してから実行
 * npx tsx scripts/check-missing-images.ts
 * ```
 *
 * 【チェック内容】
 * 1. メンバーカードの総数
 * 2. 各カードの画像要素の存在
 * 3. 画像の読み込み状態（naturalWidth/Height）
 * 4. "No Image"画像の検出
 * 5. メンバー名とポジション情報
 *
 * 【出力内容】
 * - 正常に読み込まれた画像の数
 * - 読み込みに失敗した画像のリスト
 *   - メンバー名
 *   - ポジション
 *   - 画像のsrc属性
 * - ローカルのroster.jsonとの比較結果
 * - 背番号なしメンバーのリスト
 *
 * 【注意事項】
 * - ローカルサーバーが起動していないとエラーになる
 * - ページの構造（#members-container、.member-card）に依存
 * - 遅延読み込み対応のため、スクロールとウェイトを実行
 *
 * 【関連スクリプト】
 * - download-all-images.ts: 画像のダウンロード
 * - check-image-sync.ts: ファイルシステムレベルでの同期チェック
 *
 * 【返り値】
 * - missingImages: 表示されていない画像の配列
 * - loadedImages: 正常に表示された画像の配列
 * - apiData: ローカルのroster.jsonのデータ
 */

import { chromium, Browser, BrowserContext, Page, ElementHandle } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// TypeScript用の__dirname代替
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 設定
const CONFIG = {
  ROSTER_JSON_PATH: path.join(__dirname, '..', 'docs', 'assets', 'roster.json'),
};

// 型定義
interface ImageInfo {
  name: string;
  position: string;
  src: string;
  index?: number;
}

interface Member {
  name: {
    default: string;
  };
  position?: string;
  jersey?: number;
}

interface ApiData {
  members: Member[];
}

interface CheckResult {
  missingImages: ImageInfo[];
  loadedImages: ImageInfo[];
  apiData: ApiData;
}

async function checkMissingImages(): Promise<CheckResult> {
  const browser: Browser = await chromium.launch({ headless: true });
  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();

  // ローカルサーバーにアクセス
  await page.goto('http://localhost:8080');

  // ページが読み込まれるまで待機
  await page.waitForSelector('#members-container', { timeout: 10000 });

  // スクロールして遅延読み込みをトリガー
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  // 画像が読み込まれるまで少し待機
  await page.waitForTimeout(3000);

  // すべてのメンバーカードを取得
  const memberCards: ElementHandle[] = await page.$$('.member-card');
  console.log(`Total member cards found: ${memberCards.length}`);

  const missingImages: ImageInfo[] = [];
  const loadedImages: ImageInfo[] = [];

  // 各メンバーカードの画像をチェック
  for (let i = 0; i < memberCards.length; i++) {
    const card = memberCards[i];

    // メンバー名を取得
    const memberName = await card
      .$eval('h3', (el: Element) => el.textContent || 'Unknown')
      .catch(() => 'Unknown');
    const position = await card
      .$eval('.text-red-600', (el: Element) => el.textContent || 'Unknown')
      .catch(() => 'Unknown');

    // 画像要素を取得
    const img = await card.$('img');
    if (img) {
      const src = (await img.getAttribute('src')) || '';
      const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
      const naturalHeight = await img.evaluate((el: HTMLImageElement) => el.naturalHeight);

      // 画像が正しく読み込まれているかチェック
      if (naturalWidth === 0 || naturalHeight === 0 || src.includes('No Image')) {
        missingImages.push({
          name: memberName,
          position: position,
          src: src,
          index: i,
        });
      } else {
        loadedImages.push({
          name: memberName,
          position: position,
          src: src,
        });
      }
    }
  }

  console.log(`\nImages loaded successfully: ${loadedImages.length}`);
  console.log(`Images missing or failed to load: ${missingImages.length}`);

  if (missingImages.length > 0) {
    console.log('\nMembers with missing images:');
    missingImages.forEach((member) => {
      console.log(`  - ${member.name} (${member.position}) - src: ${member.src}`);
    });
  }

  // ローカルのroster.jsonと比較
  console.log('\nLoading roster data from local file...');
  if (!fs.existsSync(CONFIG.ROSTER_JSON_PATH)) {
    const errorMsg = `roster.json not found at ${CONFIG.ROSTER_JSON_PATH}.`;
    throw new Error(`${errorMsg} Run 'npm run roster:download' first.`);
  }
  const rosterContent = fs.readFileSync(CONFIG.ROSTER_JSON_PATH, 'utf-8');
  const apiData: ApiData = JSON.parse(rosterContent);

  console.log(`Total members in roster.json: ${apiData.members.length}`);

  // 背番号のないメンバーを確認
  const membersWithoutJersey = apiData.members.filter((m: Member) => !m.jersey);
  console.log(`\nMembers without jersey numbers: ${membersWithoutJersey.length}`);
  membersWithoutJersey.forEach((member: Member) => {
    console.log(`  - ${member.name.default} (${member.position || 'No position'})`);
  });

  await browser.close();

  return { missingImages, loadedImages, apiData };
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  checkMissingImages().catch(console.error);
}
