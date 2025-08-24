// scripts/fetch-instagram.ts
// Node 20 + npx tsx で実行想定（fetch標準搭載）
// 必要なSecrets: IG_USER_ID, IG_ACCESS_TOKEN

import { promises as fs } from "fs";
import path from "path";

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

const IG_USER_ID = process.env.IG_USER_ID || "17841443759135863";
const IG_ACCESS_TOKEN = process.env.IG_ACCESS_TOKEN;
const IG_POST_LIMIT = Number(process.env.IG_LIMIT ?? 3); // 既定=3

const OUT_JSON = path.join("docs", "assets", "instagram", "posts.json");

if (!IG_USER_ID || !IG_ACCESS_TOKEN) {
  console.error("ENV missing: IG_USER_ID and IG_ACCESS_TOKEN are required.");
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

async function main() {
  const fields =
    "id,permalink,media_type,caption,timestamp,media_url,thumbnail_url,children{media_type,permalink,media_url}";
  const url =
    `https://graph.facebook.com/v22.0/${IG_USER_ID}/media` +
    `?fields=${encodeURIComponent(fields)}` +
    `&limit=${IG_POST_LIMIT}` +
    `&access_token=${encodeURIComponent(IG_ACCESS_TOKEN!)}`;

  const payload = await fetchJson<{ data: InstagramItem[] }>(url);
  const items = (payload?.data ?? []).slice().sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // 投稿データのみ（fetched_atを含まない）を作成
  const postsData = items.map((m) => ({
    id: m.id,
    permalink: m.permalink,
    media_type: m.media_type,
    caption: m.caption ?? "",
    timestamp: m.timestamp,
    media_url: m.media_url ?? null,
    thumbnail_url: m.thumbnail_url ?? null,
    children: m.children?.data ?? null,
  }));

  await ensureDir(OUT_JSON);

  // 既存ファイルを読み込んで投稿データ部分のみ比較
  let existingData: any = null;
  try {
    const existingContent = await fs.readFile(OUT_JSON, "utf8");
    existingData = JSON.parse(existingContent);
  } catch {}

  // 投稿データ部分が同じなら更新しない
  const existingPostsJson = existingData ? JSON.stringify(existingData.data) : "";
  const newPostsJson = JSON.stringify(postsData);
  
  if (existingPostsJson === newPostsJson) {
    console.log("No changes in posts data.");
    return;
  }

  // 投稿データが変わった場合のみfetched_atを更新して保存
  const out = {
    fetched_at: new Date().toISOString(),
    user_id: IG_USER_ID,
    count: postsData.length,
    data: postsData,
  };

  const next = JSON.stringify(out, null, 2) + "\n";
  await fs.writeFile(OUT_JSON, next, "utf8");
  console.log(`Wrote: ${OUT_JSON}`);
}

main().catch((e) => {
  console.error("fetch-instagram failed:", e);
  process.exit(1);
});