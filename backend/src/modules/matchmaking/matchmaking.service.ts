import { env } from "../../config/env";
import { getRedisClient } from "../../infra/cache/redis";

interface MatchResult {
  matched: boolean;
  opponentWallet?: string;
  roomId?: string;
}

function buildRoomId(walletA: string, walletB: string): string {
  const [first, second] = [walletA, walletB].sort();
  return `match:${first}:${second}`;
}

interface MatchmakingService {
  joinQueue(walletAddress: string): Promise<MatchResult>;
  leaveQueue(walletAddress: string): Promise<{ ok: boolean }>;
  reset(): Promise<void>;
}

class InMemoryMatchmakingService implements MatchmakingService {
  private queue: string[] = [];
  private queued = new Set<string>();

  async joinQueue(walletAddress: string): Promise<MatchResult> {
    if (!walletAddress) {
      return { matched: false };
    }

    if (this.queued.has(walletAddress)) {
      return { matched: false };
    }

    const opponentWallet = this.queue.shift();
    if (opponentWallet && opponentWallet !== walletAddress) {
      this.queued.delete(opponentWallet);
      return {
        matched: true,
        opponentWallet,
        roomId: buildRoomId(walletAddress, opponentWallet),
      };
    }

    this.queue.push(walletAddress);
    this.queued.add(walletAddress);
    return { matched: false };
  }

  async leaveQueue(walletAddress: string): Promise<{ ok: boolean }> {
    this.queue = this.queue.filter((wallet) => wallet !== walletAddress);
    this.queued.delete(walletAddress);
    return { ok: true };
  }

  async reset(): Promise<void> {
    this.queue = [];
    this.queued.clear();
  }
}

class RedisMatchmakingService implements MatchmakingService {
  private readonly queueKey = "mm:realtime:default";
  private readonly setKey = "mm:realtime:default:set";

  private async ensureConnected() {
    const redis = getRedisClient();
    if (redis.status !== "ready") {
      await redis.connect();
    }
    return redis;
  }

  async joinQueue(walletAddress: string): Promise<MatchResult> {
    if (!walletAddress) return { matched: false };

    const redis = await this.ensureConnected();
    const alreadyQueued = await redis.sismember(this.setKey, walletAddress);
    if (alreadyQueued) return { matched: false };

    const opponentWallet = await redis.lpop(this.queueKey);
    if (opponentWallet && opponentWallet !== walletAddress) {
      await redis.srem(this.setKey, opponentWallet);
      return {
        matched: true,
        opponentWallet,
        roomId: buildRoomId(walletAddress, opponentWallet),
      };
    }

    await redis.rpush(this.queueKey, walletAddress);
    await redis.sadd(this.setKey, walletAddress);
    return { matched: false };
  }

  async leaveQueue(walletAddress: string): Promise<{ ok: boolean }> {
    const redis = await this.ensureConnected();
    await redis.lrem(this.queueKey, 0, walletAddress);
    await redis.srem(this.setKey, walletAddress);
    return { ok: true };
  }

  async reset(): Promise<void> {
    const redis = await this.ensureConnected();
    await redis.del(this.queueKey, this.setKey);
  }
}

function buildMatchmakingService(): MatchmakingService {
  if (env.MATCHMAKING_BACKEND === "redis") {
    return new RedisMatchmakingService();
  }
  return new InMemoryMatchmakingService();
}

export const matchmakingService = buildMatchmakingService();
