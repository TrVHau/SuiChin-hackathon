import { cryptoService } from "./crypto.service";
import { logger } from "../../shared/logger";

export enum RoomState {
  WAITING_FOR_PLAYERS = "WAITING_FOR_PLAYERS",
  CHOOSING_PHASE = "CHOOSING_PHASE",
  VALUATING_PHASE = "VALUATING_PHASE",
  SETTLED = "SETTLED",
}

interface PlayerState {
  socketId: string;
  walletAddress: string;
  nftId?: string;
  isDisconnected: boolean;
  disconnectTimeout?: NodeJS.Timeout;
}

export interface PvPRoom {
  id: string; // The Object ID of the on-chain match room
  state: RoomState;
  players: Map<string, PlayerState>;
  nonce: number;
  createdAt: Date;
}

export class PvPStateService {
  private activeRooms: Map<string, PvPRoom> = new Map();
  private readonly GRACE_PERIOD_MS = 30000; // 30 seconds

  constructor() {
    logger.info("Matchmaking Service initialized.");
    try {
      logger.info(
        `PvP Gateway Admin Address: ${cryptoService.getPublicKeyAddress()}`,
      );
    } catch (e: any) {
      logger.error("Failed to init crypto key. " + e.message);
    }
  }

  public getRoom(roomId: string): PvPRoom | undefined {
    return this.activeRooms.get(roomId);
  }

  public createOrJoinRoom(
    roomId: string,
    walletAddress: string,
    socketId: string,
  ): PvPRoom {
    let room = this.activeRooms.get(roomId);

    if (!room) {
      room = {
        id: roomId,
        state: RoomState.WAITING_FOR_PLAYERS,
        players: new Map(),
        nonce: Math.floor(Math.random() * 1000000), // Simple replay tracking
        createdAt: new Date(),
      };
      this.activeRooms.set(roomId, room);
    }

    if (room.state === RoomState.SETTLED) {
      throw new Error("Room is already settled.");
    }

    // Assign player
    room.players.set(walletAddress, {
      socketId,
      walletAddress,
      isDisconnected: false,
    });

    if (
      room.players.size === 2 &&
      room.state === RoomState.WAITING_FOR_PLAYERS
    ) {
      room.state = RoomState.CHOOSING_PHASE;
    }

    return room;
  }

  public handleDisconnection(
    socketId: string,
    emitToRoom: (roomId: string, event: string, data: any) => void,
  ) {
    for (const [roomId, room] of this.activeRooms.entries()) {
      for (const [walletAddress, player] of room.players.entries()) {
        if (player.socketId === socketId) {
          logger.warn(
            `Player ${walletAddress} disconnected from room ${roomId}`,
          );
          player.isDisconnected = true;

          // Start 30s Grace Period
          player.disconnectTimeout = setTimeout(() => {
            this.handleGracePeriodExpiry(roomId, walletAddress, emitToRoom);
          }, this.GRACE_PERIOD_MS);

          emitToRoom(roomId, "player_disconnected", {
            walletAddress,
            gracePeriodMs: this.GRACE_PERIOD_MS,
          });

          return;
        }
      }
    }
  }

  public handleReconnection(
    roomId: string,
    walletAddress: string,
    newSocketId: string,
  ) {
    const room = this.activeRooms.get(roomId);
    if (!room) return null;

    const player = room.players.get(walletAddress);
    if (player && player.isDisconnected) {
      player.socketId = newSocketId;
      player.isDisconnected = false;
      if (player.disconnectTimeout) {
        clearTimeout(player.disconnectTimeout);
        player.disconnectTimeout = undefined;
      }
      logger.info(`Player ${walletAddress} reconnected to room ${roomId}`);
      return room;
    }
    return null;
  }

  public selectNft(
    roomId: string,
    walletAddress: string,
    nftId: string,
  ): PvPRoom {
    const room = this.activeRooms.get(roomId);
    if (!room) throw new Error("Room not found");
    if (room.state !== RoomState.CHOOSING_PHASE)
      throw new Error("Not in CHOOSING_PHASE");

    const player = room.players.get(walletAddress);
    if (!player) throw new Error("Player not in room");

    player.nftId = nftId;

    let allSelected = true;
    for (const playerStatus of room.players.values()) {
      if (!playerStatus.nftId) allSelected = false;
    }

    if (allSelected) {
      room.state = RoomState.VALUATING_PHASE;
    }

    return room;
  }

  private handleGracePeriodExpiry(
    roomId: string,
    offlineWallet: string,
    emitToRoom: (roomId: string, event: string, data: any) => void,
  ) {
    const room = this.activeRooms.get(roomId);
    if (!room || room.state === RoomState.SETTLED) return;

    logger.info(
      `Grace period expired for ${offlineWallet} in room ${roomId}. Settling match.`,
    );

    let winner = "";
    for (const [addr, p] of room.players.entries()) {
      if (addr !== offlineWallet) winner = addr;
    }

    if (!winner) {
      this.activeRooms.delete(roomId);
      return;
    }

    this.settleMatch(room, winner, offlineWallet, emitToRoom);
  }

  public async settleMatch(
    room: PvPRoom,
    winner: string,
    loser: string,
    emitToRoom: (roomId: string, event: string, payload: any) => void,
  ) {
    try {
      const { signature, signatureBytes } =
        await cryptoService.generateMatchSignature(
          room.id,
          winner,
          loser,
          room.nonce,
        );
      room.state = RoomState.SETTLED;

      emitToRoom(room.id, "match_settled", {
        winner,
        loser,
        signature,
        signatureBytes: Buffer.from(signatureBytes).toString("base64"),
      });

      // Cleanup room state after grace period of settlement
      setTimeout(() => {
        this.activeRooms.delete(room.id);
      }, 5000);
    } catch (e: any) {
      logger.error(`Error settling match ${room.id}: ${e.message}`);
    }
  }
}

export const pvpStateService = new PvPStateService();
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
    await redis.hset(
      this.walletWagerKey,
      walletAddress,
      String(normalizedWager),
    );
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
