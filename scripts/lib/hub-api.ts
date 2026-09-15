// scripts/lib/hub-api.ts
// hub 公開 API の取得（build-members.ts / check-deploy.ts で共有する）。
// キー値はログやエラーメッセージに出さない（ステータスコードのみを伝える）。

export const DEFAULT_HUB_API_URL = 'https://hub.triax.football/api/1/public/members';

/**
 * X-API-Key を付けて hub 公開 API を取得し、JSON を返す。
 * 到達不能・非 200・JSON でない場合は、そのままログに出せる日本語メッセージの Error を投げる。
 */
export async function fetchHubJson<T>(url: string, apiKey: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { 'X-API-Key': apiKey } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`hub API に到達できませんでした: ${reason}`);
  }

  if (!response.ok) {
    const hint = response.status === 401 ? '（HUB_API_KEY が不正か失効しています）' : '';
    const status = [response.status, response.statusText].filter(Boolean).join(' ');
    throw new Error(`hub API が ${status} を返しました${hint}`);
  }

  try {
    return await response.json() as T;
  } catch {
    throw new Error('hub API のレスポンスを JSON として解釈できませんでした');
  }
}
