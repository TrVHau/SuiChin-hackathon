import type { IChainAdapter } from "../../infra/chain/chain-adapter";
import { buildChainAdapter } from "../../infra/chain/build-chain-adapter";
import { AppError } from "../../shared/errors";
import { challengeRepository, normalizeCreateInput } from "./challenge.repository";
import type {
  Challenge,
  CreateChallengeInput,
  MatchResult,
} from "./challenge.types";

function isExpired(challenge: Challenge): boolean {
  return Date.now() >= challenge.expiresAtMs;
}

function validateParticipant(challenge: Challenge, walletAddress: string): void {
  const isChallenger = challenge.challengerWallet === walletAddress;
  const isOpponent = challenge.opponentWallet === walletAddress;
  if (!isChallenger && !isOpponent) {
    throw new AppError("FORBIDDEN", "Wallet does not belong to this challenge", 403);
  }
}

export class ChallengeService {
  constructor(private readonly chainAdapter: IChainAdapter = buildChainAdapter()) {}

  async createChallenge(challengerWallet: string, rawInput: CreateChallengeInput): Promise<Challenge> {
    const input = normalizeCreateInput(rawInput);
    if (input.stakeEnabled && input.stakeAmount <= 0) {
      throw new AppError("INVALID_STAKE", "Stake amount must be greater than zero");
    }

    return await challengeRepository.create({
      challengerWallet,
      mode: input.mode,
      opponentWallet: input.opponentWallet || undefined,
      stakeEnabled: input.stakeEnabled,
      stakeAmount: input.stakeAmount,
      expiresInSeconds: input.expiresInSeconds,
    });
  }

  async acceptChallenge(challengeId: string, walletAddress: string): Promise<Challenge> {
    const challenge = await challengeRepository.getById(challengeId);
    if (!challenge) throw new AppError("NOT_FOUND", "Challenge not found", 404);
    if (challenge.status !== "OPEN") {
      throw new AppError("INVALID_STATE", "Challenge is not open");
    }
    if (isExpired(challenge)) {
      challenge.status = "EXPIRED";
      await challengeRepository.update(challenge);
      throw new AppError("EXPIRED", "Challenge already expired");
    }
    if (challenge.challengerWallet === walletAddress) {
      throw new AppError("INVALID_PLAYER", "Challenger cannot accept own challenge");
    }
    if (challenge.opponentWallet && challenge.opponentWallet !== walletAddress) {
      throw new AppError("FORBIDDEN", "Invite challenge cannot be accepted by this wallet", 403);
    }

    challenge.opponentWallet = walletAddress;
    challenge.status = "ACTIVE";
    return await challengeRepository.update(challenge);
  }

  async cancelChallenge(challengeId: string, walletAddress: string): Promise<Challenge> {
    const challenge = await challengeRepository.getById(challengeId);
    if (!challenge) throw new AppError("NOT_FOUND", "Challenge not found", 404);
    if (challenge.challengerWallet !== walletAddress) {
      throw new AppError("FORBIDDEN", "Only challenger can cancel challenge", 403);
    }
    if (challenge.status !== "OPEN") {
      throw new AppError("INVALID_STATE", "Only OPEN challenge can be cancelled");
    }
    challenge.status = "CANCELLED";
    return await challengeRepository.update(challenge);
  }

  async submitResult(challengeId: string, walletAddress: string, result: MatchResult) {
    const challenge = await challengeRepository.getById(challengeId);
    if (!challenge) throw new AppError("NOT_FOUND", "Challenge not found", 404);
    if (isExpired(challenge) && challenge.status !== "FINALIZED") {
      challenge.status = "EXPIRED";
      await challengeRepository.update(challenge);
    }
    if (!["ACTIVE", "SUBMITTED"].includes(challenge.status)) {
      throw new AppError("INVALID_STATE", "Challenge must be ACTIVE or SUBMITTED");
    }

    validateParticipant(challenge, walletAddress);
    const saved = await challengeRepository.saveResult({ challengeId, walletAddress, result });
    const results = await challengeRepository.listResults(challengeId);
    if (results.length >= 1 && challenge.status === "ACTIVE") {
      challenge.status = "SUBMITTED";
      await challengeRepository.update(challenge);
    }

    return {
      challenge: await challengeRepository.getById(challengeId),
      saved,
      totalSubmissions: results.length,
    };
  }

  async finalizeChallenge(challengeId: string, winnerWallet: string | null) {
    const challenge = await challengeRepository.getById(challengeId);
    if (!challenge) throw new AppError("NOT_FOUND", "Challenge not found", 404);

    if (challenge.status === "ACTIVE" && isExpired(challenge)) {
      challenge.status = "EXPIRED";
      await challengeRepository.update(challenge);
    }
    if (!["SUBMITTED", "EXPIRED"].includes(challenge.status)) {
      throw new AppError("INVALID_STATE", "Challenge must be SUBMITTED or EXPIRED");
    }

    if (winnerWallet) {
      validateParticipant(challenge, winnerWallet);
    }

    const chainResult = await this.chainAdapter.finalizeChallenge({
      challengeId,
      winnerWallet,
      challengerWallet: challenge.challengerWallet,
      opponentWallet: challenge.opponentWallet,
      stakeEnabled: challenge.stakeEnabled,
      stakeAmount: challenge.stakeAmount,
    });

    challenge.status = "FINALIZED";
    challenge.winnerWallet = winnerWallet;
    await challengeRepository.update(challenge);

    return {
      challenge,
      chainResult,
    };
  }

  async getChallenge(challengeId: string): Promise<Challenge | null> {
    return await challengeRepository.getById(challengeId);
  }

  async listResults(challengeId: string) {
    return await challengeRepository.listResults(challengeId);
  }

  async resetForTests() {
    await challengeRepository.reset();
  }
}

export const challengeService = new ChallengeService();
