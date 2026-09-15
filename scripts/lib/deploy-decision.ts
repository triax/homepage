// scripts/lib/deploy-decision.ts
// デプロイ要否の判定（純粋関数。I/O は scripts/check-deploy.ts が受け持つ）。
//
// 公開中のサイト自身が「どのコミット・どの hub digest からビルドされたか」を持っており、
// それと今の状態を比べて変化があったときだけデプロイする（ADR-012）。

/** 公開中のサイトがビルドされた状態。値が読めなかった項目は null */
export interface DeployedState {
  commit: string | null;
  hubDigest: string | null;
}

export interface DeployDecisionInput {
  /** github.event_name */
  event: string;
  /** workflow_dispatch の入力。他のイベントでは無視する */
  force: boolean;
  /** これからビルドするコミット（github.sha） */
  headSha: string;
  /** 公開中の状態。null は読めなかった（初回・404 など） */
  deployed: DeployedState | null;
  /** hub の現在の digest。取得していなければ null */
  hubDigest: string | null;
}

export interface DeployDecision {
  deploy: boolean;
  /** ログに出す短い理由 */
  reason: string;
}

/** 変化の有無を問わず必ずデプロイするイベントか */
function isUnconditional(event: string, force: boolean): boolean {
  return event === 'push' || (event === 'workflow_dispatch' && force);
}

/** 判定に hub の digest が要るか（無条件デプロイなら hub を叩かずに済む） */
export function needsHubDigest(event: string, force: boolean): boolean {
  return !isUnconditional(event, force);
}

export function shouldDeploy(input: DeployDecisionInput): DeployDecision {
  const { event, force, headSha, deployed, hubDigest } = input;

  if (isUnconditional(event, force)) {
    const trigger = event === 'push' ? 'push のため' : '手動実行（force=true）のため';
    return { deploy: true, reason: `${trigger}無条件にデプロイする` };
  }
  if (deployed === null) {
    return { deploy: true, reason: '公開中のビルド情報が読めないためデプロイする' };
  }
  if (deployed.commit !== headSha) {
    return { deploy: true, reason: 'コミットが公開中と違うためデプロイする' };
  }
  // null はどちら側でも「違う」とみなす（取りこぼすより余分に 1 回デプロイする方を選ぶ）
  if (hubDigest === null || deployed.hubDigest !== hubDigest) {
    return { deploy: true, reason: 'hub の digest が公開中の値と違うためデプロイする' };
  }
  return { deploy: false, reason: 'コミットも hub の digest も公開中と同じためデプロイしない' };
}
