// scripts/post-instagram-to-x.ts
// Node 20 + npx tsx で実行想定（fetch / FormData / Blob 標準搭載）
// 必要なSecrets: X_API_KEY, X_API_KEY_SECRET, X_BOT_ACCESS_TOKEN, X_BOT_ACCESS_TOKEN_SECRET
//
// notify-slack-instagram.ts と同じ「前回posts.json と今回を id で diff → 新規分を処理」骨格。
// 新規Instagram投稿をTRIAX公式Xアカウントへクロスポストする。

import { promises as fs } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { calculateTwitterWeight, MAX_TWEET_LENGTH } from './lib/twitter-text-weight';
import { buildOAuthHeader } from './lib/x-oauth';
import { uploadMedia, XOAuthCreds } from './lib/x-media-upload';

// .envファイルを読み込み
dotenv.config();

// ========== Types ==========

interface InstagramChild {
  media_type: string;
  media_url?: string | null;
  permalink?: string;
  id?: string;
}

interface InstagramPost {
  id: string;
  permalink: string;
  media_type: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  caption: string;
  timestamp: string; // ISO8601 format
  media_url: string | null;
  thumbnail_url: string | null;
  children: InstagramChild[] | null;
}

interface PostsJson {
  fetched_at: string;
  user_id: string;
  count: number;
  posts: InstagramPost[];
}

// 1投稿に添付するメディア（種別とURLのペア）
interface MediaTarget {
  url: string;
  type: 'image' | 'video';
}

// ========== Configuration ==========

const CURRENT_POSTS_PATH = path.join('docs', 'assets', 'instagram', 'posts.json');
const TWEET_ENDPOINT = 'https://api.x.com/2/tweets';
const POST_INTERVAL_MS = 1000; // 投稿間に1秒待機（rate limit対策）
const MAX_IMAGES_PER_TWEET = 4; // Xの画像上限
const HASHTAGS = '#TRIAX #調布 #アメフト'; // 本文末尾の固定ハッシュタグ
const TRUNCATE_ELLIPSIS = '…';

const X_CREDS_ENV = {
  consumerKey: 'X_API_KEY',
  consumerSecret: 'X_API_KEY_SECRET',
  accessToken: 'X_BOT_ACCESS_TOKEN',
  accessTokenSecret: 'X_BOT_ACCESS_TOKEN_SECRET',
} as const;

// ========== Helper Functions ==========

function parseArgs(): { previousPostsPath: string | null; dryRun: boolean } {
  const args = process.argv.slice(2);
  let previousPostsPath: string | null = null;
  let dryRun = false;

  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (!arg.startsWith('-')) {
      previousPostsPath = arg;
    }
  }

  return { previousPostsPath, dryRun };
}

async function readPostsJson(filePath: string): Promise<PostsJson | null> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content) as PostsJson;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

