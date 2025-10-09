// scripts/refresh-instagram-token.ts
// Instagram Graph API Long-lived Access Tokenの自動更新スクリプト
// 60日の有効期限前に定期的に実行して新しいトークンを取得
//
// 実行環境別の動作:
// ┌─────────────────┬──────────────────────┬─────────────────────────────┐
// │ Runtime         │ Input                │ Output                      │
// ├─────────────────┼──────────────────────┼─────────────────────────────┤
// │ GitHub Actions  │ secrets.FACEBOOK_    │ GitHub Secrets APIで        │
// │                 │ ACCESS_TOKEN (環境変数)│ FACEBOOK_ACCESS_TOKENを更新 │
// ├─────────────────┼──────────────────────┼─────────────────────────────┤
// │ Local Dev       │ .envファイルから     │ .envファイルを更新          │
// │                 │ FACEBOOK_ACCESS_TOKEN│ (環境変数も自動更新)        │
// └─────────────────┴──────────────────────┴─────────────────────────────┘

import { promises as fs } from 'fs';
import * as dotenv from 'dotenv';
import sodium from 'libsodium-wrappers';

// .envファイルを読み込み
dotenv.config();

const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const appId = process.env.FACEBOOK_APP_ID;
const appSecret = process.env.FACEBOOK_APP_SECRET;
const GITHUB_TOKEN = process.env.TRIAX_HOMEPAGE_GHACTIONS; // Fine-grained Personal Access Token
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY; // owner/repo形式
const GITHUB_API_BASE = 'https://api.github.com';

if (!accessToken) {
  console.error('ERROR: FACEBOOK_ACCESS_TOKEN is required');
  process.exit(1);
}

if (!appId) {
  console.error('ERROR: FACEBOOK_APP_ID is required');
  process.exit(1);
}

if (!appSecret) {
  console.error('ERROR: FACEBOOK_APP_SECRET is required');
  process.exit(1);
}

