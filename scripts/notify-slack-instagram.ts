// scripts/notify-slack-instagram.ts
// Node 20 + npx tsx で実行想定（fetch標準搭載）
// 必要なSecrets: SLACK_BOT_OAUTH_TOKEN
// オプション: SLACK_INSTAGRAM_CHANNEL (デフォルト: #instagram)

import { promises as fs } from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

// ========== Types ==========

interface InstagramPost {
  id: string;
  permalink: string;
  media_type: string;
  caption: string;
  timestamp: string; // ISO8601 format
  media_url: string | null;
  thumbnail_url: string | null;
  children: any[] | null;
}

interface PostsJson {
  fetched_at: string;
  user_id: string;
  count: number;
  posts: InstagramPost[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  elements?: any[];
}

// ========== Configuration ==========

const CURRENT_POSTS_PATH = path.join('docs', 'assets', 'instagram', 'posts.json');
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_OAUTH_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_INSTAGRAM_CHANNEL || '#instagram';
const CAPTION_MAX_LENGTH = 300;
const POST_INTERVAL_MS = 1000; // 1 second between posts

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
    // No previous data, treat all as new
    return current.posts;
  }

  const previousIds = new Set(previous.posts.map((p) => p.id));
  return current.posts.filter((p) => !previousIds.has(p.id));
}

function truncateCaption(caption: string): string {
  if (caption.length <= CAPTION_MAX_LENGTH) {
    return caption;
  }
  return caption.slice(0, CAPTION_MAX_LENGTH) + '...';
}

function formatTimestampJST(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);

  // Format in Japan Standard Time
  const formatter = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return formatter.format(date);
}

function buildSlackBlocks(post: InstagramPost): SlackBlock[] {
  const caption = truncateCaption(post.caption || '(キャプションなし)');
  const timestamp = formatTimestampJST(post.timestamp);

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*:camera: 新しいInstagram投稿*\n\n${caption}`,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `:date: ${timestamp}`,
        },
      ],
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Instagramで見る',
            emoji: true,
          },
          url: post.permalink,
        },
      ],
    },
  ];
}

async function sendSlackMessage(blocks: SlackBlock[]): Promise<boolean> {
  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      blocks,
    }),
  });

  const result = (await response.json()) as { ok: boolean; error?: string };

  if (!result.ok) {
    console.error(`Slack API error: ${result.error}`);
    return false;
  }

  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========== Main ==========

async function main() {
  const { previousPostsPath, dryRun } = parseArgs();

  if (!previousPostsPath) {
    console.error('Usage: npx tsx scripts/notify-slack-instagram.ts <previous-posts.json> [--dry-run]');
    process.exit(1);
  }

  // Check for Slack token
  if (!SLACK_BOT_TOKEN && !dryRun) {
    console.warn('SLACK_BOT_OAUTH_TOKEN is not set. Skipping Slack notification.');
    process.exit(0);
  }

  // Read previous and current posts
  const [previousPosts, currentPosts] = await Promise.all([
    readPostsJson(previousPostsPath),
    readPostsJson(CURRENT_POSTS_PATH),
  ]);

  if (!currentPosts) {
    console.error(`Current posts file not found: ${CURRENT_POSTS_PATH}`);
    process.exit(1);
  }

  // Find new posts
  const newPosts = findNewPosts(previousPosts, currentPosts);

  if (newPosts.length === 0) {
    console.log('No new Instagram posts detected.');
    return;
  }

  console.log(`Found ${newPosts.length} new post(s).`);

  // Sort by timestamp (oldest first) to maintain chronological order
  newPosts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Send notifications
  for (let i = 0; i < newPosts.length; i++) {
    const post = newPosts[i];
    const blocks = buildSlackBlocks(post);

    if (dryRun) {
      console.log(`\n[DRY-RUN] Would send notification for post: ${post.id}`);
      console.log(`  Permalink: ${post.permalink}`);
      console.log(`  Timestamp: ${formatTimestampJST(post.timestamp)}`);
      console.log(`  Caption: ${truncateCaption(post.caption || '(キャプションなし)')}`);
      console.log('  Blocks:', JSON.stringify(blocks, null, 2));
    } else {
      console.log(`Sending notification for post: ${post.id}`);

      try {
        const success = await sendSlackMessage(blocks);
        if (success) {
          console.log(`  Successfully sent notification.`);
        } else {
          console.error(`  Failed to send notification (API returned error).`);
          // Don't fail the workflow for API errors
        }
      } catch (error) {
        console.error(`  Failed to send notification:`, error);
        // Don't fail the workflow for network/auth errors
      }

      // Wait before sending next message (rate limiting)
      if (i < newPosts.length - 1) {
        await sleep(POST_INTERVAL_MS);
      }
    }
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('notify-slack-instagram failed:', e);
  process.exit(1);
});
