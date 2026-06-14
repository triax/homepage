// scripts/post-instagram-to-x.ts
// Node 20 + npx tsx で実行想定（fetch / FormData / Blob 標準搭載）
// 必要なSecrets: X_API_KEY, X_API_KEY_SECRET, X_BOT_ACCESS_TOKEN, X_BOT_ACCESS_TOKEN_SECRET
//
// posts.json の各投稿に持たせた `twitter` フィールドを状態として扱い、
// 「twitter==null（未投稿）」の投稿だけをTRIAX公式Xアカウントへクロスポストする。
// 投稿成功のたびに posts.json へ状態を書き戻すため、途中失敗しても既成功分は永続化され、
// 失敗分は次回run自動リトライされる（取りこぼしゼロ）。

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

// Xクロスポストの投稿済み状態。
// null=未投稿（クロスポスト対象）、object=投稿済み（tweet_id=null はバックフィル抑制分）
interface TwitterMeta {
  tweet_id: string | null; // 実際にツイートしたID。バックフィル抑制分は null
  posted_at: string; // ISO8601
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
  twitter: TwitterMeta | null;
}

interface PostsJson {
  fetched_at: string;
  user_id: string;
  count: number;
  metadata?: { x_crosspost_watermark?: string };
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
// 自前のweight計算とXの実カウントには差異があり（絵文字・特殊文字等）、
// 280ぎりぎりだと 403「You are not permitted」で弾かれることがある。
// 安全マージンを引いた実効上限でtruncateする。
const SAFETY_MARGIN = 20;
const EFFECTIVE_MAX_WEIGHT = MAX_TWEET_LENGTH - SAFETY_MARGIN;

const X_CREDS_ENV = {
  consumerKey: 'X_API_KEY',
  consumerSecret: 'X_API_KEY_SECRET',
  accessToken: 'X_BOT_ACCESS_TOKEN',
  accessTokenSecret: 'X_BOT_ACCESS_TOKEN_SECRET',
} as const;

// ========== Helper Functions ==========

function parseArgs(): { dryRun: boolean } {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  return { dryRun };
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

// timestampをエポックms（getTime）に変換する小ヘルパ。
// watermark比較・前進ロジックを一貫してgetTime()基準にするための要。
function toTime(ts: string): number {
  return new Date(ts).getTime();
}

// クロスポスト対象（eligible）= twitter==null かつ watermarkより「厳密に新しい」投稿。
// timestamp昇順（古い順）に並べ、X上のタイムラインの時系列を保つ。
// watermark以下（≦）の未投稿は stale-null として別扱いにし、ここには含めない。
function findEligiblePosts(posts: InstagramPost[], watermark: string): InstagramPost[] {
  const wm = toTime(watermark);
  return posts
    .filter((p) => p.twitter == null && toTime(p.timestamp) > wm)
    .sort((a, b) => toTime(a.timestamp) - toTime(b.timestamp));
}

// 状態喪失して再登場した古い未投稿（stale-null）= twitter==null かつ watermark以下（≦）。
// 一度Xへ投稿済みだったが posts.json の再生成で状態を失い、未投稿として復活した投稿を指す。
// これらはXへ投稿せず抑制マークを書くことで、二重投稿を構造的に防ぐ。
function findStaleNullPosts(posts: InstagramPost[], watermark: string): InstagramPost[] {
  const wm = toTime(watermark);
  return posts.filter((p) => p.twitter == null && toTime(p.timestamp) <= wm);
}

// run後の新しいwatermarkを算出する（単調非減少＝絶対に後退させない）。
// newWatermark = max(旧watermark, twitter!=null の全投稿の timestamp の最大) を getTime()比較で求め、
// その最大値を与える投稿の timestamp文字列をそのまま返す（旧watermarkの方が新しければ旧値を維持）。
// 含意: クロスポストに失敗した eligible は twitter==null のまま残るので watermark を押し上げず、
// ウィンドウ内に残る限り次回run で自動リトライされる。成功した最新まで watermark が前進する。
function computeNextWatermark(posts: InstagramPost[], watermark: string): string {
  let best = watermark;
  let bestTime = toTime(watermark);
  for (const p of posts) {
    if (p.twitter == null) continue; // 未投稿（失敗含む）は前進に寄与させない
    const t = toTime(p.timestamp);
    if (t > bestTime) {
      bestTime = t;
      best = p.timestamp;
    }
  }
  return best;
}

// ウィンドウ内の全投稿 timestamp の最大値（文字列）を返す。
// watermark欠損時のベースライン確立に使う。
function maxTimestamp(posts: InstagramPost[]): string | null {
  let best: string | null = null;
  let bestTime = -Infinity;
  for (const p of posts) {
    const t = toTime(p.timestamp);
    if (t > bestTime) {
      bestTime = t;
      best = p.timestamp;
    }
  }
  return best;
}

// dry-run用: eligibleが全て成功したと仮定したときの前進後watermarkを予測する。
// 実投稿では成功した投稿のみが twitter!=null になるため、実際の前進値はこれ以下になりうる。
function computeNextWatermarkAfterAllSuccess(posts: InstagramPost[], watermark: string): string {
  const wm = toTime(watermark);
  let best = watermark;
  let bestTime = wm;
  for (const p of posts) {
    // 投稿済み（twitter!=null）か、eligible（watermarkより新しい未投稿）が前進に寄与する
    const eligible = p.twitter == null && toTime(p.timestamp) > wm;
    if (p.twitter == null && !eligible) continue; // stale-null は前進に寄与しない
    const t = toTime(p.timestamp);
    if (t > bestTime) {
      bestTime = t;
      best = p.timestamp;
    }
  }
  return best;
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
  const captionBudget = EFFECTIVE_MAX_WEIGHT - fixedWeight;

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

// X API v2 /2/tweets へ投稿し、投稿したtweet idを返す
async function postTweet(creds: XOAuthCreds, text: string, mediaIds: string[]): Promise<string> {
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
  return body.data.id;
}

// posts.json 全体を書き戻す（fetch と同じ整形）。
// 投稿成功のたびに呼び、既成功分を都度永続化する。
async function writePostsJson(filePath: string, data: PostsJson): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ベースライン確立run（no-op投稿）。
// watermarkが欠損しているときの安全網。1件もクロスポストせず、watermark=現ウィンドウの
// timestamp最大 を確立し、twitter==null の全投稿に抑制マークを書く。
// これにより初回や欠損時にバックログを一斉投稿する事故を防ぐ。次回run以降は
// watermarkより新しい投稿だけが対象になる。
async function runBaseline(current: PostsJson, dryRun: boolean): Promise<void> {
  const baseline = maxTimestamp(current.posts);
  if (!baseline) {
    console.warn('watermark未設定かつ投稿が空のため、何もしません。');
    return;
  }

  console.warn(
    `watermark未設定のためベースライン確立runを実行（クロスポストはしません）: watermark=${baseline}`
  );

  for (const post of current.posts) {
    if (post.twitter != null) continue;
    console.warn(`  ベースライン抑制: post ${post.id} (timestamp ${post.timestamp})`);
    if (!dryRun) {
      post.twitter = { tweet_id: null, posted_at: new Date().toISOString() };
    }
  }

  if (dryRun) {
    console.log(`\n[DRY-RUN] baseline establish: eligible=0, newWatermark=${baseline}`);
    return;
  }

  current.metadata = { ...current.metadata, x_crosspost_watermark: baseline };
  await writePostsJson(CURRENT_POSTS_PATH, current);
  console.log(`Baseline established. watermark=${baseline}`);
}

// ========== Main ==========

async function main() {
  const { dryRun } = parseArgs();

  // X認証情報チェック（dry-run時は不要）
  const creds = getXCreds();
  if (!creds && !dryRun) {
    console.warn(
      'X API credentials are not set (X_API_KEY / X_API_KEY_SECRET / X_BOT_ACCESS_TOKEN / X_BOT_ACCESS_TOKEN_SECRET). Skipping X cross-post.'
    );
    process.exit(0);
  }

  // 現在のposts.jsonを読み込み
  const currentPosts = await readPostsJson(CURRENT_POSTS_PATH);

  if (!currentPosts) {
    console.error(`Current posts file not found: ${CURRENT_POSTS_PATH}`);
    process.exit(1);
  }

  const watermark = currentPosts.metadata?.x_crosspost_watermark;

  // ベースライン安全網: watermarkが読めない場合は今回1件もクロスポストせず、
  // watermark=現ウィンドウのtimestamp最大 を確立し、twitter==null の全投稿に抑制マークを書く。
  // これにより初回や欠損時にバックログを一斉投稿する事故を防ぐ。
  if (!watermark) {
    await runBaseline(currentPosts, dryRun);
    return;
  }

  // クロスポスト対象（eligible）と、状態喪失した古い未投稿（stale-null）を分離
  const eligiblePosts = findEligiblePosts(currentPosts.posts, watermark);
  const staleNullPosts = findStaleNullPosts(currentPosts.posts, watermark);

  // stale-null は X へ投稿せず抑制マークを書く（既存のバックフィル抑制と同じ表現で一貫性を保つ）
  for (const post of staleNullPosts) {
    console.warn(
      `watermark(${watermark})より古い未投稿を検出 → 抑制（再投稿防止）: post ${post.id} (timestamp ${post.timestamp})`
    );
    if (!dryRun) {
      post.twitter = { tweet_id: null, posted_at: new Date().toISOString() };
    }
  }

  // 算出される新しいwatermarkを先に求めてログに出す（stale-null抑制を反映した状態で）
  const nextWatermark = computeNextWatermark(currentPosts.posts, watermark);

  if (eligiblePosts.length === 0) {
    console.log('No eligible Instagram posts to cross-post.');
    console.log(
      `eligible=0, stale-null=${staleNullPosts.length}, newWatermark=${nextWatermark}` +
        (nextWatermark === watermark ? ' (unchanged)' : '')
    );
    // stale-null抑制とwatermark前進をファイルへ反映（dry-run時は書かない）
    if (!dryRun) {
      currentPosts.metadata = { ...currentPosts.metadata, x_crosspost_watermark: nextWatermark };
      await writePostsJson(CURRENT_POSTS_PATH, currentPosts);
    }
    return;
  }

  console.log(
    `Found ${eligiblePosts.length} eligible post(s). ` +
      `(stale-null suppressed: ${staleNullPosts.length})`
  );

  for (let i = 0; i < eligiblePosts.length; i++) {
    const post = eligiblePosts[i];
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
      const tweetId = await postTweet(creds as XOAuthCreds, text, mediaIds);

      // 投稿成功 → posts.json に状態を記録して都度書き戻す（途中失敗でも既成功分を永続化）
      // watermarkも成功分まで前進させて書き戻す（途中失敗でも既成功分の前進が永続化される）
      post.twitter = { tweet_id: tweetId, posted_at: new Date().toISOString() };
      currentPosts.metadata = {
        ...currentPosts.metadata,
        x_crosspost_watermark: computeNextWatermark(currentPosts.posts, watermark),
      };
      await writePostsJson(CURRENT_POSTS_PATH, currentPosts);
    } catch (error) {
      // 個別投稿の失敗はワークフローを落とさず次へ（twitterはnullのまま＝次回run自動リトライ）
      console.error(`  X投稿に失敗 (post ${post.id}):`, error);
    }

    // 次の投稿まで待機（rate limit対策）
    if (i < eligiblePosts.length - 1) {
      await sleep(POST_INTERVAL_MS);
    }
  }

  if (dryRun) {
    // dry-runではstale-null抑制を反映していないため、最終watermarkは
    // 「全eligibleが成功した場合」の前進値を提示する（実投稿の最大ケース）。
    const projected = computeNextWatermarkAfterAllSuccess(currentPosts.posts, watermark);
    console.log(
      `\n[DRY-RUN] eligible=${eligiblePosts.length}, stale-null=${staleNullPosts.length}, ` +
        `newWatermark=${projected}` +
        (projected === watermark ? ' (unchanged)' : '')
    );
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('post-instagram-to-x failed:', e);
  process.exit(1);
});
