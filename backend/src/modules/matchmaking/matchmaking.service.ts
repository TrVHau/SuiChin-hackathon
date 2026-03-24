import { env } from "../../config/env";
import { getRedisClient } from "../../infra/cache/redis";

interface MatchResult {
  matched: boolean;
  opponentWallet?: string;
  roomId?: string;
  wager: number;
}

function buildRoomId(walletA: string, walletB: string): string {
  const [first, second] = [walletA, walletB].sort();
  return `match:${first}:${second}`;
}

interface MatchmakingService {
  joinQueue(walletAddress: string, wager: number): Promise<MatchResult>;
  leaveQueue(walletAddress: string): Promise<{ ok: boolean }>;
  reset(): Promise<void>;
}

class InMemoryMatchmakingService implements MatchmakingService {
  private queuesByWager = new Map<number, string[]>();
  private queuedByWallet = new Map<string, number>();

  async joinQueue(walletAddress: string, wager: number): Promise<MatchResult> {
    const normalizedWager = Math.max(0, Math.floor(wager));
    if (!walletAddress) {
      return { matched: false, wager: normalizedWager };
    }

    if (this.queuedByWallet.has(walletAddress)) {
      return { matched: false, wager: normalizedWager };
    }

    const queue = this.queuesByWager.get(normalizedWager) ?? [];
    const opponentWallet = queue.shift();
    if (opponentWallet && opponentWallet !== walletAddress) {
      this.queuedByWallet.delete(opponentWallet);
      if (queue.length > 0) {
        this.queuesByWager.set(normalizedWager, queue);
      } else {
        this.queuesByWager.delete(normalizedWager);
      }
      return {
        matched: true,
        opponentWallet,
        roomId: buildRoomId(walletAddress, opponentWallet),
        wager: normalizedWager,
      };
    }

    queue.push(walletAddress);
    this.queuesByWager.set(normalizedWager, queue);
    this.queuedByWallet.set(walletAddress, normalizedWager);
    return { matched: false, wager: normalizedWager };
  }

  async leaveQueue(walletAddress: string): Promise<{ ok: boolean }> {
    const wager = this.queuedByWallet.get(walletAddress);
    if (wager === undefined) return { ok: true };

    const queue = this.queuesByWager.get(wager) ?? [];
    const nextQueue = queue.filter((wallet) => wallet !== walletAddress);
    if (nextQueue.length > 0) {
      this.queuesByWager.set(wager, nextQueue);
    } else {
      this.queuesByWager.delete(wager);
    }

    this.queuedByWallet.delete(walletAddress);
    return { ok: true };
  }

  async reset(): Promise<void> {
    this.queuesByWager.clear();
    this.queuedByWallet.clear();
  }
}

class RedisMatchmakingService implements MatchmakingService {
  private readonly queuePrefix = "mm:realtime:wager";
  private readonly walletWagerKey = "mm:realtime:wager-by-wallet";

  private queueKey(wager: number): string {
    return `${this.queuePrefix}:${wager}`;
  }

  private async ensureConnected() {
    const redis = getRedisClient();
    if (redis.status !== "ready") {
      await redis.connect();
    }
    return redis;
  }

  async joinQueue(walletAddress: string, wager: number): Promise<MatchResult> {
    const normalizedWager = Math.max(0, Math.floor(wager));
    if (!walletAddress) return { matched: false, wager: normalizedWager };

    const redis = await this.ensureConnected();
    const queuedWager = await redis.hget(this.walletWagerKey, walletAddress);
    if (queuedWager !== null) {
      return { matched: false, wager: normalizedWager };
    }

    const queueKey = this.queueKey(normalizedWager);
    const opponentWallet = await redis.lpop(queueKey);
    if (opponentWallet && opponentWallet !== walletAddress) {
      await redis.hdel(this.walletWagerKey, opponentWallet);
      return {
        matched: true,
        opponentWallet,
        roomId: buildRoomId(walletAddress, opponentWallet),
        wager: normalizedWager,
      };
    }

    await redis.rpush(queueKey, walletAddress);
    await redis.hset(this.walletWagerKey, walletAddress, String(normalizedWager));
    return { matched: false, wager: normalizedWager };
  }

  async leaveQueue(walletAddress: string): Promise<{ ok: boolean }> {
    const redis = await this.ensureConnected();
    const queuedWager = await redis.hget(this.walletWagerKey, walletAddress);
    if (queuedWager !== null) {
      await redis.lrem(this.queueKey(Number(queuedWager)), 0, walletAddress);
      await redis.hdel(this.walletWagerKey, walletAddress);
    }
    return { ok: true };
  }

  async reset(): Promise<void> {
    const redis = await this.ensureConnected();
    const keys = await redis.keys(`${this.queuePrefix}:*`);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    await redis.del(this.walletWagerKey);
  }
}

function buildMatchmakingService(): MatchmakingService {
  if (env.MATCHMAKING_BACKEND === "redis") {
    return new RedisMatchmakingService();
  }
  return new InMemoryMatchmakingService();
}

export const matchmakingService = buildMatchmakingService();
