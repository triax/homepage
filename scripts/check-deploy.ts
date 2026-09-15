#!/usr/bin/env tsx

/**
 * GitHub Pages へのデプロイが必要かを判定するスクリプト（deploy-pages.yml の check ジョブで使う）
 *
 * 公開中のサイト自身が持つビルド情報（build-info.json の commit / roster.json の hub_digest）と、
 * これからビルドするコミット・hub の現在の digest を比べ、変化があったときだけデプロイさせる。
 * 判定ルールは scripts/lib/deploy-decision.ts、決定経緯は ADR-012 を参照。
 *
 * 使用方法:
 *   GITHUB_EVENT_NAME=schedule GITHUB_SHA=$(git rev-parse HEAD) HUB_API_KEY=<key> pnpm deploy:check
 *
 * 環境変数:
 *   GITHUB_EVENT_NAME  必須。push / workflow_run / schedule / workflow_dispatch
 *   GITHUB_SHA         必須。これからビルドするコミット
 *   DEPLOY_FORCE       任意。workflow_dispatch の force 入力（"true" / "false"、既定は false）
 *   HUB_API_KEY        判定に hub の digest が要るとき必須（push と force=true の手動実行では不要）
 *   HUB_API_URL        任意。hub 公開 API の上書き（digest は `${HUB_API_URL}/digest` から取る）
 *   SITE_URL           任意。公開中のサイト（既定は https://www.triax.football）
 *   GITHUB_OUTPUT      Actions が設定する。should_deploy=true|false を追記する
 *
 * hub の digest が取れない（キー未設定・401・到達不能）ときは終了コード 1 で失敗し、デプロイさせない。
 * 公開中のサイトが読めないとき（初回・404 など）は失敗にせず、デプロイする側に倒す。
 */

import * as fs from 'fs';

import { DeployedState, needsHubDigest, shouldDeploy } from './lib/deploy-decision';
import { DEFAULT_HUB_API_URL, fetchHubJson } from './lib/hub-api';

const HUB_API_URL = process.env.HUB_API_URL || DEFAULT_HUB_API_URL;
const SITE_URL = (process.env.SITE_URL || 'https://www.triax.football').replace(/\/+$/, '');

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function requireEnv(name: string, hint = ''): string {
  const value = process.env[name];
  if (!value) {
    fail(`環境変数 ${name} が設定されていません${hint}`);
  }
  return value;
}

function parseForce(value: string | undefined): boolean {
  if (!value || value === 'false') return false;
  if (value === 'true') return true;
  return fail(`DEPLOY_FORCE には "true" か "false" を指定してください（指定値: ${value}）`);
}

/** ログ用に SHA / digest を短くする（どちらも秘密情報ではない） */
function short(value: string | null): string {
  if (value === null) return '(なし)';
  return value.startsWith('sha256:') ? value.slice(0, 'sha256:'.length + 12) : value.slice(0, 7);
}

async function fetchHubDigest(apiKey: string): Promise<string> {
  const url = `${HUB_API_URL.replace(/\/+$/, '')}/digest`;
  console.log(`📥 hub の digest を取得中... ${url}`);

  const body = await fetchHubJson<{ digest?: unknown }>(url, apiKey)
    .catch((error: Error) => fail(error.message));
  if (typeof body.digest !== 'string' || body.digest === '') {
    fail('hub API のレスポンスに digest がありません');
  }
  return body.digest;
}

/** 公開中のサイトの JSON を取得する。CDN の max-age=600 を避けるためクエリを付ける */
async function fetchLiveJson(assetPath: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${SITE_URL}/${assetPath}?t=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`${assetPath} が ${response.status} を返しました`);
  }
  const body: unknown = await response.json().catch(() => null);
  if (typeof body !== 'object' || body === null) {
    throw new Error(`${assetPath} を JSON オブジェクトとして解釈できませんでした`);
  }
  return body as Record<string, unknown>;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/** 公開中のサイトがビルドされた状態を読む。読めなければ null（＝初回扱い） */
async function readDeployedState(): Promise<DeployedState | null> {
  console.log(`📥 公開中のビルド情報を取得中... ${SITE_URL}`);
  try {
    const [buildInfo, roster] = await Promise.all([
      fetchLiveJson('assets/build-info.json'),
      fetchLiveJson('assets/roster.json'),
    ]);
    return {
      commit: stringOrNull(buildInfo.commit),
      hubDigest: stringOrNull(roster.hub_digest),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.log(`   公開中のビルド情報を読めませんでした: ${reason}`);
    return null;
  }
}

function writeOutput(deploy: boolean) {
  const line = `should_deploy=${deploy}`;
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${line}\n`);
  }
  console.log(line);
}

async function checkDeploy() {
  const event = requireEnv('GITHUB_EVENT_NAME');
  const headSha = requireEnv('GITHUB_SHA');
  const force = parseForce(process.env.DEPLOY_FORCE);

  console.log('🔎 デプロイ要否を判定します');
  console.log(`   event: ${event}${event === 'workflow_dispatch' ? ` (force=${force})` : ''}`);
  console.log(`   head:  ${short(headSha)}`);

  let deployed: DeployedState | null = null;
  let hubDigest: string | null = null;

  if (needsHubDigest(event, force)) {
    const apiKey = requireEnv('HUB_API_KEY', '（GitHub Actions では secrets.HUB_API_KEY）');
    hubDigest = await fetchHubDigest(apiKey);
    deployed = await readDeployedState();

    const state = (commit: string | null, digest: string | null) =>
      `commit=${short(commit)} hub_digest=${short(digest)}`;
    console.log(`   公開中: ${state(deployed?.commit ?? null, deployed?.hubDigest ?? null)}`);
    console.log(`   現在:   ${state(headSha, hubDigest)}`);
  }

  const decision = shouldDeploy({ event, force, headSha, deployed, hubDigest });
  console.log(`${decision.deploy ? '🚀' : '⏭️'} ${decision.reason}`);
  writeOutput(decision.deploy);
}

checkDeploy().catch((e) => {
  console.error('check-deploy failed:', e);
  process.exit(1);
});
