// scripts/lib/x-media-upload.ts
// Instagram の media_url（画像/動画）からバイナリを取得し、
// X API v2 の media upload で media_id を得る。
//
// 仕様確認（2026-06 時点, https://docs.x.com/x-api/media/quickstart/media-upload-chunked）:
// - エンドポイントは POST https://api.x.com/2/media/upload （multipart/form-data, command方式）
//   ※ REST形式の /2/media/upload/initialize は OAuth 1.0a で 401 になるため使わない
// - INIT     : command=INIT, media_type, total_bytes, media_category → data.id (= media_id)
// - APPEND   : command=APPEND, media_id, segment_index, media(バイナリchunk)
// - FINALIZE : command=FINALIZE, media_id → data（動画は processing_info を含む）
// - STATUS   : GET ?command=STATUS&media_id=... → processing_info.state / check_after_secs
// - 投稿時は POST /2/tweets に media.media_ids を渡す
//
// 注意: multipart/form-data の場合、フォームフィールドはOAuth署名のベース文字列に含めない。

import { buildOAuthHeader, OAuthConfig } from './x-oauth';

const UPLOAD_ENDPOINT = 'https://api.x.com/2/media/upload';
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB（Xの推奨chunkサイズ）
const STATUS_POLL_MAX_ATTEMPTS = 20; // 動画processingのポーリング最大回数

