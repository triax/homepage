// scripts/lib/x-oauth.ts
// OAuth 1.0a (HMAC-SHA1) の Authorization ヘッダ生成。
// kanColleWidget の post-tweet.ts から buildOAuthHeader / sortParams / percentEncode を抽出。
//
// 重要: multipart/form-data でPOSTする場合、フォームのフィールドは署名のベース文字列に
// 含めない（URLのクエリパラメータのみが署名対象）。media upload の INIT/APPEND/FINALIZE は
// この前提で動作する。GETのSTATUSはクエリパラメータが署名に含まれる。

import crypto from 'node:crypto';

export interface OAuthConfig {
  method: 'POST' | 'GET';
  url: URL;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export const buildOAuthHeader = (config: OAuthConfig): string => {
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const baseUrl = `${config.url.origin}${config.url.pathname}`;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: config.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: config.accessToken,
    oauth_version: '1.0',
  };

  const signatureParams = [
    ...Object.entries(oauthParams),
    ...Array.from(config.url.searchParams.entries()),
  ].sort(sortParams);

  const parameterString = signatureParams
    .map(([key, value]) => `${percentEncode(key)}=${percentEncode(value)}`)
    .join('&');

  const signatureBase = [
    config.method.toUpperCase(),
    percentEncode(baseUrl),
    percentEncode(parameterString),
  ].join('&');

  const signingKey =
    `${percentEncode(config.consumerSecret)}&${percentEncode(config.accessTokenSecret)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');

  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
  };

  const headerString = Object.entries(headerParams)
    .sort(sortParams)
    .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
    .join(', ');

  return `OAuth ${headerString}`;
};

export const sortParams = (
  [aKey, aValue]: [string, string],
  [bKey, bValue]: [string, string]
): number => (aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey));

export const percentEncode = (input: string): string =>
  encodeURIComponent(input).replace(
    /[!*()']/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
