// scripts/exchange-instagram-token.ts
// Instagram短期トークンを長期トークンに交換するスクリプト
// Facebook Developersから取得した短期トークンを60日間有効な長期トークンに変換
//
// 使用方法:
// 1. Facebook開発者コンソールでApp IDとApp Secretを取得
// 2. 環境変数またはコマンドライン引数で提供
// 3. npm run instagram:exchange-token を実行

import { promises as fs } from 'fs';
import * as dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

// 環境変数から取得（コマンドライン引数で上書き可能）
// FACEBOOK_APP_ID または IG_APP_ID の両方をサポート
const IG_APP_ID = process.env.FACEBOOK_APP_ID || process.env.IG_APP_ID || process.argv[2];
const IG_APP_SECRET =
  process.env.FACEBOOK_APP_SECRET || process.env.IG_APP_SECRET || process.argv[3];
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN || process.argv[4];

// 短期トークンを長期トークンに交換
async function exchangeForLongLivedToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string
): Promise<{
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: any;
}> {
  const exchangeUrl =
    'https://graph.facebook.com/v21.0/oauth/access_token' +
    '?grant_type=fb_exchange_token' +
    `&client_id=${encodeURIComponent(appId)}` +
    `&client_secret=${encodeURIComponent(appSecret)}` +
    `&fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;

  try {
    const response = await fetch(exchangeUrl);
    const data = await response.json() as any;

    if (data?.access_token) {
      console.log('✅ Token exchanged successfully!');
      const days = data.expires_in ? Math.floor(data.expires_in / 86400) : 60;
      console.log(`  New long-lived token expires in: ${days} days`);
      return data;
    } else {
      console.error('❌ Failed to exchange token:', data?.error);
      return { error: data?.error };
    }
  } catch (error) {
    console.error('❌ Network error during token exchange:', error);
    return { error };
  }
}

// トークン情報を確認
async function getTokenInfo(accessToken: string): Promise<{
  expires_in?: number;
  is_valid?: boolean;
  type?: string;
  error?: any;
}> {
  try {
    // App Access Tokenを使用してデバッグ（可能な場合）
    const debugToken = IG_APP_ID && IG_APP_SECRET
      ? `${IG_APP_ID}|${IG_APP_SECRET}`
      : accessToken;

    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
      accessToken
    )}&access_token=${encodeURIComponent(debugToken)}`;

    const response = await fetch(debugUrl);
    const data = await response.json() as any;

    if (data?.data) {
      const expiresAt = data.data.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = expiresAt - now;

      // トークンタイプを判定
      let tokenType = 'unknown';
      if (expiresIn > 0 && expiresIn < 7200) {
        tokenType = 'short-lived (expires in hours)';
      } else if (expiresIn > 86400) {
        tokenType = 'long-lived (expires in days)';
      } else if (expiresIn === 0 || !data.data.expires_at) {
        tokenType = 'page or app token (no expiration)';
      }

      return {
        is_valid: data.data.is_valid,
        expires_in: expiresIn > 0 ? expiresIn : undefined,
        type: tokenType,
      };
    }
    return { error: data?.error };
  } catch (error) {
    console.error('Failed to get token info:', error);
    return { error };
  }
}

// ローカル環境の.envファイルを更新
async function updateLocalEnv(newToken: string): Promise<boolean> {
  const envPath = '.env';

  try {
    // .envファイルが存在するか確認
    let envContent: string;
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch {
      console.error('❌ .env file not found. Creating new .env file...');
      envContent = '';
    }

    // IG_ACCESS_TOKENの行を更新または追加
    if (/^IG_ACCESS_TOKEN=/m.test(envContent)) {
      envContent = envContent.replace(
        /^IG_ACCESS_TOKEN=.*/m,
        `IG_ACCESS_TOKEN=${newToken}`
      );
    } else {
      envContent += `\nIG_ACCESS_TOKEN=${newToken}\n`;
    }

    // バックアップを作成（ファイルが存在する場合）
    try {
      const backupPath = `.env.backup.${Date.now()}`;
      await fs.writeFile(backupPath, await fs.readFile(envPath, 'utf8'), 'utf8');
      console.log(`📦 Backup created: ${backupPath}`);
    } catch {
      // バックアップ作成をスキップ（新規ファイルの場合）
    }

    // 新しい内容を書き込み
    await fs.writeFile(envPath, envContent, 'utf8');
    console.log('✅ Local .env file updated successfully');

    // 環境変数も更新（現在のプロセス用）
    process.env.IG_ACCESS_TOKEN = newToken;
    console.log('✅ Environment variable updated for current process');

    return true;
  } catch (error) {
    console.error('❌ Failed to update .env file:', error);
    return false;
  }
}

