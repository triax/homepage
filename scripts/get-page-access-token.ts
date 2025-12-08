// scripts/get-page-access-token.ts
// Long-lived User Access TokenからPage Access Token（無期限）を取得するスクリプト
//
// 使用場面:
// - 初回セットアップ時、または60日ごとのUser Access Token更新後に実行
// - Page Access Tokenは無期限なので、一度取得すれば更新不要
//
// 前提条件:
// - .envにFACEBOOK_ACCESS_TOKEN（Long-lived User Access Token）が設定されていること
// - Club TRIAXのFacebookページ管理者権限があること

import { promises as fs } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const userAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;

if (!userAccessToken) {
  console.error('ERROR: FACEBOOK_ACCESS_TOKEN is required in .env');
  console.error('       This should be a Long-lived User Access Token.');
  process.exit(1);
}

interface PageData {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account?: {
    id: string;
  };
}

interface TokenDebugInfo {
  is_valid: boolean;
  expires_at?: number;
  scopes?: string[];
  type?: string;
}

// トークン情報を取得
async function debugToken(token: string): Promise<TokenDebugInfo | null> {
  try {
    const url = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
      token
    )}&access_token=${encodeURIComponent(token)}`;

    const response = await fetch(url);
    const data = (await response.json()) as any;

    if (data?.data) {
      return {
        is_valid: data.data.is_valid,
        expires_at: data.data.expires_at,
        scopes: data.data.scopes,
        type: data.data.type,
      };
    }
    return null;
  } catch (error) {
    console.error('Failed to debug token:', error);
    return null;
  }
}

// ユーザーが管理するページ一覧を取得
async function getPages(userToken: string): Promise<PageData[]> {
  // instagram_business_accountフィールドも取得
  const url = `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${encodeURIComponent(
    userToken
  )}`;

  const response = await fetch(url);
  const data = (await response.json()) as any;

  if (data?.error) {
    throw new Error(`API Error: ${data.error.message}`);
  }

  return data?.data ?? [];
}

// .envファイルを更新
async function updateEnvFile(key: string, value: string): Promise<boolean> {
  const envPath = '.env';

  try {
    let envContent = await fs.readFile(envPath, 'utf8');

    const envPattern = new RegExp(`^${key}=.*`, 'm');
    if (envPattern.test(envContent)) {
      // 既存のキーを更新
      envContent = envContent.replace(envPattern, `${key}=${value}`);
    } else {
      // 新しいキーを追加
      envContent = envContent.trimEnd() + `\n${key}=${value}\n`;
    }

    // バックアップを作成
    const backupPath = `.env.backup.${Date.now()}`;
    await fs.writeFile(backupPath, await fs.readFile(envPath, 'utf8'), 'utf8');
    console.log(`📦 Backup created: ${backupPath}`);

    await fs.writeFile(envPath, envContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to update .env file:', error);
    return false;
  }
}

async function main() {
  console.log('🔄 Page Access Token（無期限）取得プロセス\n');

  // 1. 現在のUser Access Tokenの情報を確認
  console.log('📊 現在のUser Access Tokenを確認中...');
  const userTokenInfo = await debugToken(userAccessToken!);

  if (!userTokenInfo?.is_valid) {
    console.error('ERROR: User Access Tokenが無効です。');
    console.error('       新しいトークンを取得してください。');
    process.exit(1);
  }

  if (userTokenInfo.expires_at) {
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.floor((userTokenInfo.expires_at - now) / 86400);
    console.log(`   有効期限: ${daysRemaining}日後`);
  }
  console.log(`   Type: ${userTokenInfo.type || 'unknown'}`);
  console.log(`   Scopes: ${userTokenInfo.scopes?.join(', ') || 'unknown'}`);

  // 2. 管理しているページ一覧を取得
  console.log('\n📋 管理しているFacebookページを取得中...');
  const pages = await getPages(userAccessToken!);

  if (pages.length === 0) {
    console.error('ERROR: 管理しているFacebookページが見つかりません。');
    console.error('       Facebookページの管理者権限があることを確認してください。');
    process.exit(1);
  }

  console.log(`   ${pages.length}件のページが見つかりました:\n`);

  // 3. 各ページの情報を表示
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    console.log(`   [${i + 1}] ${page.name}`);
    console.log(`       Page ID: ${page.id}`);
    if (page.instagram_business_account) {
      console.log(`       Instagram Business Account: ${page.instagram_business_account.id} ✓`);
    } else {
      console.log(`       Instagram Business Account: なし`);
    }
  }

  // 4. Club TRIAXを探す（または最初のInstagram連携ページを使用）
  let selectedPage: PageData | null = null;

  // まずClub TRIAXという名前のページを探す
  const triaxPage = pages.find((p) => p.name.toLowerCase().includes('triax'));
  if (triaxPage) {
    selectedPage = triaxPage;
  } else {
    // Instagram連携があるページを探す
    const instagramPage = pages.find((p) => p.instagram_business_account);
    if (instagramPage) {
      selectedPage = instagramPage;
    } else {
      // 最初のページを使用
      selectedPage = pages[0];
    }
  }

  console.log(`\n✅ 選択されたページ: ${selectedPage.name}`);

  if (!selectedPage.instagram_business_account) {
    console.warn('⚠️  警告: このページにはInstagramビジネスアカウントが連携されていません。');
  }

  // 5. Page Access Tokenの情報を確認
  console.log('\n📊 Page Access Tokenを確認中...');
  const pageTokenInfo = await debugToken(selectedPage.access_token);

  if (!pageTokenInfo?.is_valid) {
    console.error('ERROR: Page Access Tokenが無効です。');
    process.exit(1);
  }

  const isNeverExpire = !pageTokenInfo.expires_at || pageTokenInfo.expires_at === 0;

  if (isNeverExpire) {
    console.log('   ✅ 有効期限: 無期限（Never Expire）');
  } else {
    const now = Math.floor(Date.now() / 1000);
    const daysRemaining = Math.floor((pageTokenInfo.expires_at! - now) / 86400);
    console.log(`   ⚠️  有効期限: ${daysRemaining}日後（無期限ではありません）`);
  }
  console.log(`   Type: ${pageTokenInfo.type || 'unknown'}`);

  // 6. .envに保存
  console.log('\n💾 .envファイルを更新中...');

  // Page Access Tokenを保存
  const tokenUpdated = await updateEnvFile('FACEBOOK_PAGE_ACCESS_TOKEN', selectedPage.access_token);
  if (!tokenUpdated) {
    console.error('ERROR: .envファイルの更新に失敗しました');
    process.exit(1);
  }

  // Instagram Business Account IDも保存（もしあれば）
  if (selectedPage.instagram_business_account) {
    await updateEnvFile('INSTAGRAM_BUSINESS_ACCOUNT_ID', selectedPage.instagram_business_account.id);
  }

  console.log('✅ .envファイルを更新しました');

  // 7. 結果サマリー
  console.log('\n========================================');
  console.log('🎉 Page Access Token取得完了！');
  console.log('========================================');

  console.log('\n📝 取得した情報:');
  console.log(`   Page Name: ${selectedPage.name}`);
  console.log(`   Page ID: ${selectedPage.id}`);
  if (selectedPage.instagram_business_account) {
    console.log(`   Instagram Business Account ID: ${selectedPage.instagram_business_account.id}`);
  }
  console.log(`   Token有効期限: ${isNeverExpire ? '無期限' : '有限'}`);

  console.log('\n📝 次のステップ:');
  console.log('1. Instagram APIがPage Access Tokenで動作するか確認:');
  console.log('   pnpm instagram:fetch');
  console.log('');
  console.log('2. 動作確認後、GitHub Secretsを更新:');
  console.log('   - FACEBOOK_ACCESS_TOKEN → Page Access Tokenに置き換え');
  if (selectedPage.instagram_business_account) {
    console.log('   - INSTAGRAM_USER_ID → Instagram Business Account IDに置き換え');
  }
  console.log('   https://github.com/triax/homepage/settings/secrets/actions');

  console.log('\n📝 Page Access Token（先頭30文字）:');
  console.log(`   ${selectedPage.access_token.substring(0, 30)}...`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
