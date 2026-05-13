export interface FinalizeChallengePayload {
  challengeId: string;
  winnerWallet: string | null;
  challengerWallet: string;
  opponentWallet: string | null;
}

export interface FinalizeChallengeResult {
  digest: string;
  finalizedAtMs: number;
}

export interface IChainAdapter {
  finalizeChallenge(payload: FinalizeChallengePayload): Promise<FinalizeChallengeResult>;
}
