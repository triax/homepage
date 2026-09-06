// scripts/exchange-short-to-long-token.ts
// 短期トークン(Short-Lived Token)をLong-Lived Tokenに変換するスクリプト
//
// 使用場面:
// - Graph API Explorerで新しく取得した短期トークン（約1時間有効）を
//   Long-Lived Token（約60日有効）に変換する
//
// 注意:
// - この変換に24時間制限はありません（即座に実行可能）
// - Long-Lived Token同士のリフレッシュには24時間制限があります
//   → その場合は `pnpm instagram:refresh-token` を使用

import { promises as fs } from 'fs';
import * as dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

const shortLivedToken = process.env.FACEBOOK_ACCESS_TOKEN;
const appId = process.env.FACEBOOK_APP_ID;
const appSecret = process.env.FACEBOOK_APP_SECRET;

if (!shortLivedToken) {
  console.error('ERROR: FACEBOOK_ACCESS_TOKEN is required in .env');
  process.exit(1);
}

if (!appId) {
  console.error('ERROR: FACEBOOK_APP_ID is required in .env');
  process.exit(1);
}

if (!appSecret) {
  console.error('ERROR: FACEBOOK_APP_SECRET is required in .env');
  process.exit(1);
}

// トークン情報を取得
async function getTokenInfo(token: string): Promise<{
  expires_in?: number;
  is_valid?: boolean;
  app_id?: string;
  error?: any;
}> {
  try {
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
      token
    )}&access_token=${encodeURIComponent(token)}`;

    const response = await fetch(debugUrl);
    const data = (await response.json()) as any;

    if (data?.data) {
      return {
        is_valid: data.data.is_valid,
        app_id: data.data.app_id,
        expires_in: data.data.expires_at
          ? data.data.expires_at - Math.floor(Date.now() / 1000)
          : undefined,
      };
    }
    return { error: data?.error };
  } catch (error) {
    return { error };
  }
}

// 短期トークンをLong-Lived Tokenに変換
async function exchangeToken(shortToken: string): Promise<{
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: any;
}> {
  const url = new URL('https://graph.facebook.com/v22.0/oauth/access_token');
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', appId!);
  url.searchParams.set('client_secret', appSecret!);
  url.searchParams.set('fb_exchange_token', shortToken);

  try {
    const response = await fetch(url);
    const data = (await response.json()) as any;

    if (data?.access_token) {
      return data;
    } else {
      return { error: data?.error };
    }
  } catch (error) {
    return { error };
  }
}

// .envファイルを更新
async function updateEnvFile(newToken: string): Promise<boolean> {
  const envPath = '.env';

  try {
    let envContent = await fs.readFile(envPath, 'utf8');

    const envPattern = /^FACEBOOK_ACCESS_TOKEN=.*/m;
    if (!envPattern.test(envContent)) {
      console.error('ERROR: FACEBOOK_ACCESS_TOKEN not found in .env file');
      return false;
    }

    // バックアップを作成
    const backupPath = `.env.backup.${Date.now()}`;
    await fs.writeFile(backupPath, envContent, 'utf8');
    console.log(`📦 Backup created: ${backupPath}`);

    // 更新
    envContent = envContent.replace(envPattern, `FACEBOOK_ACCESS_TOKEN=${newToken}`);
    await fs.writeFile(envPath, envContent, 'utf8');

    return true;
  } catch (error) {
    console.error('ERROR: Failed to update .env file:', error);
    return false;
  }
}

async function main() {
  console.log('🔄 Short-Lived Token → Long-Lived Token 変換\n');

  // 現在のトークン情報を確認
  console.log('📊 現在のトークン情報を確認中...');
  const tokenInfo = await getTokenInfo(shortLivedToken!);

  if (tokenInfo.error) {
    console.error('ERROR: トークン情報の取得に失敗:', tokenInfo.error);
    process.exit(1);
  }

  if (!tokenInfo.is_valid) {
    console.error('ERROR: トークンが無効または期限切れです');
    process.exit(1);
  }

  const expiresInHours = tokenInfo.expires_in ? Math.floor(tokenInfo.expires_in / 3600) : 0;
  const expiresInDays = tokenInfo.expires_in ? Math.floor(tokenInfo.expires_in / 86400) : 0;

  if (expiresInDays > 1) {
    console.log(`⚠️  現在のトークンは約${expiresInDays}日間有効です。`);
    console.log('   これは既にLong-Lived Tokenの可能性があります。');
    console.log('   リフレッシュには `pnpm instagram:refresh-token` を使用してください。\n');
    console.log('   それでも変換を続行しますか？ (Ctrl+Cでキャンセル)');
    // 3秒待機
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } else {
    console.log(`   有効期限: 約${expiresInHours}時間（短期トークン）`);
  }

  // 変換実行
  console.log('\n🔄 Long-Lived Tokenに変換中...');
  const result = await exchangeToken(shortLivedToken!);

  if (result.error) {
    console.error('ERROR: 変換に失敗しました:', result.error);
    process.exit(1);
  }

  if (!result.access_token) {
    console.error('ERROR: 新しいトークンが取得できませんでした');
    process.exit(1);
  }

  const newExpiresInDays = result.expires_in ? Math.floor(result.expires_in / 86400) : 0;
  console.log(`✅ 変換成功！新しいトークンは約${newExpiresInDays}日間有効です`);

  // .envを更新
  console.log('\n💾 .envファイルを更新中...');
  const updated = await updateEnvFile(result.access_token);

  if (!updated) {
    console.error('ERROR: .envファイルの更新に失敗しました');
    console.log('\n手動で以下のトークンを設定してください:');
    console.log(result.access_token);
    process.exit(1);
  }

  console.log('✅ .envファイルを更新しました');

  console.log('\n========================================');
  console.log('🎉 変換完了！');
  console.log('========================================');
  console.log('\n次のステップ:');
  console.log('1. GitHub Secretsの FACEBOOK_ACCESS_TOKEN も更新してください');
  console.log('   → https://github.com/triax/homepage/settings/secrets/actions');
  console.log('\n2. 新しいトークン（.envから取得）:');
  console.log(`   ${result.access_token.substring(0, 30)}...`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
