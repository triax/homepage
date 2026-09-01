#!/usr/bin/env tsx

/**
 * hub 公開 API からメンバー情報を取得し、ホームページ用の生成物を組み立てるビルドスクリプト
 *
 * 生成物（いずれも .gitignore 済み。リポジトリにはコミットしない）:
 *   - docs/assets/roster.json    正規化済みメンバーデータ（v2 スキーマ）
 *   - docs/assets/members/*.jpg  長辺 800px に縮小した JPEG 写真
 *
 * 使用方法:
 *   HUB_API_KEY=<key> npm run build:members
 *
 * 環境変数:
 *   HUB_API_KEY  必須。hub の公開 API キー（X-API-Key ヘッダに載せる）
 *   HUB_API_URL  任意。取得先の上書き（既定は hub 本番の公開 API）
 *
 * hub が落ちている・キーが無い・公開対象が 0 件などの異常時は、生成物を一切書き換えずに
 * 終了コード 1 で失敗する（空のメンバー一覧で本番を上書きしないため）。
 */

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const DEFAULT_HUB_API_URL = 'https://hub.triax.football/api/1/public/members';
const HUB_API_URL = process.env.HUB_API_URL || DEFAULT_HUB_API_URL;

// npm script 経由でリポジトリルートから実行する前提
const PHOTO_DIR = path.join('docs', 'assets', 'members');
const ROSTER_PATH = path.join('docs', 'assets', 'roster.json');
const PHOTO_DIR_URL_PREFIX = 'assets/members';

const PHOTO_MAX_EDGE = 800;
const PHOTO_QUALITY = 85;

interface CustomField {
  key: string;
  value: string;
}

/** hub 公開 API の hp_profile。未保存のプロフィールではキーごと省略されうる */
interface HubProfile {
  display_name?: string;
  display_name_kana?: string;
  first_name?: string;
  family_name?: string;
  height?: number;
  weight?: number;
  position?: string;
  hometown?: string;
  school?: string;
  bio?: string;
  role?: string;
  enthusiasm?: string;
  watchme?: string;
  hobbies?: string;
  favorite?: string;
  what_i_like_about_triax?: string;
  custom_fields?: CustomField[] | null;
  portrait_formal_url?: string;
  portrait_casual_url?: string;
  additional_photo_urls?: string[] | null;
  hide_from_hp?: boolean;
}

interface HubMember {
  slack_id: string;
  name: string;
  number: number | null;
  /** 一度も保存されていないプロフィールではキーごと省略される（hub 側 omitzero） */
  updated_at?: string;
  hp_profile: HubProfile;
}

interface HubResponse {
  members?: HubMember[];
  generated_at?: string;
}

interface RosterMember {
  id: string;
  updated_at: string | null;
  name: {
    default: string;
    kana: string;
    alphabet: string;
  };
  number: number | null;
  position: string;
  role: string;
  photos: {
    formal: string;
    casual: string[];
  };
  height: number | null;
  weight: number | null;
  hometown: string;
  school: string;
  bio: string;
  enthusiasm: string;
  watchme: string;
  hobbies: string;
  favorite: string;
  what_i_like_about_triax: string;
  custom_fields: CustomField[];
}