// 署名に必要なX APIの認証情報（OAuth 1.0a）
export interface XOAuthCreds {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface UploadInitResponse {
  data?: { id?: string; media_key?: string };
  // FINALIZE/STATUSで処理中の動画に付与される
  processing_info?: ProcessingInfo;
}

interface ProcessingInfo {
  state: 'pending' | 'in_progress' | 'succeeded' | 'failed';
  check_after_secs?: number;
  error?: { code: number; name: string; message: string };
}

interface FinalizeResponse {
  data?: { id?: string; processing_info?: ProcessingInfo };
  processing_info?: ProcessingInfo;
}

// command方式のmedia uploadへPOSTする（multipart/form-data）。
// 署名対象はクエリパラメータのみ（フォーム本体は含めない）ため、URLはパスだけで署名する。
async function postUpload(creds: XOAuthCreds, form: FormData): Promise<Response> {
  const url = new URL(UPLOAD_ENDPOINT);
  const authorization = buildOAuthHeader(buildOAuthConfig('POST', url, creds));

  return fetch(url, {
    method: 'POST',
    headers: { Authorization: authorization },
    body: form,
  });
}

function buildOAuthConfig(method: 'POST' | 'GET', url: URL, creds: XOAuthCreds): OAuthConfig {
  return {
    method,
    url,
    consumerKey: creds.consumerKey,
    consumerSecret: creds.consumerSecret,
    accessToken: creds.accessToken,
    accessTokenSecret: creds.accessTokenSecret,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Instagramのmedia_urlからバイナリを取得
async function downloadMedia(mediaUrl: string): Promise<{ bytes: Buffer; contentType: string }> {
  const res = await fetch(mediaUrl);
  if (!res.ok) {
    throw new Error(`メディア取得に失敗: HTTP ${res.status} ${res.statusText}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  const contentType =
    res.headers.get('content-type') || 'application/octet-stream';
  return { bytes: Buffer.from(arrayBuffer), contentType };
}

// mediaTypeとContent-Typeから、X APIに渡す media_type / media_category を決定
function resolveMediaMeta(
  mediaType: 'image' | 'video',
  contentType: string
): { mediaType: string; mediaCategory: string } {
  if (mediaType === 'video') {
    // Content-Typeがvideo/*でない場合もmp4とみなす（InstagramのCDNはmp4を返す）
    const resolved = contentType.startsWith('video/') ? contentType : 'video/mp4';
    return { mediaType: resolved, mediaCategory: 'tweet_video' };
  }
  const resolved = contentType.startsWith('image/') ? contentType : 'image/jpeg';
  return { mediaType: resolved, mediaCategory: 'tweet_image' };
}

// INIT: アップロードを初期化し media_id を得る
async function initUpload(
  creds: XOAuthCreds,
  totalBytes: number,
  mediaType: string,
  mediaCategory: string
): Promise<string> {
  const form = new FormData();
  form.append('command', 'INIT');
  form.append('total_bytes', String(totalBytes));
  form.append('media_type', mediaType);
  form.append('media_category', mediaCategory);

  const res = await postUpload(creds, form);
  const body = (await res.json()) as UploadInitResponse;
  const mediaId = body.data?.id;
  if (!res.ok || !mediaId) {
    throw new Error(`INIT失敗: HTTP ${res.status} ${JSON.stringify(body)}`);
  }
  return mediaId;
}

// APPEND: バイナリをchunkに分割して順次アップロード
async function appendUpload(creds: XOAuthCreds, mediaId: string, bytes: Buffer): Promise<void> {
  let segmentIndex = 0;
  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    const chunk = bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, bytes.length));
    const form = new FormData();
    form.append('command', 'APPEND');
    form.append('media_id', mediaId);
    form.append('segment_index', String(segmentIndex));
    // Bufferをそのまま渡せないため Blob 化して付与
    form.append('media', new Blob([new Uint8Array(chunk)]));

    const res = await postUpload(creds, form);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`APPEND失敗 (segment ${segmentIndex}): HTTP ${res.status} ${text}`);
    }
    segmentIndex++;
  }
}

// FINALIZE: アップロードを確定。動画の場合は processing_info が返る
async function finalizeUpload(creds: XOAuthCreds, mediaId: string): Promise<ProcessingInfo | null> {
  const form = new FormData();
  form.append('command', 'FINALIZE');
  form.append('media_id', mediaId);

  const res = await postUpload(creds, form);
  const body = (await res.json()) as FinalizeResponse;
  if (!res.ok) {
    throw new Error(`FINALIZE失敗: HTTP ${res.status} ${JSON.stringify(body)}`);
  }
  return body.processing_info ?? body.data?.processing_info ?? null;
}

// STATUS: 動画のトランスコード完了（state=succeeded）までポーリング
async function waitForProcessing(
  creds: XOAuthCreds,
  mediaId: string,
  initial: ProcessingInfo
): Promise<void> {
  let info: ProcessingInfo | null = initial;

  for (let attempt = 0; attempt < STATUS_POLL_MAX_ATTEMPTS; attempt++) {
    if (!info || info.state === 'succeeded') {
      return;
    }
    if (info.state === 'failed') {
      throw new Error(`メディア処理に失敗: ${JSON.stringify(info.error ?? {})}`);
    }

    // check_after_secs を尊重して待機（未指定なら5秒）
    const waitSecs = info.check_after_secs ?? 5;
    await sleep(waitSecs * 1000);

    const url = new URL(UPLOAD_ENDPOINT);
    url.searchParams.set('command', 'STATUS');
    url.searchParams.set('media_id', mediaId);
    const authorization = buildOAuthHeader(buildOAuthConfig('GET', url, creds));

    const res = await fetch(url, { headers: { Authorization: authorization } });
    const body = (await res.json()) as UploadInitResponse;
    if (!res.ok) {
      throw new Error(`STATUS失敗: HTTP ${res.status} ${JSON.stringify(body)}`);
    }
    info = body.processing_info ?? null;
  }

  throw new Error(`メディア処理がタイムアウトしました (media_id=${mediaId})`);
}

// 画像のシンプルアップロード（非chunked）。
// v2 の /2/media/upload は command方式のmultipartを受け付けず、`media` フィールドを持つ
// JSONボディ（base64）を要求する（エラー: "$.media is missing but it is required"）。
// 画像は5MB以下に収まるためchunkedは不要で、1リクエストで media_id を得る。
// OAuth 1.0a署名はメソッド+URL+クエリのみが対象でJSONボディは署名に含めないため、そのまま送れる。
async function uploadImageSimple(
  creds: XOAuthCreds,
  bytes: Buffer,
  mediaCategory: string
): Promise<string> {
  const url = new URL(UPLOAD_ENDPOINT);
  const authorization = buildOAuthHeader(buildOAuthConfig('POST', url, creds));

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ media: bytes.toString('base64'), media_category: mediaCategory }),
  });

  const body = (await res.json()) as UploadInitResponse & { id?: string; media_id_string?: string };
  const mediaId = body.data?.id ?? body.id ?? body.media_id_string;
  if (!res.ok || !mediaId) {
    throw new Error(`画像アップロード失敗: HTTP ${res.status} ${JSON.stringify(body)}`);
  }
  return mediaId;
}

// 動画の chunked アップロード（INIT/APPEND/FINALIZE → 処理完了待ち）。
async function uploadVideoChunked(
  creds: XOAuthCreds,
  bytes: Buffer,
  mediaType: string,
  mediaCategory: string
): Promise<string> {
  const mediaId = await initUpload(creds, bytes.length, mediaType, mediaCategory);
  await appendUpload(creds, mediaId, bytes);
  const processingInfo = await finalizeUpload(creds, mediaId);

  if (processingInfo) {
    await waitForProcessing(creds, mediaId, processingInfo);
  }

  return mediaId;
}

/**
 * 単一メディア（画像 or 動画）をX APIにアップロードし media_id_string を返す。
 * 画像はシンプルアップロード（JSON+base64）、動画は chunked (INIT/APPEND/FINALIZE)。
 */
export async function uploadMedia(
  creds: XOAuthCreds,
  mediaUrl: string,
  mediaType: 'image' | 'video'
): Promise<string> {
  const { bytes, contentType } = await downloadMedia(mediaUrl);
  const meta = resolveMediaMeta(mediaType, contentType);

  if (mediaType === 'image') {
    return uploadImageSimple(creds, bytes, meta.mediaCategory);
  }
  return uploadVideoChunked(creds, bytes, meta.mediaType, meta.mediaCategory);
}
