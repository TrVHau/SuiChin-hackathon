export interface FinalizeChallengePayload {
  challengeId: string;
  winnerWallet: string | null;
  stakeEnabled: boolean;
  stakeAmount: number;
}

export interface FinalizeChallengeResult {
  digest: string;
  finalizedAtMs: number;
}

export interface IChainAdapter {
  finalizeChallenge(payload: FinalizeChallengePayload): Promise<FinalizeChallengeResult>;
}
