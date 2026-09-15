// scripts/lib/deploy-decision.test.ts
// デプロイ要否の判定ルール（ADR-012）のテスト。`pnpm test` で実行する。

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { DeployDecisionInput, needsHubDigest, shouldDeploy } from './deploy-decision';

const HEAD = 'a1b2c3d';
const DIGEST = 'sha256:aaaa';

/** 公開中の状態と今の状態が一致している入力を基準に、差分だけ上書きする */
function input(overrides: Partial<DeployDecisionInput>): DeployDecisionInput {
  return {
    event: 'schedule',
    force: false,
    headSha: HEAD,
    deployed: { commit: HEAD, hubDigest: DIGEST },
    hubDigest: DIGEST,
    ...overrides,
  };
}

describe('shouldDeploy', () => {
  describe('無条件にデプロイするイベント（AC-1）', () => {
    it('push は公開中と同じ状態でもデプロイする', () => {
      assert.equal(shouldDeploy(input({ event: 'push' })).deploy, true);
    });

    it('workflow_dispatch（force=true）は公開中と同じ状態でもデプロイする', () => {
      assert.equal(shouldDeploy(input({ event: 'workflow_dispatch', force: true })).deploy, true);
    });

    it('push は hub の digest を取得していなくてもデプロイする', () => {
      assert.equal(shouldDeploy(input({ event: 'push', hubDigest: null })).deploy, true);
    });
  });

  describe('変化があったときだけデプロイするイベント（AC-2）', () => {
    const cases: Partial<DeployDecisionInput>[] = [
      { event: 'schedule' },
      { event: 'workflow_run' },
      { event: 'workflow_dispatch', force: false },
    ];

    for (const base of cases) {
      const label = `${base.event}${base.force === false ? '（force=false）' : ''}`;

      it(`${label}: コミットも digest も同じならデプロイしない`, () => {
        assert.equal(shouldDeploy(input(base)).deploy, false);
      });

      it(`${label}: コミットが違えばデプロイする`, () => {
        assert.equal(shouldDeploy(input({ ...base, headSha: 'e4f5a6b' })).deploy, true);
      });

      it(`${label}: hub の digest が違えばデプロイする`, () => {
        assert.equal(shouldDeploy(input({ ...base, hubDigest: 'sha256:bbbb' })).deploy, true);
      });
    }

    it('schedule では force=true を無視する', () => {
      assert.equal(shouldDeploy(input({ event: 'schedule', force: true })).deploy, false);
    });
  });

  describe('公開中の状態が読めないとき（AC-3）', () => {
    it('公開中のビルド情報が無ければデプロイする', () => {
      assert.equal(shouldDeploy(input({ deployed: null })).deploy, true);
    });

    it('公開中の hub_digest が無ければデプロイする', () => {
      const deployed = { commit: HEAD, hubDigest: null };
      assert.equal(shouldDeploy(input({ deployed })).deploy, true);
    });

    it('公開中の commit が無ければデプロイする', () => {
      const deployed = { commit: null, hubDigest: DIGEST };
      assert.equal(shouldDeploy(input({ deployed })).deploy, true);
    });

    it('hub の digest が null なら（両側 null でも）デプロイする', () => {
      const deployed = { commit: HEAD, hubDigest: null };
      assert.equal(shouldDeploy(input({ deployed, hubDigest: null })).deploy, true);
    });
  });

  it('判定には必ず理由が付く', () => {
    assert.notEqual(shouldDeploy(input({})).reason, '');
    assert.notEqual(shouldDeploy(input({ event: 'push' })).reason, '');
  });
});

describe('needsHubDigest', () => {
  it('push と workflow_dispatch（force=true）では hub を叩かない', () => {
    assert.equal(needsHubDigest('push', false), false);
    assert.equal(needsHubDigest('workflow_dispatch', true), false);
  });

  it('schedule / workflow_run / workflow_dispatch（force=false）では digest が要る', () => {
    assert.equal(needsHubDigest('schedule', false), true);
    assert.equal(needsHubDigest('schedule', true), true);
    assert.equal(needsHubDigest('workflow_run', false), true);
    assert.equal(needsHubDigest('workflow_dispatch', false), true);
  });
});