async function main() {
  console.log('🔄 Instagram Token Exchange (Short-lived → Long-lived)');
  console.log('=' .repeat(50));

  // 必要な情報の確認
  if (!IG_ACCESS_TOKEN) {
    console.error('\n❌ ERROR: IG_ACCESS_TOKEN is required');
    console.error('\nUsage:');
    console.error('  1. Set in .env file:');
    console.error('     IG_APP_ID=your_app_id');
    console.error('     IG_APP_SECRET=your_app_secret');
    console.error('     IG_ACCESS_TOKEN=short_lived_token');
    console.error('\n  2. Or provide as arguments:');
    console.error('     npm run instagram:exchange-token APP_ID APP_SECRET TOKEN');
    process.exit(1);
  }

  // 現在のトークン情報を確認
  console.log('\n📊 Checking current token...');
  const tokenInfo = await getTokenInfo(IG_ACCESS_TOKEN);

  if (tokenInfo.is_valid === false) {
    console.error('❌ Current token is invalid!');
    console.error('   Please obtain a new token from Facebook Developers.');
    process.exit(1);
  }

  if (tokenInfo.type) {
    console.log(`  Token type: ${tokenInfo.type}`);
  }

  if (tokenInfo.expires_in !== undefined) {
    const hours = Math.floor(tokenInfo.expires_in / 3600);
    const days = Math.floor(tokenInfo.expires_in / 86400);

    if (days > 0) {
      console.log(`  Expires in: ${days} days`);

      // 既に長期トークンの場合
      if (days > 7) {
        console.log('\n✅ This token is already a long-lived token!');
        console.log('   To refresh it, use: npm run instagram:refresh-token');
        console.log('   (Note: Can only refresh after 24 hours from creation)');
        return;
      }
    } else if (hours > 0) {
      console.log(`  Expires in: ${hours} hours`);
      console.log('  ⚠️  This is a short-lived token that needs exchange!');
    } else {
      console.log('  ⚠️  Token is expired or about to expire!');
    }
  }

  // App IDとApp Secretの確認
  if (!IG_APP_ID || !IG_APP_SECRET) {
    console.error('\n❌ ERROR: App ID and App Secret are required for token exchange');
    console.error('\nTo get these values:');
    console.error('  1. Go to https://developers.facebook.com/');
    console.error('  2. Select your app');
    console.error('  3. Go to Settings → Basic');
    console.error('  4. Copy App ID and App Secret');
    console.error('\nThen set them in .env file:');
    console.error('  IG_APP_ID=your_app_id');
    console.error('  IG_APP_SECRET=your_app_secret');
    process.exit(1);
  }

  // トークンを交換
  console.log('\n🔄 Exchanging for long-lived token...');
  const exchangeResult = await exchangeForLongLivedToken(
    IG_APP_ID,
    IG_APP_SECRET,
    IG_ACCESS_TOKEN
  );

  if (exchangeResult.error) {
    console.error('\n❌ Failed to exchange token');

    // エラーの詳細を解析
    if (exchangeResult.error.message?.includes('Invalid OAuth')) {
      console.error('   The token appears to be invalid or already expired.');
      console.error('   Please get a new token from Facebook Developers.');
    } else if (exchangeResult.error.message?.includes('App Secret')) {
      console.error('   The App Secret appears to be incorrect.');
      console.error('   Please verify your App Secret in Facebook Developers Console.');
    } else {
      console.error('   Error details:', exchangeResult.error);
    }
    process.exit(1);
  }

  if (!exchangeResult.access_token) {
    console.error('❌ No new token received');
    process.exit(1);
  }

  // 新しいトークンを保存
  console.log('\n💾 Saving long-lived token...');
  const updated = await updateLocalEnv(exchangeResult.access_token);

  if (!updated) {
    console.error('❌ Failed to update environment');
    console.error('\nYou can manually update your .env file with:');
    console.error(`IG_ACCESS_TOKEN=${exchangeResult.access_token}`);
    process.exit(1);
  }

  console.log('\n✅ Token exchange completed successfully!');
  console.log('   Your new long-lived token is valid for 60 days.');
  console.log('\n📌 Next steps:');
  console.log('   1. Test the new token: npm run instagram:fetch');
  console.log('   2. Update GitHub Secrets if using GitHub Actions');
  console.log('   3. Set up automatic refresh (runs monthly via GitHub Actions)');
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
