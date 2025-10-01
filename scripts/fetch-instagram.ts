// scripts/fetch-instagram.ts
// Node 20 + npx tsx で実行想定（fetch標準搭載）
// 必要なSecrets: INSTAGRAM_USER_ID, FACEBOOK_ACCESS_TOKEN

import { promises as fs } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

type InstagramChild = {
  media_type: string;
  permalink: string;
  media_url?: string;
};

type InstagramItem = {
  id: string;
  permalink: string;
  media_type: string; // IMAGE | VIDEO | CAROUSEL_ALBUM など
  caption?: string;
  timestamp: string;  // ISO8601
  media_url?: string;
  thumbnail_url?: string;
  children?: { data: InstagramChild[] };
};

const instagramUserId = process.env.INSTAGRAM_USER_ID || '17841443759135863';
const instagramAccessToken = process.env.FACEBOOK_ACCESS_TOKEN;
const mediaLimit = Number(process.env.INSTAGRAM_MEDIA_LIMIT ?? 6); // 既定=6

const OUT_JSON = path.join('docs', 'assets', 'instagram', 'posts.json');

if (!instagramUserId || !instagramAccessToken) {
  console.error('ENV missing: INSTAGRAM_USER_ID and FACEBOOK_ACCESS_TOKEN are required.');
  process.exit(1);
}

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function fetchJson<T = any>(url: string, timeoutMs = 15000): Promise<T> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }
    return JSON.parse(text) as T;
  } finally {
    clearTimeout(to);
  }
}

async function checkTokenExpiry(token: string): Promise<void> {
  try {
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(
      token
    )}&access_token=${encodeURIComponent(token)}`;

    const response = await fetch(debugUrl);
    const result = await response.json() as any;

    if (result.data?.expires_at) {
      const expiresAt = result.data.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const daysRemaining = Math.floor((expiresAt - now) / 86400);

      if (daysRemaining < 7) {
        console.warn(`⚠️  WARNING: Instagram access token expires in ${daysRemaining} days!`);
        console.warn('   Please run the refresh-instagram-token workflow soon.');
      } else if (daysRemaining < 30) {
        console.log(`ℹ️  Token expires in ${daysRemaining} days`);
      }
    }
  } catch (error) {
    // トークンチェックは失敗しても処理を続行
    console.debug('Could not check token expiry:', error);
  }
}

async function main() {
  // トークンの有効期限をチェック
  await checkTokenExpiry(instagramAccessToken!);

  const fields =
    'id,permalink,media_type,caption,timestamp,media_url,thumbnail_url,children{media_type,permalink,media_url}';
  const url =
    `https://graph.facebook.com/v22.0/${instagramUserId}/media` +
    `?fields=${encodeURIComponent(fields)}` +
    `&limit=${mediaLimit}` +
    `&access_token=${encodeURIComponent(instagramAccessToken!)}`;

  const payload = await fetchJson<{ data: InstagramItem[] }>(url);
  const items = (payload?.data ?? []).slice().sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // 投稿データのみ（fetched_atを含まない）を作成
  const postsData = items.map((m) => ({
    id: m.id,
    permalink: m.permalink,
    media_type: m.media_type,
    caption: m.caption ?? '',
    timestamp: m.timestamp,
    media_url: m.media_url ?? null,
    thumbnail_url: m.thumbnail_url ?? null,
    children: m.children?.data ?? null,
  }));

  await ensureDir(OUT_JSON);

  // 常に最新のデータで更新（media_urlの有効期限更新のため）
  const out = {
    fetched_at: new Date().toISOString(),
    user_id: instagramUserId,
    count: postsData.length,
    posts: postsData,
  };

  const next = JSON.stringify(out, null, 2) + '\n';
  await fs.writeFile(OUT_JSON, next, 'utf8');
  console.log(`Wrote: ${OUT_JSON}`);
}

main().catch((e) => {
  console.error('fetch-instagram failed:', e);
  process.exit(1);
});
