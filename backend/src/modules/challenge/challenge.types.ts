export type MatchMode = "REALTIME" | "ASYNC";
export type ChallengeStatus =
  | "OPEN"
  | "ACCEPTED"
  | "ACTIVE"
  | "SUBMITTED"
  | "FINALIZED"
  | "CANCELLED"
  | "EXPIRED";
export type MatchResult = "WIN" | "LOSE" | "DRAW" | "FORFEIT";

export interface Challenge {
  id: string;
  mode: MatchMode;
  status: ChallengeStatus;
  challengerWallet: string;
  opponentWallet: string | null;
  winnerWallet: string | null;
  createdAtMs: number;
  expiresAtMs: number;
}

export interface ChallengeResultRecord {
  challengeId: string;
  walletAddress: string;
  result: MatchResult;
  submittedAtMs: number;
}

export interface CreateChallengeInput {
  mode: MatchMode;
  opponentWallet?: string;
  expiresInSeconds?: number;
}

export interface SubmitResultInput {
  challengeId: string;
  result: MatchResult;
}