function findNewPosts(previous: PostsJson | null, current: PostsJson): InstagramPost[] {
  if (!previous) {
    // 前回データが無い（初回実行など）場合、全件を新規扱いにすると大量投稿になり危険。
    // 安全策として、timestampが最も新しい1件のみを新規とみなす。
    const sorted = [...current.posts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted.slice(0, 1);
  }

  const previousIds = new Set(previous.posts.map((p) => p.id));
  return current.posts.filter((p) => !previousIds.has(p.id));
}

// 投稿に添付すべきメディア一覧を決定
// - IMAGE          : media_url を画像1枚
// - VIDEO          : media_url を動画1本
// - CAROUSEL_ALBUM : children の画像を最大4枚（Xは画像最大4枚、動画は単独のみのため画像のみ採用）
function resolveMediaTargets(post: InstagramPost): MediaTarget[] {
  if (post.media_type === 'VIDEO') {
    return post.media_url ? [{ url: post.media_url, type: 'video' }] : [];
  }

  if (post.media_type === 'CAROUSEL_ALBUM') {
    const children = post.children ?? [];
    return children
      .filter((c) => c.media_type !== 'VIDEO' && c.media_url)
      .slice(0, MAX_IMAGES_PER_TWEET)
      .map((c) => ({ url: c.media_url as string, type: 'image' as const }));
  }

  // IMAGE（またはそれ以外の静止画系）
  return post.media_url ? [{ url: post.media_url, type: 'image' }] : [];
}

// 本文を生成。
// 構成: キャプション冒頭 + "\n\n" + permalink + "\n\n" + ハッシュタグ。
// URL(=weight 23) / ハッシュタグ / 改行 を固定分として確保し、残weightにキャプションを詰める。
// 超過時はキャプション末尾を "…" でtruncate。
function buildTweetText(post: InstagramPost): string {
  const caption = (post.caption || '').trim();
  const fixedTail = `\n\n${post.permalink}\n\n${HASHTAGS}`;

  // キャプションが空でも投稿は成立する（permalink + ハッシュタグのみ）
  const fixedWeight = calculateTwitterWeight(fixedTail);
  const ellipsisWeight = calculateTwitterWeight(TRUNCATE_ELLIPSIS);
  const captionBudget = MAX_TWEET_LENGTH - fixedWeight;

  if (captionBudget <= 0) {
    // 固定部分だけで上限に達する異常系。キャプション無しで返す。
    return `${post.permalink}\n\n${HASHTAGS}`;
  }

  if (calculateTwitterWeight(caption) <= captionBudget) {
    return caption ? `${caption}${fixedTail}` : `${post.permalink}\n\n${HASHTAGS}`;
  }

  // truncate: 末尾の "…" 分を引いたweight内に収まるよう1文字ずつ詰める
  const truncated = truncateByWeight(caption, captionBudget - ellipsisWeight);
  return `${truncated}${TRUNCATE_ELLIPSIS}${fixedTail}`;
}

// 指定weight以内に収まるよう、文字単位（サロゲートペア考慮）でtruncate
function truncateByWeight(text: string, maxWeight: number): string {
  const chars = Array.from(text);
  let result = '';
  for (const char of chars) {
    if (calculateTwitterWeight(result + char) > maxWeight) {
      break;
    }
    result += char;
  }
  return result.trimEnd();
}

function getXCreds(): XOAuthCreds | null {
  const missing = Object.values(X_CREDS_ENV).filter((key) => !process.env[key]);
  if (missing.length > 0) {
    return null;
  }
  return {
    consumerKey: process.env[X_CREDS_ENV.consumerKey] as string,
    consumerSecret: process.env[X_CREDS_ENV.consumerSecret] as string,
    accessToken: process.env[X_CREDS_ENV.accessToken] as string,
    accessTokenSecret: process.env[X_CREDS_ENV.accessTokenSecret] as string,
  };
}

// メディアをアップロードして media_id 配列を得る。
// 個別のアップロード失敗は握りつぶし（テキストのみ投稿で継続できるように）、ログのみ出力。
async function uploadMediaTargets(
  creds: XOAuthCreds,
  targets: MediaTarget[],
  postId: string
): Promise<string[]> {
  const mediaIds: string[] = [];
  for (const target of targets) {
    try {
      const mediaId = await uploadMedia(creds, target.url, target.type);
      mediaIds.push(mediaId);
    } catch (error) {
      console.error(`  メディアアップロード失敗 (post ${postId}, ${target.type}):`, error);
      // 失敗したメディアはスキップして継続
    }
  }
  return mediaIds;
}

// X API v2 /2/tweets へ投稿
async function postTweet(creds: XOAuthCreds, text: string, mediaIds: string[]): Promise<void> {
  const url = new URL(TWEET_ENDPOINT);
  const authorization = buildOAuthHeader({
    method: 'POST',
    url,
    consumerKey: creds.consumerKey,
    consumerSecret: creds.consumerSecret,
    accessToken: creds.accessToken,
    accessTokenSecret: creds.accessTokenSecret,
  });

  const payload: { text: string; media?: { media_ids: string[] } } = { text };
  if (mediaIds.length > 0) {
    payload.media = { media_ids: mediaIds };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as
    | { data: { id: string } }
    | { errors: Array<{ message: string }> };

  if (!res.ok || 'errors' in body) {
    throw new Error(`X投稿に失敗: HTTP ${res.status} ${JSON.stringify(body)}`);
  }
  console.log(`  投稿成功: tweet ${body.data.id}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========== Main ==========

async function main() {
  const { previousPostsPath, dryRun } = parseArgs();

  if (!previousPostsPath) {
    console.error('Usage: npx tsx scripts/post-instagram-to-x.ts <previous-posts.json> [--dry-run]');
    process.exit(1);
  }

  // X認証情報チェック（dry-run時は不要）
  const creds = getXCreds();
  if (!creds && !dryRun) {
    console.warn(
      'X API credentials are not set (X_API_KEY / X_API_KEY_SECRET / X_BOT_ACCESS_TOKEN / X_BOT_ACCESS_TOKEN_SECRET). Skipping X cross-post.'
    );
    process.exit(0);
  }

  // 前回・今回のposts.jsonを読み込み
  const [previousPosts, currentPosts] = await Promise.all([
    readPostsJson(previousPostsPath),
    readPostsJson(CURRENT_POSTS_PATH),
  ]);

  if (!currentPosts) {
    console.error(`Current posts file not found: ${CURRENT_POSTS_PATH}`);
    process.exit(1);
  }

  // 新規投稿を抽出
  const newPosts = findNewPosts(previousPosts, currentPosts);

  if (newPosts.length === 0) {
    console.log('No new Instagram posts detected.');
    return;
  }

  console.log(`Found ${newPosts.length} new post(s).`);

  // 古い順（timestamp昇順）に投稿して時系列を保つ
  newPosts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (let i = 0; i < newPosts.length; i++) {
    const post = newPosts[i];
    const text = buildTweetText(post);
    const weight = calculateTwitterWeight(text);
    const targets = resolveMediaTargets(post);

    if (dryRun) {
      console.log(`\n[DRY-RUN] Would post to X for Instagram post: ${post.id}`);
      console.log(`  Weight: ${weight}/${MAX_TWEET_LENGTH}`);
      console.log(`  Text:\n${text}`);
      console.log(
        `  Media (${targets.length}): ${
          targets.map((t) => `${t.type}:${t.url.slice(0, 80)}…`).join('\n          ') || '(none)'
        }`
      );
      continue;
    }

    console.log(`\nPosting to X for Instagram post: ${post.id} (weight ${weight})`);

    try {
      const mediaIds = await uploadMediaTargets(creds as XOAuthCreds, targets, post.id);
      if (targets.length > 0 && mediaIds.length === 0) {
        console.warn('  全メディアのアップロードに失敗したため、テキストのみで投稿します。');
      }
      await postTweet(creds as XOAuthCreds, text, mediaIds);
    } catch (error) {
      // 個別投稿の失敗はワークフローを落とさず次へ
      console.error(`  X投稿に失敗 (post ${post.id}):`, error);
    }

    // 次の投稿まで待機（rate limit対策）
    if (i < newPosts.length - 1) {
      await sleep(POST_INTERVAL_MS);
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('post-instagram-to-x failed:', e);
  process.exit(1);
});