// トークン情報を取得（デバッグ用）
async function getTokenInfo(accessToken: string): Promise<{
  expires_in?: number;
  is_valid?: boolean;
  error?: any;
}> {
  try {
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
      accessToken
    )}&access_token=${encodeURIComponent(accessToken)}`;

    const response = await fetch(debugUrl);
    const data = await response.json() as any;

    if (data?.data) {
      return {
        is_valid: data.data.is_valid,
        expires_in: data.data.expires_at
          ? data.data.expires_at - Math.floor(Date.now() / 1000)
          : undefined,
      };
    }
    return { error: data?.error };
  } catch (error) {
    console.error('Failed to get token info:', error);
    return { error };
  }
}

// Instagram Graph APIでトークンをリフレッシュ（Meta推奨のfb_exchange_tokenフロー）
async function refreshInstagramToken(currentToken: string): Promise<{
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: any;
}> {
  const refreshUrl = new URL('https://graph.facebook.com/v22.0/oauth/access_token');
  refreshUrl.searchParams.set('grant_type', 'fb_exchange_token');
  refreshUrl.searchParams.set('client_id', appId!);
  refreshUrl.searchParams.set('client_secret', appSecret!);
  refreshUrl.searchParams.set('fb_exchange_token', currentToken);

  try {
    const response = await fetch(refreshUrl);
    const data = await response.json() as any;

    if (data?.access_token) {
      console.log('✅ Token refreshed successfully');
      const days = Math.floor(data.expires_in / 86400);
      console.log(`  New token expires in: ${data.expires_in} seconds (${days} days)`);
      return data;
    } else {
      console.error('❌ Failed to refresh token:', data?.error);
      return { error: data?.error };
    }
  } catch (error) {
    console.error('❌ Network error during token refresh:', error);
    return { error };
  }
}

// GitHub Secretを更新
async function updateGitHubSecret(
  secretName: string,
  secretValue: string
): Promise<boolean> {
  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY) {
    console.error('GitHub environment variables not found. Running in local mode.');
    return false;
  }

  try {
    // 公開鍵を取得
    const keyResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${GITHUB_REPOSITORY}/actions/secrets/public-key`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!keyResponse.ok) {
      console.error(`Failed to get public key: ${keyResponse.status}`);
      return false;
    }

    const keyData = await keyResponse.json() as { key: string; key_id: string };

    // libsodium 初期化を待機
    await sodium.ready;

    // 値を暗号化
    const messageBytes = sodium.from_string(secretValue);
    const keyBytes = sodium.from_base64(keyData.key, sodium.base64_variants.ORIGINAL);
    const encryptedBytes = sodium.crypto_box_seal(messageBytes, keyBytes);
    const encryptedValue = sodium.to_base64(
      encryptedBytes,
      sodium.base64_variants.ORIGINAL
    );

    // Secretを更新
    const updateResponse = await fetch(
      `${GITHUB_API_BASE}/repos/${GITHUB_REPOSITORY}/actions/secrets/${secretName}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          encrypted_value: encryptedValue,
          key_id: keyData.key_id,
        }),
      }
    );

    if (updateResponse.ok || updateResponse.status === 204) {
      console.log(`✅ GitHub Secret '${secretName}' updated successfully`);
      return true;
    } else {
      console.error(`Failed to update secret: ${updateResponse.status}`);
      return false;
    }
  } catch (error) {
    console.error('Failed to update GitHub Secret:', error);
    return false;
  }
}

// ローカル環境の.envファイルを更新
async function updateLocalEnv(envKey: string, newToken: string): Promise<boolean> {
  const envPath = '.env';

  try {
    // .envファイルが存在するか確認
    let envContent: string;
    try {
      envContent = await fs.readFile(envPath, 'utf8');
    } catch {
      console.error('❌ .env file not found. Please create .env file first.');
      return false;
    }

    // 対象行（FACEBOOK_ACCESS_TOKEN など）を更新
    const envPattern = new RegExp(`^${envKey}=.*`, 'm');
    if (!envPattern.test(envContent)) {
      console.error(`❌ ${envKey} not found in .env file`);
      return false;
    }

    envContent = envContent.replace(envPattern, `${envKey}=${newToken}`);

    // バックアップを作成
    const backupPath = `.env.backup.${Date.now()}`;
    await fs.writeFile(backupPath, await fs.readFile(envPath, 'utf8'), 'utf8');
    console.log(`📦 Backup created: ${backupPath}`);

    // 新しい内容を書き込み
    await fs.writeFile(envPath, envContent, 'utf8');
    console.log('✅ Local .env file updated successfully');

    // 環境変数も更新（現在のプロセス用）
    process.env[envKey] = newToken;
    console.log('✅ Environment variable updated for current process');

    return true;
  } catch (error) {
    console.error('❌ Failed to update .env file:', error);
    return false;
  }
}

async function main() {
  console.log('🔄 Starting Instagram Access Token refresh process...');

  // 現在のトークン情報を取得
  console.log('\n📊 Current token status:');
  const tokenInfo = await getTokenInfo(accessToken!);

  if (tokenInfo.is_valid === false) {
    console.error('❌ Current token is invalid or expired!');
    console.error('   Please obtain a new token manually.');
    process.exit(1);
  }

  if (tokenInfo.expires_in !== undefined) {
    const daysRemaining = Math.floor(tokenInfo.expires_in / 86400);
    console.log(`  Token expires in: ${daysRemaining} days`);

    // 24時間以内の場合は更新不可
    if (tokenInfo.expires_in < 86400) {
      console.error('❌ Token is less than 24 hours old. Cannot refresh yet.');
      process.exit(1);
    }

    // 残り10日以上ある場合は警告のみ
    if (daysRemaining > 10) {
      console.log(`ℹ️  Token still has ${daysRemaining} days remaining.`);
      console.log('   Proceeding with refresh to reset the 60-day timer...');
    }
  }

  // トークンをリフレッシュ
  console.log('\n🔄 Refreshing token...');
  const refreshResult = await refreshInstagramToken(accessToken!);

  if (refreshResult.error) {
    console.error('❌ Failed to refresh token');
    process.exit(1);
  }

  if (!refreshResult.access_token) {
    console.error('❌ No new token received');
    process.exit(1);
  }

  // 新しいトークンを保存
  console.log('\n💾 Saving new token...');

  // 実行環境を判定
  const isGitHubActions = process.env.GITHUB_ACTIONS === 'true';

  console.log(`📍 Runtime environment: ${isGitHubActions ? 'GitHub Actions' : 'Local Development'}`);

  if (isGitHubActions) {
    // GitHub Actions環境
    console.log('   Input: Environment variable from GitHub Secrets');
    console.log('   Output: Updating GitHub repository secret via API');

    const updated = await updateGitHubSecret(
      'FACEBOOK_ACCESS_TOKEN',
      refreshResult.access_token
    );

    if (!updated) {
      console.error('❌ Failed to update GitHub Secret');
      process.exit(1);
    }
  } else {
    // ローカル開発環境
    console.log('   Input: .env file (via dotenv)');
    console.log('   Output: Updating .env file and process environment');

    const updated = await updateLocalEnv('FACEBOOK_ACCESS_TOKEN', refreshResult.access_token);

    if (!updated) {
      console.error('❌ Failed to update local environment');
      process.exit(1);
    }
  }

  console.log('\n✅ Token refresh completed successfully!');
  console.log(`   New token will expire in ${Math.floor(refreshResult.expires_in! / 86400)} days`);
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