/** ダウンロード済み・変換済みの写真。全件揃ってから一括で書き出す */
interface PendingPhoto {
  filename: string;
  data: Buffer;
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function text(value: string | undefined): string {
  return value ?? '';
}

/** hub は未入力の数値を 0 で返すため、0 は「未設定」として null に寄せる */
function positiveOrNull(value: number | undefined): number | null {
  return value ? value : null;
}

/**
 * hub 公開 API からメンバー一覧を取得する。
 * キー値はログに出さない（エラー時もステータスコードのみを表示する）。
 */
async function fetchHubMembers(apiKey: string): Promise<HubResponse> {
  let response: Response;
  try {
    response = await fetch(HUB_API_URL, { headers: { 'X-API-Key': apiKey } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return fail(`hub API に到達できませんでした: ${reason}`);
  }

  if (!response.ok) {
    const hint = response.status === 401 ? '（HUB_API_KEY が不正か失効しています）' : '';
    const status = [response.status, response.statusText].filter(Boolean).join(' ');
    return fail(`hub API が ${status} を返しました${hint}`);
  }

  try {
    return await response.json() as HubResponse;
  } catch {
    return fail('hub API のレスポンスを JSON として解釈できませんでした');
  }
}

/**
 * ホームページに掲載するメンバーの条件。
 * hub 側でも未入力メンバーと非掲載メンバーは除外済みだが、防御的に homepage 側でも判定する。
 */
function isPublishable(member: HubMember): boolean {
  const profile = member.hp_profile;
  if (!profile) return false;
  if (profile.hide_from_hp) return false;
  return text(profile.position).trim() !== '';
}

function displayName(member: HubMember): string {
  return text(member.hp_profile.display_name).trim() || member.name;
}

function alphabetName(profile: HubProfile): string {
  return [text(profile.first_name).trim(), text(profile.family_name).trim()]
    .filter(Boolean)
    .join(' ');
}

/**
 * 写真を 1 枚ダウンロードし、長辺 PHOTO_MAX_EDGE の JPEG に変換する。
 * 元画像は PNG も混在するため、透過は白背景に落としてから JPEG 化する。
 */
async function downloadPhoto(url: string, filename: string): Promise<PendingPhoto> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return fail(`写真のダウンロードに失敗しました (${filename}): ${reason}`);
  }

  if (!response.ok) {
    return fail(`写真のダウンロードに失敗しました (${filename}): ${response.status}`);
  }

  const source = Buffer.from(await response.arrayBuffer());
  try {
    const data = await sharp(source)
      .rotate()
      .resize({
        width: PHOTO_MAX_EDGE,
        height: PHOTO_MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: PHOTO_QUALITY })
      .toBuffer();
    return { filename, data };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return fail(`写真の変換に失敗しました (${filename}): ${reason}`);
  }
}

/**
 * 1 メンバー分の写真を集める。formal / casual / additional の順に並べ、
 * ローカルの相対パスと書き出し待ちのバッファを返す。
 */
async function collectPhotos(
  member: HubMember,
  pending: PendingPhoto[],
): Promise<RosterMember['photos']> {
  const profile = member.hp_profile;

  const add = async (url: string | undefined, suffix: string): Promise<string> => {
    if (!url) return '';
    const filename = `${member.slack_id}-${suffix}.jpg`;
    pending.push(await downloadPhoto(url, filename));
    return `${PHOTO_DIR_URL_PREFIX}/${filename}`;
  };

  const formal = await add(profile.portrait_formal_url, 'formal');
  const casual: string[] = [];

  const casualPath = await add(profile.portrait_casual_url, 'casual');
  if (casualPath) casual.push(casualPath);

  const additional = profile.additional_photo_urls ?? [];
  for (const [index, url] of additional.entries()) {
    const additionalPath = await add(url, `additional-${index + 1}`);
    if (additionalPath) casual.push(additionalPath);
  }

  return { formal, casual };
}

async function toRosterMember(member: HubMember, pending: PendingPhoto[]): Promise<RosterMember> {
  const profile = member.hp_profile;
  return {
    id: member.slack_id,
    updated_at: member.updated_at ?? null,
    name: {
      default: displayName(member),
      kana: text(profile.display_name_kana),
      alphabet: alphabetName(profile),
    },
    number: member.number ?? null,
    position: text(profile.position).trim(),
    role: text(profile.role),
    photos: await collectPhotos(member, pending),
    height: positiveOrNull(profile.height),
    weight: positiveOrNull(profile.weight),
    hometown: text(profile.hometown),
    school: text(profile.school),
    bio: text(profile.bio),
    enthusiasm: text(profile.enthusiasm),
    watchme: text(profile.watchme),
    hobbies: text(profile.hobbies),
    favorite: text(profile.favorite),
    what_i_like_about_triax: text(profile.what_i_like_about_triax),
    custom_fields: profile.custom_fields ?? [],
  };
}

/** 退団者の写真が残らないよう、写真ディレクトリは毎回作り直す */
function writePhotos(photos: PendingPhoto[]) {
  fs.rmSync(PHOTO_DIR, { recursive: true, force: true });
  fs.mkdirSync(PHOTO_DIR, { recursive: true });
  for (const photo of photos) {
    fs.writeFileSync(path.join(PHOTO_DIR, photo.filename), photo.data);
  }
}

async function buildMembers() {
  const apiKey = process.env.HUB_API_KEY;
  if (!apiKey) {
    fail('環境変数 HUB_API_KEY が設定されていません（GitHub Actions では secrets.HUB_API_KEY）');
  }

  console.log('📥 hub 公開 API からメンバー情報を取得中...');
  console.log(`   URL: ${HUB_API_URL}`);

  const response = await fetchHubMembers(apiKey);
  if (!Array.isArray(response.members)) {
    fail('hub API のレスポンスに members 配列がありません');
  }

  const publishable = response.members.filter(isPublishable);
  console.log(`   取得: ${response.members.length}名 / 掲載対象: ${publishable.length}名`);
  if (publishable.length === 0) {
    fail('掲載対象のメンバーが 0 名でした（空の一覧で生成物を上書きしません）');
  }

  // stellar:debt(perf) 毎ビルドで全写真を再取得・再変換し、メモリ上に貯めてから書き出す前提。
  // upgrade: 掲載枚数が増えたら URL の更新時刻で差分判定するか actions/cache でキャッシュする
  const pending: PendingPhoto[] = [];
  const members: RosterMember[] = [];
  for (const member of publishable) {
    members.push(await toRosterMember(member, pending));
  }

  // ここまで失敗しなかった場合のみ生成物へ書き込む（roster.json は最後）
  writePhotos(pending);

  const roster = {
    version: '2.0',
    generated_at: response.generated_at || new Date().toISOString(),
    source: HUB_API_URL,
    members,
  };
  fs.writeFileSync(ROSTER_PATH, `${JSON.stringify(roster, null, 2)}\n`);

  console.log('✅ メンバーデータのビルドが完了しました！');
  console.log(`   ${ROSTER_PATH}: ${members.length}名`);
  console.log(`   ${PHOTO_DIR}: ${pending.length}枚`);
}

buildMembers().catch((e) => {
  console.error('build-members failed:', e);
  process.exit(1);
});
