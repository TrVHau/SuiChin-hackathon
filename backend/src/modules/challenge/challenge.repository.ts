import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { getPrismaClient } from "../../infra/db/prisma";
import { AppError } from "../../shared/errors";
import type {
  Challenge,
  ChallengeResultRecord,
  CreateChallengeInput,
  MatchMode,
} from "./challenge.types";

function nowMs(): number {
  return Date.now();
}

export interface ChallengeRepository {
  create(input: {
    challengerWallet: string;
    mode: MatchMode;
    opponentWallet?: string;
    stakeEnabled: boolean;
    stakeAmount: number;
    expiresInSeconds: number;
  }): Promise<Challenge>;
  getById(id: string): Promise<Challenge | null>;
  update(challenge: Challenge): Promise<Challenge>;
  saveResult(input: {
    challengeId: string;
    walletAddress: string;
    result: ChallengeResultRecord["result"];
  }): Promise<ChallengeResultRecord>;
  listResults(challengeId: string): Promise<ChallengeResultRecord[]>;
  reset(): Promise<void>;
}

class InMemoryChallengeRepository implements ChallengeRepository {
  private readonly challenges = new Map<string, Challenge>();
  private readonly resultsByChallenge = new Map<string, Map<string, ChallengeResultRecord>>();

  async create(input: {
    challengerWallet: string;
    mode: MatchMode;
    opponentWallet?: string;
    stakeEnabled: boolean;
    stakeAmount: number;
    expiresInSeconds: number;
  }): Promise<Challenge> {
    const challenge: Challenge = {
      id: randomUUID(),
      mode: input.mode,
      status: "OPEN",
      challengerWallet: input.challengerWallet,
      opponentWallet: input.opponentWallet ?? null,
      stakeEnabled: input.stakeEnabled,
      stakeAmount: input.stakeAmount,
      winnerWallet: null,
      createdAtMs: nowMs(),
      expiresAtMs: nowMs() + input.expiresInSeconds * 1000,
    };
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  async getById(id: string): Promise<Challenge | null> {
    return this.challenges.get(id) ?? null;
  }

  async update(challenge: Challenge): Promise<Challenge> {
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  async saveResult(input: {
    challengeId: string;
    walletAddress: string;
    result: ChallengeResultRecord["result"];
  }): Promise<ChallengeResultRecord> {
    const challenge = await this.getById(input.challengeId);
    if (!challenge) {
      throw new AppError("NOT_FOUND", "Challenge not found", 404);
    }

    const byWallet =
      this.resultsByChallenge.get(input.challengeId) ??
      new Map<string, ChallengeResultRecord>();
    if (byWallet.has(input.walletAddress)) {
      throw new AppError("DUPLICATE_RESULT", "Result already submitted by this wallet");
    }

    const record: ChallengeResultRecord = {
      challengeId: input.challengeId,
      walletAddress: input.walletAddress,
      result: input.result,
      submittedAtMs: nowMs(),
    };
    byWallet.set(input.walletAddress, record);
    this.resultsByChallenge.set(input.challengeId, byWallet);
    return record;
  }

  async listResults(challengeId: string): Promise<ChallengeResultRecord[]> {
    const byWallet = this.resultsByChallenge.get(challengeId);
    if (!byWallet) return [];
    return [...byWallet.values()];
  }

  async reset(): Promise<void> {
    this.challenges.clear();
    this.resultsByChallenge.clear();
  }
}

class PrismaChallengeRepository implements ChallengeRepository {
  private readonly db = getPrismaClient() as unknown as Record<string, any>;

  private toChallenge(row: any): Challenge {
    return {
      id: row.id,
      mode: row.mode,
      status: row.status,
      challengerWallet: row.challengerWallet,
      opponentWallet: row.opponentWallet,
      stakeEnabled: Boolean(row.stakeEnabled),
      stakeAmount: Number(row.stakeAmount ?? 0),
      winnerWallet: row.winnerWallet,
      createdAtMs: new Date(row.createdAt).getTime(),
      expiresAtMs: new Date(row.expiresAt).getTime(),
    };
  }

  async create(input: {
    challengerWallet: string;
    mode: MatchMode;
    opponentWallet?: string;
    stakeEnabled: boolean;
    stakeAmount: number;
    expiresInSeconds: number;
  }): Promise<Challenge> {
    const row = await this.db.challenge.create({
      data: {
        id: randomUUID(),
        mode: input.mode,
        status: "OPEN",
        challengerWallet: input.challengerWallet,
        opponentWallet: input.opponentWallet ?? null,
        stakeEnabled: input.stakeEnabled,
        stakeAmount: input.stakeAmount,
        winnerWallet: null,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000),
      },
    });
    return this.toChallenge(row);
  }

  async getById(id: string): Promise<Challenge | null> {
    const row = await this.db.challenge.findUnique({ where: { id } });
    return row ? this.toChallenge(row) : null;
  }

  async update(challenge: Challenge): Promise<Challenge> {
    const row = await this.db.challenge.update({
      where: { id: challenge.id },
      data: {
        mode: challenge.mode,
        status: challenge.status,
        challengerWallet: challenge.challengerWallet,
        opponentWallet: challenge.opponentWallet,
        stakeEnabled: challenge.stakeEnabled,
        stakeAmount: challenge.stakeAmount,
        winnerWallet: challenge.winnerWallet,
        createdAt: new Date(challenge.createdAtMs),
        expiresAt: new Date(challenge.expiresAtMs),
      },
    });
    return this.toChallenge(row);
  }

  async saveResult(input: {
    challengeId: string;
    walletAddress: string;
    result: ChallengeResultRecord["result"];
  }): Promise<ChallengeResultRecord> {
    const challenge = await this.getById(input.challengeId);
    if (!challenge) {
      throw new AppError("NOT_FOUND", "Challenge not found", 404);
    }

    try {
      const row = await this.db.challengeResult.create({
        data: {
          id: randomUUID(),
          challengeId: input.challengeId,
          walletAddress: input.walletAddress,
          result: input.result,
          submittedAt: new Date(),
        },
      });

      return {
        challengeId: row.challengeId,
        walletAddress: row.walletAddress,
        result: row.result,
        submittedAtMs: new Date(row.submittedAt).getTime(),
      };
    } catch (err: any) {
      const code = String(err?.code ?? "");
      if (code === "P2002") {
        throw new AppError("DUPLICATE_RESULT", "Result already submitted by this wallet");
      }
      throw err;
    }
  }

  async listResults(challengeId: string): Promise<ChallengeResultRecord[]> {
    const rows = await this.db.challengeResult.findMany({
      where: { challengeId },
      orderBy: { submittedAt: "asc" },
    });
    return rows.map((row: any) => ({
      challengeId: row.challengeId,
      walletAddress: row.walletAddress,
      result: row.result,
      submittedAtMs: new Date(row.submittedAt).getTime(),
    }));
  }

  async reset(): Promise<void> {
    await this.db.challengeResult.deleteMany({});
    await this.db.challenge.deleteMany({});
  }
}

function buildChallengeRepository(): ChallengeRepository {
  if (env.BACKEND_STORAGE === "prisma") {
    return new PrismaChallengeRepository();
  }
  return new InMemoryChallengeRepository();
}

export const challengeRepository: ChallengeRepository = buildChallengeRepository();

export function normalizeCreateInput(input: CreateChallengeInput): Required<CreateChallengeInput> {
  return {
    mode: input.mode,
    opponentWallet: input.opponentWallet ?? "",
    stakeEnabled: input.stakeEnabled ?? false,
    stakeAmount: input.stakeAmount ?? 0,
    expiresInSeconds: input.expiresInSeconds ?? 5 * 60,
  };
}
