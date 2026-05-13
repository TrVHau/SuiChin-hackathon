import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { corsOrigins, env } from "../../config/env.js";
import { challengeService } from "../../modules/challenge/challenge.service.js";
import { getSettlementPayloadService } from "../../modules/challenge/settlement-payload.service.js";
import { SubmitResultSchema } from "../../modules/challenge/challenge.schemas.js";
import type { ChallengeResultRecord } from "../../modules/challenge/challenge.types.js";
import { matchmakingService } from "../../modules/matchmaking/matchmaking.service.js";
import { valuationRoomService } from "../../modules/valuation-room/valuation-room.service.js";
import type { ValuationRoomRecord } from "../../modules/valuation-room/valuation-room.repository.js";
import { logger } from "../../shared/logger.js";
import { valuationRoomEvents } from "./valuation-room-events.js";

const BETTING_TIERS = {
  "0_5_SUI": {
    label: "Binh dan",
    targetPoints: 100,
    requiredNftTier: 1,
  },
  "1_SUI": {
    label: "Trung luu",
    targetPoints: 250,
    requiredNftTier: 2,
  },
  "2_SUI": {
    label: "Dai gia",
    targetPoints: 1000,
    requiredNftTier: 3,
  },
} as const;

type BettingTier = keyof typeof BETTING_TIERS;

interface QueuedValuationPlayer {
  walletAddress: string;
  socketId: string;
  nft: ValuationNft;
}

interface ValuationNft {
  id: string;
  name: string;
  tier: number;
  imageUrl?: string;
}

type ValuationRuntimePhase =
  | "MATCHED"
  | "LOCKING"
  | "IN_GAME"
  | "FINISHED"
  | "CANCELLED";
type ValuationEscrowState = "NONE" | "WAITING" | "ACTIVE" | "CLOSED";
type PreGameExitReason = "PLAYER_LEFT" | "DISCONNECT" | "LOCK_TIMEOUT";
type MatchCancelledReason = PreGameExitReason | "CREATOR_LEFT_LOCKED";

interface ValuationMatchState {
  challengeId: string;
  tempRoomId: string;
  suiRoomId: string | null;
  tier: BettingTier;
  targetPoints: number;
  players: [string, string];
  nftsByWallet: Map<string, ValuationNft>;
  started: boolean;
  phase: ValuationRuntimePhase;
  escrowState: ValuationEscrowState;
}

function getWalletFromSocket(socket: Socket): string {
  return String(socket.data.walletAddress ?? "");
}

function sameWallet(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function joinWalletSocketsToRoom(
  namespace: ReturnType<Server["of"]>,
  wallet: string,
  roomId: string,
) {
  for (const socket of namespace.sockets.values()) {
    if (sameWallet(String(socket.data.walletAddress ?? ""), wallet)) {
      socket.join(roomId);
    }
  }
}

function hasWalletSocket(
  namespace: ReturnType<Server["of"]>,
  wallet: string,
): boolean {
  for (const socket of namespace.sockets.values()) {
    if (sameWallet(String(socket.data.walletAddress ?? ""), wallet)) {
      return true;
    }
  }
  return false;
}

function resolveWinnerWallet(results: ChallengeResultRecord[]): string | null {
  const winRecord = results.find((item) => item.result === "WIN");
  const loseRecord = results.find((item) => item.result === "LOSE");

  if (
    winRecord &&
    loseRecord &&
    winRecord.walletAddress !== loseRecord.walletAddress
  ) {
    return winRecord.walletAddress;
  }

  const forfeit = results.find((item) => item.result === "FORFEIT");
  if (forfeit) {
    const otherPlayer = results.find(
      (item) => item.walletAddress !== forfeit.walletAddress,
    );
    return otherPlayer?.walletAddress ?? null;
  }

  return null;
}

function isLikelySuiObjectId(value: string): boolean {
  return /^0x[0-9a-fA-F]{1,64}$/.test(value.trim());
}

const NftSelectionSchema = z.object({
  id: z.string().trim().min(1).max(128),
  name: z.string().trim().max(120).default("Cuon Chun"),
  tier: z.coerce.number().int().min(1).max(3).default(1),
  imageUrl: z.string().trim().max(500).optional(),
});

const QueueJoinPayloadSchema = z.object({
  wager: z.coerce.number().finite().min(0).max(1_000_000).default(0), // legacy room mode only
  tier: z.enum(["0_5_SUI", "1_SUI", "2_SUI"]).optional(),
  nft: NftSelectionSchema.optional(),
  roomId: z.string().trim().min(0).optional(),
});

const MatchShotPayloadSchema = z.object({
  challengeId: z.string().uuid(),
  x: z.number().finite(),
  y: z.number().finite(),
  force: z.number().finite().min(0).max(5000),
});

const RoomCreatedPayloadSchema = z.object({
  tempRoomId: z.string().trim().min(1),
  suiRoomId: z.string().trim().min(1),
  challengeId: z.string().uuid().optional(),
});

const RoomJoinedPayloadSchema = z.object({
  tempRoomId: z.string().trim().min(1),
  suiRoomId: z.string().trim().min(1),
  challengeId: z.string().uuid().optional(),
});

const RoomClosedPayloadSchema = z.object({
  roomId: z.string().trim().min(1),
  challengeId: z.string().uuid().optional(),
});

const MatchRejoinPayloadSchema = z.object({
  challengeId: z.string().uuid(),
  roomId: z.string().trim().min(1).optional(),
});

const MatchSettlementRefreshPayloadSchema = z.object({
  challengeId: z.string().uuid(),
  roomId: z.string().trim().min(1).optional(),
});

const MatchHeartbeatPayloadSchema = z.object({
  challengeId: z.string().uuid().optional(),
  roomId: z.string().trim().min(1).optional(),
});

const MatchForfeitPayloadSchema = z.object({
  challengeId: z.string().uuid(),
});

function timerWithUnref(callback: () => void, delayMs: number): NodeJS.Timeout {
  const timer = setTimeout(callback, delayMs);
  timer.unref?.();
  return timer;
}

function walletKey(wallet: string): string {
  return wallet.toLowerCase();
}

function disconnectTimerKey(challengeId: string, wallet: string): string {
  return `${challengeId}:${walletKey(wallet)}`;
}

function buildTempRoomId(
  walletA: string,
  walletB: string,
  tier: BettingTier,
  challengeId: string,
): string {
  const [first, second] = [walletA, walletB].sort();
  return `valuation:${tier}:${first}:${second}:${challengeId}`;
}

export function attachMultiplayerGateway(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: corsOrigins, credentials: true },
    pingInterval: 10_000,
    pingTimeout: 30_000,
  });

  const namespace = io.of("/multiplayer");
  const challengeByRoom = new Map<string, string>();
  const roomByChallenge = new Map<string, string>();
  const currentTurnByChallenge = new Map<string, string>();
  const shotSequenceByChallenge = new Map<string, number>();
  const pendingWalletByEscrowRoom = new Map<string, string>();
  const pendingEscrowRoomByWallet = new Map<string, string>();
  const valuationQueuesByTier = new Map<BettingTier, QueuedValuationPlayer[]>();
  const valuationMatchByChallenge = new Map<string, ValuationMatchState>();
  const queueTimeoutByWallet = new Map<string, NodeJS.Timeout>();
  const preGameTimeoutByChallenge = new Map<string, NodeJS.Timeout>();
  const disconnectTimeoutByChallengeWallet = new Map<string, NodeJS.Timeout>();

  function buildValuationMatchFromRecord(
    record: ValuationRoomRecord,
  ): ValuationMatchState {
    const nftsByWallet = new Map<string, ValuationNft>([
      [record.creatorWallet, record.creatorNft],
      [record.joinerWallet, record.joinerNft],
    ]);
    return {
      challengeId: record.challengeId,
      tempRoomId: record.tempRoomId,
      suiRoomId: record.suiRoomId,
      tier: record.tier as BettingTier,
      targetPoints:
        BETTING_TIERS[record.tier as BettingTier]?.targetPoints ?? 0,
      players: [record.creatorWallet, record.joinerWallet],
      nftsByWallet,
      started: record.status === "PLAYING",
      phase:
        record.status === "PLAYING"
          ? "IN_GAME"
          : record.status === "FINALIZED"
            ? "FINISHED"
            : record.status === "CANCELLED"
              ? "CANCELLED"
              : record.status === "ROOM_CREATED" || record.status === "JOINED"
                ? "LOCKING"
                : "MATCHED",
      escrowState:
        record.status === "ROOM_CREATED"
          ? "WAITING"
          : record.status === "JOINED" || record.status === "PLAYING"
            ? "ACTIVE"
            : record.status === "FINALIZED" || record.status === "CANCELLED"
              ? "CLOSED"
              : "NONE",
    };
  }

  function rememberValuationMatch(match: ValuationMatchState) {
    valuationMatchByChallenge.set(match.challengeId, match);
    challengeByRoom.set(match.suiRoomId ?? match.tempRoomId, match.challengeId);
    roomByChallenge.set(match.challengeId, match.suiRoomId ?? match.tempRoomId);
    return match;
  }

  function clearQueueTimeout(wallet: string) {
    const key = walletKey(wallet);
    const timer = queueTimeoutByWallet.get(key);
    if (timer) {
      clearTimeout(timer);
      queueTimeoutByWallet.delete(key);
    }
  }

  function removeQueuedValuationPlayer(wallet: string): boolean {
    let removed = false;
    for (const [tier, queue] of valuationQueuesByTier.entries()) {
      const nextQueue = queue.filter(
        (entry) => !sameWallet(entry.walletAddress, wallet),
      );
      if (nextQueue.length !== queue.length) {
        removed = true;
      }
      if (nextQueue.length > 0) {
        valuationQueuesByTier.set(tier, nextQueue);
      } else {
        valuationQueuesByTier.delete(tier);
      }
    }
    if (removed) {
      clearQueueTimeout(wallet);
    }
    return removed;
  }

  function scheduleQueueTimeout(
    wallet: string,
    tier: BettingTier,
    socketId: string,
  ) {
    clearQueueTimeout(wallet);
    const timer = timerWithUnref(() => {
      const removed = removeQueuedValuationPlayer(wallet);
      if (!removed) return;
      namespace.to(socketId).emit("queue.timeout", {
        tier,
        timeoutMs: env.PVP_QUEUE_TIMEOUT_MS,
        message: "Khong tim thay doi thu",
      });
      void matchmakingService.leaveQueue(wallet);
    }, env.PVP_QUEUE_TIMEOUT_MS);
    queueTimeoutByWallet.set(walletKey(wallet), timer);
  }

  function clearPreGameTimeout(challengeId: string) {
    const timer = preGameTimeoutByChallenge.get(challengeId);
    if (timer) {
      clearTimeout(timer);
      preGameTimeoutByChallenge.delete(challengeId);
    }
  }

  function matchRooms(match: ValuationMatchState): string[] {
    return [
      ...new Set([match.tempRoomId, match.suiRoomId].filter(Boolean)),
    ] as string[];
  }

  function primaryRoomId(match: ValuationMatchState): string {
    return (
      match.suiRoomId ??
      roomByChallenge.get(match.challengeId) ??
      match.tempRoomId
    );
  }

  function cleanupValuationMatch(match: ValuationMatchState) {
    clearPreGameTimeout(match.challengeId);
    challengeByRoom.delete(match.tempRoomId);
    if (match.suiRoomId) {
      challengeByRoom.delete(match.suiRoomId);
    }
    roomByChallenge.delete(match.challengeId);
    currentTurnByChallenge.delete(match.challengeId);
    shotSequenceByChallenge.delete(match.challengeId);
    for (const wallet of match.players) {
      const key = disconnectTimerKey(match.challengeId, wallet);
      const timer = disconnectTimeoutByChallengeWallet.get(key);
      if (timer) {
        clearTimeout(timer);
        disconnectTimeoutByChallengeWallet.delete(key);
      }
    }
  }

  function findValuationMatchByWallet(wallet: string) {
    for (const match of valuationMatchByChallenge.values()) {
      if (match.phase === "CANCELLED" || match.phase === "FINISHED") continue;
      if (match.players.some((player) => sameWallet(player, wallet))) {
        return match;
      }
    }
    return null;
  }

  function isMatchPaused(challengeId: string): boolean {
    for (const key of disconnectTimeoutByChallengeWallet.keys()) {
      if (key.startsWith(`${challengeId}:`)) return true;
    }
    return false;
  }

  async function buildSettlementPayloadForRoom(input: {
    challengeId: string;
    roomId: string | undefined;
    winnerWallet: string | null;
    loserWallet: string | null;
  }) {
    const settlementSecret =
      env.LOBBY_SIGNER_SECRET_KEY ?? env.ADMIN_SECRET_KEY;
    if (
      !input.roomId ||
      !input.winnerWallet ||
      !input.loserWallet ||
      !settlementSecret ||
      !isLikelySuiObjectId(input.roomId)
    ) {
      return null;
    }

    try {
      const digestBytes = Array.from(
        new TextEncoder().encode(input.challengeId),
      );
      return await getSettlementPayloadService().buildPayload({
        roomId: input.roomId,
        winner: input.winnerWallet,
        loser: input.loserWallet,
        matchDigest: digestBytes,
      });
    } catch (error) {
      logger.warn(
        {
          challengeId: input.challengeId,
          roomId: input.roomId,
          error,
        },
        "Failed to build valuation lobby settlement payload",
      );
      return null;
    }
  }

  async function handleExitPreGame(wallet: string, reason: PreGameExitReason) {
    const match = findValuationMatchByWallet(wallet);
    if (!match) {
      return false;
    }

    if (
      match.started ||
      match.phase === "IN_GAME" ||
      match.escrowState === "ACTIVE"
    ) {
      scheduleInGameDisconnect(match, wallet);
      return true;
    }

    const creatorWallet = match.players[0];
    const opponentWallet =
      match.players.find((player) => !sameWallet(player, wallet)) ?? null;
    const needsCreatorCancel =
      match.escrowState === "WAITING" && Boolean(match.suiRoomId);
    const creatorLeftLocked =
      needsCreatorCancel && sameWallet(wallet, creatorWallet);
    const cancelledReason: MatchCancelledReason = creatorLeftLocked
      ? "CREATOR_LEFT_LOCKED"
      : reason;
    const message =
      cancelledReason === "CREATOR_LEFT_LOCKED"
        ? "Creator mat ket noi khi NFT dang o room WAITING. Creator can quay lai huy room de tra NFT."
        : reason === "LOCK_TIMEOUT"
          ? "Doi thu khong chot tai san dung han."
          : "Doi thu da chay tron.";

    match.phase = "CANCELLED";
    clearPreGameTimeout(match.challengeId);

    for (const roomId of matchRooms(match)) {
      namespace.to(roomId).emit("match.cancelled", {
        challengeId: match.challengeId,
        roomId,
        tempRoomId: match.tempRoomId,
        suiRoomId: match.suiRoomId,
        reason: cancelledReason,
        phase: match.phase,
        message,
        leftWallet: wallet,
        opponentWallet,
        creatorWallet,
        needsCreatorCancel,
        cancelRoomId: match.suiRoomId,
        canCancelWallet: creatorWallet,
      });
    }

    if (needsCreatorCancel) {
      return true;
    }

    match.escrowState = "CLOSED";
    await valuationRoomService.markCancelled(match.challengeId);
    cleanupValuationMatch(match);
    valuationMatchByChallenge.delete(match.challengeId);
    return true;
  }

  function schedulePreGameTimeout(match: ValuationMatchState) {
    clearPreGameTimeout(match.challengeId);
    const timer = timerWithUnref(() => {
      void handleExitPreGame(match.players[1], "LOCK_TIMEOUT");
    }, env.PVP_LOCK_TIMEOUT_MS);
    preGameTimeoutByChallenge.set(match.challengeId, timer);
  }

  async function finalizeDisconnectedPlayer(
    match: ValuationMatchState,
    disconnectedWallet: string,
  ) {
    const challenge = await challengeService.getChallenge(match.challengeId);
    if (!challenge || challenge.status === "FINALIZED") {
      return;
    }

    const winnerWallet =
      match.players.find((player) => !sameWallet(player, disconnectedWallet)) ??
      null;
    if (!winnerWallet) return;

    const saveResult = async (wallet: string, result: "WIN" | "FORFEIT") => {
      try {
        await challengeService.submitResult(match.challengeId, wallet, result);
      } catch (error) {
        const message = String(error instanceof Error ? error.message : error);
        if (!message.includes("Result already submitted")) {
          throw error;
        }
      }
    };

    await saveResult(disconnectedWallet, "FORFEIT");
    await saveResult(winnerWallet, "WIN");

    const results = await challengeService.listResults(match.challengeId);
    let resolvedWinner: string | null =
      resolveWinnerWallet(results) ?? winnerWallet;
    let txDigest: string | null = null;
    let loserWallet: string | null = disconnectedWallet;

    try {
      const finalized = await challengeService.finalizeChallenge(
        match.challengeId,
        resolvedWinner,
      );
      resolvedWinner = finalized.challenge.winnerWallet;
      if (resolvedWinner && finalized.challenge.opponentWallet) {
        loserWallet =
          resolvedWinner === finalized.challenge.challengerWallet
            ? finalized.challenge.opponentWallet
            : finalized.challenge.challengerWallet;
      }
      txDigest = finalized.chainResult.digest;
    } catch (error) {
      const existing = await challengeService.getChallenge(match.challengeId);
      if (!existing || existing.status !== "FINALIZED") {
        throw error;
      }
      resolvedWinner = existing.winnerWallet;
      if (resolvedWinner && existing.opponentWallet) {
        loserWallet =
          resolvedWinner === existing.challengerWallet
            ? existing.opponentWallet
            : existing.challengerWallet;
      }
    }

    const roomId = primaryRoomId(match);
    const settlementPayload = await buildSettlementPayloadForRoom({
      challengeId: match.challengeId,
      roomId,
      winnerWallet: resolvedWinner,
      loserWallet,
    });

    namespace.to(roomId).emit("match.result.finalized", {
      challengeId: match.challengeId,
      winnerWallet: resolvedWinner,
      txDigest,
      settlementPayload,
      reason: "DISCONNECT_FORFEIT",
      loserWallet,
    });

    match.phase = "FINISHED";
    match.escrowState = "CLOSED";
    await valuationRoomService.markFinalized(match.challengeId);
    cleanupValuationMatch(match);
    valuationMatchByChallenge.delete(match.challengeId);
  }

  function scheduleInGameDisconnect(
    match: ValuationMatchState,
    wallet: string,
  ) {
    if (hasWalletSocket(namespace, wallet)) return;
    const key = disconnectTimerKey(match.challengeId, wallet);
    if (disconnectTimeoutByChallengeWallet.has(key)) return;

    const deadlineMs = Date.now() + env.PVP_DISCONNECT_GRACE_MS;
    const timer = timerWithUnref(() => {
      disconnectTimeoutByChallengeWallet.delete(key);
      void finalizeDisconnectedPlayer(match, wallet).catch((error) => {
        logger.error(
          { error, challengeId: match.challengeId, wallet },
          "Failed to finalize disconnected PvP player",
        );
      });
    }, env.PVP_DISCONNECT_GRACE_MS);
    disconnectTimeoutByChallengeWallet.set(key, timer);

    const roomId = primaryRoomId(match);
    namespace.to(roomId).emit("match.playerDisconnected", {
      challengeId: match.challengeId,
      wallet,
      deadlineMs,
      graceMs: env.PVP_DISCONNECT_GRACE_MS,
      message: "Doi thu mat ket noi. Tran tam dung de cho reconnect.",
    });
  }

  function clearInGameDisconnect(match: ValuationMatchState, wallet: string) {
    const key = disconnectTimerKey(match.challengeId, wallet);
    const timer = disconnectTimeoutByChallengeWallet.get(key);
    if (!timer) return false;
    clearTimeout(timer);
    disconnectTimeoutByChallengeWallet.delete(key);
    return true;
  }

  function findPendingValuationMatchByCreator(creator: string) {
    for (const match of valuationMatchByChallenge.values()) {
      if (!match.suiRoomId && sameWallet(match.players[0], creator)) {
        return match;
      }
    }
    return null;
  }

  function findPendingValuationMatchByJoiner(joiner: string) {
    for (const match of valuationMatchByChallenge.values()) {
      if (!match.suiRoomId && sameWallet(match.players[1], joiner)) {
        return match;
      }
    }
    return null;
  }

  function findValuationMatchBySuiRoom(roomId: string) {
    for (const match of valuationMatchByChallenge.values()) {
      if (match.suiRoomId === roomId) {
        return match;
      }
    }
    return null;
  }

  async function markValuationRoomCreated(input: {
    roomId: string;
    creator: string;
  }) {
    let match = findPendingValuationMatchByCreator(input.creator);
    if (!match) {
      const persisted = await valuationRoomService.findPendingByCreator(
        input.creator,
      );
      if (persisted) {
        match = rememberValuationMatch(
          buildValuationMatchFromRecord(persisted),
        );
      }
    }
    if (!match) {
      logger.debug(
        input,
        "No pending valuation match found for RoomCreated event",
      );
      return false;
    }

    match.suiRoomId = input.roomId;
    match.phase = "LOCKING";
    match.escrowState = "WAITING";
    challengeByRoom.set(input.roomId, match.challengeId);
    joinWalletSocketsToRoom(namespace, match.players[0], input.roomId);
    joinWalletSocketsToRoom(namespace, match.players[1], input.roomId);
    schedulePreGameTimeout(match);
    await valuationRoomService.markRoomCreated({
      challengeId: match.challengeId,
      suiRoomId: input.roomId,
    });
    namespace.to(match.tempRoomId).emit("match.roomReady", {
      tempRoomId: match.tempRoomId,
      suiRoomId: input.roomId,
      creator: input.creator,
    });
    return true;
  }

  async function markValuationRoomJoined(input: {
    roomId: string;
    joiner: string;
  }) {
    const existingByRoom = await valuationRoomService.findBySuiRoomId(
      input.roomId,
    );
    if (existingByRoom) {
      const isParticipant =
        sameWallet(existingByRoom.creatorWallet, input.joiner) ||
        sameWallet(existingByRoom.joinerWallet, input.joiner);
      if (!isParticipant) {
        return false;
      }

      let match =
        valuationMatchByChallenge.get(existingByRoom.challengeId) ?? null;
      if (!match) {
        match = rememberValuationMatch(
          buildValuationMatchFromRecord(existingByRoom),
        );
      }

      match.suiRoomId = input.roomId;
      challengeByRoom.set(input.roomId, match.challengeId);
      roomByChallenge.set(match.challengeId, input.roomId);
      joinWalletSocketsToRoom(namespace, match.players[0], input.roomId);
      joinWalletSocketsToRoom(namespace, match.players[1], input.roomId);
      clearPreGameTimeout(match.challengeId);

      if (existingByRoom.status === "PLAYING") {
        match.started = true;
        match.phase = "IN_GAME";
        match.escrowState = "ACTIVE";
        return true;
      }
      if (existingByRoom.status === "FINALIZED") {
        match.started = true;
        match.phase = "FINISHED";
        match.escrowState = "CLOSED";
        return true;
      }
      if (existingByRoom.status === "CANCELLED") {
        match.phase = "CANCELLED";
        match.escrowState = "CLOSED";
        return true;
      }

      match.phase = "LOCKING";
      match.escrowState = "ACTIVE";
      if (sameWallet(existingByRoom.joinerWallet, input.joiner)) {
        await valuationRoomService.markRoomJoined({
          challengeId: match.challengeId,
          suiRoomId: input.roomId,
        });
      }
      return true;
    }

    let match = findPendingValuationMatchByJoiner(input.joiner);
    if (!match) {
      const persisted = await valuationRoomService.findPendingByJoiner({
        joinerWallet: input.joiner,
        suiRoomId: input.roomId,
      });
      if (persisted) {
        match = rememberValuationMatch(
          buildValuationMatchFromRecord(persisted),
        );
      }
    }
    if (!match) {
      return false;
    }

    match.suiRoomId = input.roomId;
    match.phase = "LOCKING";
    match.escrowState = "ACTIVE";
    clearPreGameTimeout(match.challengeId);
    challengeByRoom.set(input.roomId, match.challengeId);
    roomByChallenge.set(match.challengeId, input.roomId);
    joinWalletSocketsToRoom(namespace, match.players[0], input.roomId);
    joinWalletSocketsToRoom(namespace, match.players[1], input.roomId);
    await valuationRoomService.markRoomJoined({
      challengeId: match.challengeId,
      suiRoomId: input.roomId,
    });
    return true;
  }

  async function findValuationMatchForStart(input: {
    roomId: string;
    challengeId?: string;
  }) {
    let match = findValuationMatchBySuiRoom(input.roomId);
    if (!match && input.challengeId) {
      match = valuationMatchByChallenge.get(input.challengeId) ?? null;
    }
    if (!match && input.challengeId) {
      const persisted = await valuationRoomService.findByChallengeId(
        input.challengeId,
      );
      if (persisted) {
        match = rememberValuationMatch(
          buildValuationMatchFromRecord(persisted),
        );
      }
    }
    if (!match) {
      const persisted = await valuationRoomService.findBySuiRoomId(
        input.roomId,
      );
      if (persisted) {
        match = rememberValuationMatch(
          buildValuationMatchFromRecord(persisted),
        );
      }
    }

    if (match && match.suiRoomId !== input.roomId) {
      match.suiRoomId = input.roomId;
      challengeByRoom.set(input.roomId, match.challengeId);
      roomByChallenge.set(match.challengeId, input.roomId);
      if (
        !match.started &&
        match.phase !== "CANCELLED" &&
        match.phase !== "FINISHED"
      ) {
        match.phase = "LOCKING";
        match.escrowState = "ACTIVE";
        clearPreGameTimeout(match.challengeId);
        await valuationRoomService.markRoomJoined({
          challengeId: match.challengeId,
          suiRoomId: input.roomId,
        });
      }
    }

    return match;
  }

  async function emitValuationMatchStart(
    roomId: string,
    match: ValuationMatchState,
    challenge: NonNullable<
      Awaited<ReturnType<typeof challengeService.getChallenge>>
    >,
  ) {
    joinWalletSocketsToRoom(namespace, challenge.challengerWallet, roomId);
    if (challenge.opponentWallet) {
      joinWalletSocketsToRoom(namespace, challenge.opponentWallet, roomId);
    }

    namespace.to(roomId).emit("match.start", {
      roomId,
      players: [challenge.challengerWallet, challenge.opponentWallet],
      challengeId: challenge.id,
      status: "PLAYING",
      tier: match.tier,
      targetPoints: match.targetPoints,
      nfts: Object.fromEntries(match.nftsByWallet.entries()),
    });

    const currentTurnWallet =
      currentTurnByChallenge.get(challenge.id) ?? challenge.challengerWallet;
    currentTurnByChallenge.set(challenge.id, currentTurnWallet);
    if (!shotSequenceByChallenge.has(challenge.id)) {
      shotSequenceByChallenge.set(challenge.id, 0);
    }
    namespace.to(roomId).emit("match.turn", {
      challengeId: challenge.id,
      currentTurnWallet,
    });
    return true;
  }

  async function startValuationMatchFromRoom(
    roomId: string,
    challengeIdHint?: string,
  ) {
    const match = await findValuationMatchForStart({
      roomId,
      challengeId: challengeIdHint,
    });
    if (!match || match.phase === "CANCELLED" || match.phase === "FINISHED") {
      return false;
    }

    const challenge = await challengeService.getChallenge(match.challengeId);
    if (!challenge) {
      logger.warn(
        { roomId, challengeId: match.challengeId },
        "RoomActivated event has no challenge",
      );
      return false;
    }

    if (match.started || match.phase === "IN_GAME") {
      return emitValuationMatchStart(roomId, match, challenge);
    }

    match.started = true;
    match.phase = "IN_GAME";
    match.escrowState = "ACTIVE";
    clearPreGameTimeout(match.challengeId);
    await valuationRoomService.markPlaying(match.challengeId);
    challengeByRoom.delete(match.tempRoomId);
    roomByChallenge.delete(match.challengeId);
    challengeByRoom.set(roomId, match.challengeId);
    roomByChallenge.set(match.challengeId, roomId);

    return emitValuationMatchStart(roomId, match, challenge);
  }

  async function closeValuationRoomState(input: {
    roomId: string;
    challengeId?: string;
  }) {
    let match = findValuationMatchBySuiRoom(input.roomId);
    if (!match && input.challengeId) {
      match = valuationMatchByChallenge.get(input.challengeId) ?? null;
    }
    if (!match && input.challengeId) {
      const persisted = await valuationRoomService.findByChallengeId(
        input.challengeId,
      );
      if (persisted) {
        match = rememberValuationMatch(
          buildValuationMatchFromRecord(persisted),
        );
      }
    }
    if (!match) {
      const persisted = await valuationRoomService.findBySuiRoomId(
        input.roomId,
      );
      if (persisted) {
        match = rememberValuationMatch(
          buildValuationMatchFromRecord(persisted),
        );
      }
    }
    if (!match) return false;

    match.phase = "CANCELLED";
    match.escrowState = "CLOSED";
    await valuationRoomService.markCancelled(match.challengeId);
    cleanupValuationMatch(match);
    valuationMatchByChallenge.delete(match.challengeId);
    return true;
  }

  valuationRoomEvents.on("roomCreated", (event) => {
    void markValuationRoomCreated({
      roomId: event.roomId,
      creator: event.creator,
    });
  });
  valuationRoomEvents.on("roomJoined", (event) => {
    void markValuationRoomJoined({
      roomId: event.roomId,
      joiner: event.joiner,
    });
  });
  valuationRoomEvents.on("roomActivated", (event) => {
    void startValuationMatchFromRoom(event.roomId);
  });

  namespace.use((socket, next) => {
    const walletAddress = socket.handshake.auth?.walletAddress;
    if (!walletAddress || typeof walletAddress !== "string") {
      return next(new Error("Missing walletAddress"));
    }
    socket.data.walletAddress = walletAddress.trim();
    return next();
  });

  namespace.on("connection", (socket) => {
    socket.on("match.heartbeat", (payload: unknown) => {
      const walletAddress = getWalletFromSocket(socket);
      const parsed = MatchHeartbeatPayloadSchema.safeParse(payload);
      if (!parsed.success) return;

      const challengeId =
        parsed.data.challengeId ??
        (parsed.data.roomId ? challengeByRoom.get(parsed.data.roomId) : null);
      if (!challengeId) return;

      const match = valuationMatchByChallenge.get(challengeId);
      if (!match) return;
      if (!match.players.some((player) => sameWallet(player, walletAddress))) {
        return;
      }

      clearInGameDisconnect(match, walletAddress);
    });

    socket.on(
      "queue.join",
      async (
        payloadOrAck?: unknown | ((payload: unknown) => void),
        maybeAck?: (payload: unknown) => void,
      ) => {
        try {
          const ack =
            typeof payloadOrAck === "function" ? payloadOrAck : maybeAck;
          const payload =
            typeof payloadOrAck === "function" || payloadOrAck == null
              ? {}
              : payloadOrAck;
          const parsedPayload = QueueJoinPayloadSchema.parse(payload);
          const legacyQueueValue = parsedPayload.wager;
          const requestedRoomId = parsedPayload.roomId;

          const walletAddress = getWalletFromSocket(socket);
          removeQueuedValuationPlayer(walletAddress);

          if (parsedPayload.tier && parsedPayload.nft) {
            const tier = parsedPayload.tier;
            const tierConfig = BETTING_TIERS[tier];
            if (parsedPayload.nft.tier !== tierConfig.requiredNftTier) {
              throw new Error(
                `NFT tier ${parsedPayload.nft.tier} khong hop le cho sanh ${tierConfig.label}. Yeu cau tier ${tierConfig.requiredNftTier}.`,
              );
            }
            const currentQueue = valuationQueuesByTier.get(tier) ?? [];
            const existingQueue = currentQueue.filter(
              (entry) => !sameWallet(entry.walletAddress, walletAddress),
            );
            const opponent = existingQueue.shift();

            if (!opponent) {
              existingQueue.push({
                walletAddress,
                socketId: socket.id,
                nft: parsedPayload.nft,
              });
              valuationQueuesByTier.set(tier, existingQueue);
              scheduleQueueTimeout(walletAddress, tier, socket.id);
              ack?.({
                ok: true,
                result: {
                  matched: false,
                  tier,
                  roomId: null,
                  targetPoints: tierConfig.targetPoints,
                },
              });
              return;
            }

            valuationQueuesByTier.set(tier, existingQueue);
            clearQueueTimeout(opponent.walletAddress);
            clearQueueTimeout(walletAddress);
            const challenge = await challengeService.createChallenge(
              opponent.walletAddress,
              {
                mode: "REALTIME",
                opponentWallet: walletAddress,
              },
            );
            await challengeService.acceptChallenge(challenge.id, walletAddress);

            const tempRoomId = buildTempRoomId(
              walletAddress,
              opponent.walletAddress,
              tier,
              challenge.id,
            );
            challengeByRoom.set(tempRoomId, challenge.id);
            roomByChallenge.set(challenge.id, tempRoomId);
            joinWalletSocketsToRoom(namespace, walletAddress, tempRoomId);
            joinWalletSocketsToRoom(
              namespace,
              opponent.walletAddress,
              tempRoomId,
            );

            const nftsByWallet = new Map<string, ValuationNft>([
              [opponent.walletAddress, opponent.nft],
              [walletAddress, parsedPayload.nft],
            ]);
            valuationMatchByChallenge.set(challenge.id, {
              challengeId: challenge.id,
              tempRoomId,
              suiRoomId: null,
              tier,
              targetPoints: tierConfig.targetPoints,
              players: [opponent.walletAddress, walletAddress],
              nftsByWallet,
              started: false,
              phase: "MATCHED",
              escrowState: "NONE",
            });
            schedulePreGameTimeout(
              valuationMatchByChallenge.get(challenge.id)!,
            );
            await valuationRoomService.create({
              challengeId: challenge.id,
              tempRoomId,
              tier,
              creatorWallet: opponent.walletAddress,
              joinerWallet: walletAddress,
              creatorNft: opponent.nft,
              joinerNft: parsedPayload.nft,
            });

            const event = {
              roomId: tempRoomId,
              challengeId: challenge.id,
              status: "AWAITING_DEPOSIT",
              tier,
              tierLabel: tierConfig.label,
              targetPoints: tierConfig.targetPoints,
              creator: opponent.walletAddress,
              joiner: walletAddress,
              creatorNft: opponent.nft,
              joinerNft: parsedPayload.nft,
            };
            namespace.to(tempRoomId).emit("match.found", event);

            ack?.({
              ok: true,
              result: {
                matched: true,
                roomId: tempRoomId,
                opponentWallet: opponent.walletAddress,
                tier,
                targetPoints: tierConfig.targetPoints,
                challengeId: challenge.id,
              },
            });
            return;
          }

          if (requestedRoomId) {
            const pendingWallet =
              pendingWalletByEscrowRoom.get(requestedRoomId);

            if (!pendingWallet || pendingWallet === walletAddress) {
              pendingWalletByEscrowRoom.set(requestedRoomId, walletAddress);
              pendingEscrowRoomByWallet.set(walletAddress, requestedRoomId);
              ack?.({
                ok: true,
                result: {
                  matched: false,
                  roomId: requestedRoomId,
                },
              });
              return;
            }

            const opponentWallet = pendingWallet;
            pendingWalletByEscrowRoom.delete(requestedRoomId);
            pendingEscrowRoomByWallet.delete(opponentWallet);
            pendingEscrowRoomByWallet.delete(walletAddress);

            const challenge = await challengeService.createChallenge(
              opponentWallet,
              {
                mode: "REALTIME",
                opponentWallet: walletAddress,
              },
            );
            await challengeService.acceptChallenge(challenge.id, walletAddress);

            challengeByRoom.set(requestedRoomId, challenge.id);
            roomByChallenge.set(challenge.id, requestedRoomId);

            joinWalletSocketsToRoom(namespace, walletAddress, requestedRoomId);
            joinWalletSocketsToRoom(namespace, opponentWallet, requestedRoomId);
            namespace.to(requestedRoomId).emit("match.start", {
              roomId: requestedRoomId,
              players: [walletAddress, opponentWallet],
              challengeId: challenge.id,
            });

            const firstTurnWallet = challenge.challengerWallet;
            currentTurnByChallenge.set(challenge.id, firstTurnWallet);
            shotSequenceByChallenge.set(challenge.id, 0);
            namespace.to(requestedRoomId).emit("match.turn", {
              challengeId: challenge.id,
              currentTurnWallet: firstTurnWallet,
            });

            ack?.({
              ok: true,
              result: {
                matched: true,
                roomId: requestedRoomId,
                opponentWallet,
                challengeId: challenge.id,
              },
            });
            return;
          }

          const result = await matchmakingService.joinQueue(
            walletAddress,
            legacyQueueValue,
          );
          if (result.matched && result.roomId && result.opponentWallet) {
            const challenge = await challengeService.createChallenge(
              result.opponentWallet,
              {
                mode: "REALTIME",
                opponentWallet: walletAddress,
              },
            );
            await challengeService.acceptChallenge(challenge.id, walletAddress);

            challengeByRoom.set(result.roomId, challenge.id);
            roomByChallenge.set(challenge.id, result.roomId);

            joinWalletSocketsToRoom(namespace, walletAddress, result.roomId);
            joinWalletSocketsToRoom(
              namespace,
              result.opponentWallet,
              result.roomId,
            );

            // New flow: Emit MATCH_FOUND with roles
            // opponentWallet was in queue first -> CREATOR
            // walletAddress just joined -> JOINER
            namespace.to(result.roomId).emit("match.found", {
              roomId: result.roomId,
              challengeId: challenge.id,
              creator: result.opponentWallet,
              joiner: walletAddress,
            });

            ack?.({
              ok: true,
              result: {
                matched: result.matched,
                roomId: result.roomId,
                opponentWallet: result.opponentWallet,
                challengeId: challenge.id,
              },
            });
            return;
          }
          ack?.({
            ok: true,
            result: {
              matched: result.matched,
              roomId: result.roomId,
              opponentWallet: result.opponentWallet,
            },
          });
        } catch (err) {
          const ack =
            typeof payloadOrAck === "function" ? payloadOrAck : maybeAck;
          ack?.({
            ok: false,
            error: err instanceof Error ? err.message : "queue.join failed",
          });
        }
      },
    );

    socket.on("queue.leave", async (ack?: (payload: unknown) => void) => {
      const walletAddress = getWalletFromSocket(socket);
      const removedFromQueue = removeQueuedValuationPlayer(walletAddress);
      const cancelledPreGame = await handleExitPreGame(
        walletAddress,
        "PLAYER_LEFT",
      );
      const pendingRoomId = pendingEscrowRoomByWallet.get(walletAddress);
      if (pendingRoomId) {
        pendingEscrowRoomByWallet.delete(walletAddress);
        if (pendingWalletByEscrowRoom.get(pendingRoomId) === walletAddress) {
          pendingWalletByEscrowRoom.delete(pendingRoomId);
        }
      }
      const result = await matchmakingService.leaveQueue(walletAddress);
      ack?.({ ok: true, result, removedFromQueue, cancelledPreGame });
    });

    socket.on("disconnect", () => {
      const walletAddress = getWalletFromSocket(socket);
      removeQueuedValuationPlayer(walletAddress);
      const pendingRoomId = pendingEscrowRoomByWallet.get(walletAddress);
      if (pendingRoomId) {
        pendingEscrowRoomByWallet.delete(walletAddress);
        if (pendingWalletByEscrowRoom.get(pendingRoomId) === walletAddress) {
          pendingWalletByEscrowRoom.delete(pendingRoomId);
        }
      }
      void matchmakingService.leaveQueue(walletAddress);

      const match = findValuationMatchByWallet(walletAddress);
      if (!match) return;
      if (match.started || match.phase === "IN_GAME") {
        scheduleInGameDisconnect(match, walletAddress);
        return;
      }
      void handleExitPreGame(walletAddress, "DISCONNECT");
    });

    socket.on(
      "match.rejoin",
      async (payload: unknown, ack?: (payload: unknown) => void) => {
        try {
          const walletAddress = getWalletFromSocket(socket);
          const parsed = MatchRejoinPayloadSchema.parse(payload);
          let match = valuationMatchByChallenge.get(parsed.challengeId) ?? null;
          if (!match) {
            const persisted = await valuationRoomService.findByChallengeId(
              parsed.challengeId,
            );
            if (persisted) {
              match = rememberValuationMatch(
                buildValuationMatchFromRecord(persisted),
              );
            }
          }
          if (!match) {
            throw new Error("Match not found");
          }
          if (
            !match.players.some((player) => sameWallet(player, walletAddress))
          ) {
            throw new Error("Wallet does not belong to this match");
          }

          for (const roomId of matchRooms(match)) {
            socket.join(roomId);
          }

          const reconnected = clearInGameDisconnect(match, walletAddress);
          const roomId = primaryRoomId(match);
          if (reconnected) {
            namespace.to(roomId).emit("match.playerReconnected", {
              challengeId: match.challengeId,
              wallet: walletAddress,
              message: "Doi thu da ket noi lai.",
            });
          }

          ack?.({
            ok: true,
            result: {
              roomId,
              challengeId: match.challengeId,
              status: match.phase,
              players: match.players,
              tier: match.tier,
              targetPoints: match.targetPoints,
              nfts: Object.fromEntries(match.nftsByWallet.entries()),
              currentTurnWallet:
                currentTurnByChallenge.get(match.challengeId) ?? null,
            },
          });
        } catch (err) {
          ack?.({
            ok: false,
            error: err instanceof Error ? err.message : "match.rejoin failed",
          });
        }
      },
    );

    socket.on(
      "match.settlement.refresh",
      async (payload: unknown, ack?: (payload: unknown) => void) => {
        try {
          const walletAddress = getWalletFromSocket(socket);
          const parsed = MatchSettlementRefreshPayloadSchema.parse(payload);
          const challenge = await challengeService.getChallenge(parsed.challengeId);
          if (!challenge || challenge.status !== "FINALIZED") {
            throw new Error("Challenge is not finalized yet");
          }
          const isParticipant =
            sameWallet(challenge.challengerWallet, walletAddress) ||
            sameWallet(challenge.opponentWallet ?? null, walletAddress);
          if (!isParticipant) {
            throw new Error("Wallet does not belong to this challenge");
          }

          const winnerWallet = challenge.winnerWallet ?? null;
          const loserWallet =
            winnerWallet && challenge.opponentWallet
              ? winnerWallet === challenge.challengerWallet
                ? challenge.opponentWallet
                : challenge.challengerWallet
              : null;
          const persistedRoom = await valuationRoomService.findByChallengeId(
            parsed.challengeId,
          );
          const roomId =
            parsed.roomId ??
            roomByChallenge.get(parsed.challengeId) ??
            persistedRoom?.suiRoomId ??
            null;
          const settlementPayload = await buildSettlementPayloadForRoom({
            challengeId: parsed.challengeId,
            roomId: roomId ?? undefined,
            winnerWallet,
            loserWallet,
          });

          if (roomId) {
            socket.join(roomId);
          }
          ack?.({
            ok: true,
            result: {
              challengeId: parsed.challengeId,
              roomId,
              winnerWallet,
              loserWallet,
              settlementPayload,
            },
          });
        } catch (err) {
          ack?.({
            ok: false,
            error:
              err instanceof Error
                ? err.message
                : "match.settlement.refresh failed",
          });
        }
      },
    );

    socket.on(
      "queue.roomCreated",
      async (payload: unknown, ack?: (payload: unknown) => void) => {
        try {
          const walletAddress = getWalletFromSocket(socket);
          const parsed = RoomCreatedPayloadSchema.parse(payload);
          const handled = await markValuationRoomCreated({
            roomId: parsed.suiRoomId,
            creator: walletAddress,
          });
          if (!handled) {
            namespace.to(parsed.tempRoomId).emit("match.roomReady", {
              tempRoomId: parsed.tempRoomId,
              suiRoomId: parsed.suiRoomId,
              creator: walletAddress,
            });
          }

          ack?.({ ok: true });
        } catch (err) {
          ack?.({
            ok: false,
            error:
              err instanceof Error ? err.message : "queue.roomCreated failed",
          });
        }
      },
    );

    socket.on(
      "queue.roomClosed",
      async (payload: unknown, ack?: (payload: unknown) => void) => {
        try {
          const parsed = RoomClosedPayloadSchema.parse(payload);
          const handled = await closeValuationRoomState({
            roomId: parsed.roomId,
            challengeId: parsed.challengeId,
          });
          ack?.({ ok: true, handled });
        } catch (err) {
          ack?.({
            ok: false,
            error:
              err instanceof Error ? err.message : "queue.roomClosed failed",
          });
        }
      },
    );

    socket.on(
      "queue.roomJoined",
      async (payload: unknown, ack?: (payload: unknown) => void) => {
        try {
          const walletAddress = getWalletFromSocket(socket);
          const parsed = RoomJoinedPayloadSchema.parse(payload);
          await markValuationRoomJoined({
            roomId: parsed.suiRoomId,
            joiner: walletAddress,
          });

          const startedByValuationRoom = await startValuationMatchFromRoom(
            parsed.suiRoomId,
            parsed.challengeId,
          );
          if (startedByValuationRoom) {
            ack?.({ ok: true, started: true });
            return;
          }

          // Emits match.start to all users in temp room
          // and swaps mappings so challenge points to suiRoomId
          const challengeId =
            parsed.challengeId ?? challengeByRoom.get(parsed.tempRoomId);
          if (challengeId) {
            challengeByRoom.delete(parsed.tempRoomId);
            roomByChallenge.delete(challengeId);

            challengeByRoom.set(parsed.suiRoomId, challengeId);
            roomByChallenge.set(challengeId, parsed.suiRoomId);
            const valuationMatch = valuationMatchByChallenge.get(challengeId);
            if (valuationMatch) {
              valuationMatch.suiRoomId = parsed.suiRoomId;
              valuationMatch.started = true;
              valuationMatch.phase = "IN_GAME";
              valuationMatch.escrowState = "ACTIVE";
              clearPreGameTimeout(challengeId);
            }

            const challenge = await challengeService.getChallenge(challengeId);
            if (challenge) {
              joinWalletSocketsToRoom(
                namespace,
                challenge.challengerWallet,
                parsed.suiRoomId,
              );
              if (challenge.opponentWallet) {
                joinWalletSocketsToRoom(
                  namespace,
                  challenge.opponentWallet,
                  parsed.suiRoomId,
                );
              }

              namespace.to(parsed.suiRoomId).emit("match.start", {
                roomId: parsed.suiRoomId,
                players: [challenge.challengerWallet, challenge.opponentWallet],
                challengeId: challenge.id,
                status: "PLAYING",
                tier: valuationMatch?.tier,
                targetPoints: valuationMatch?.targetPoints,
                nfts: valuationMatch
                  ? Object.fromEntries(valuationMatch.nftsByWallet.entries())
                  : undefined,
              });

              const firstTurnWallet = challenge.challengerWallet;
              currentTurnByChallenge.set(challenge.id, firstTurnWallet);
              shotSequenceByChallenge.set(challenge.id, 0);
              namespace.to(parsed.suiRoomId).emit("match.turn", {
                challengeId: challenge.id,
                currentTurnWallet: firstTurnWallet,
              });
              await valuationRoomService.markPlaying(challenge.id);
              ack?.({ ok: true, started: true, challengeId: challenge.id });
              return;
            }
          }

          ack?.({
            ok: false,
            error:
              "Room da ACTIVE on-chain nhung backend khong tim thay challenge de start tran.",
          });
        } catch (err) {
          ack?.({
            ok: false,
            error:
              err instanceof Error ? err.message : "queue.roomJoined failed",
          });
        }
      },
    );

    socket.on(
      "match.shot.submit",
      async (payload: unknown, ack?: (payload: unknown) => void) => {
        try {
          const walletAddress = getWalletFromSocket(socket);
          const parsed = MatchShotPayloadSchema.parse(payload);
          const roomId = roomByChallenge.get(parsed.challengeId);
          if (!roomId) {
            throw new Error("Room not found for challenge");
          }

          const challenge = await challengeService.getChallenge(
            parsed.challengeId,
          );
          if (!challenge) {
            throw new Error("Challenge not found");
          }

          const isParticipant =
            challenge.challengerWallet === walletAddress ||
            challenge.opponentWallet === walletAddress;
          if (!isParticipant) {
            throw new Error("Wallet does not belong to this challenge");
          }
          if (isMatchPaused(parsed.challengeId)) {
            throw new Error("Match paused while waiting for reconnect");
          }

          const expectedTurn =
            currentTurnByChallenge.get(parsed.challengeId) ??
            challenge.challengerWallet;
          if (expectedTurn !== walletAddress) {
            throw new Error("Not your turn");
          }

          const nextTurnWallet =
            walletAddress === challenge.challengerWallet
              ? challenge.opponentWallet
              : challenge.challengerWallet;
          if (!nextTurnWallet) {
            throw new Error("Challenge is missing opponent");
          }

          const nextSeq =
            (shotSequenceByChallenge.get(parsed.challengeId) ?? 0) + 1;
          shotSequenceByChallenge.set(parsed.challengeId, nextSeq);
          currentTurnByChallenge.set(parsed.challengeId, nextTurnWallet);

          namespace.to(roomId).emit("match.shot.received", {
            challengeId: parsed.challengeId,
            byWallet: walletAddress,
            seq: nextSeq,
            shot: {
              x: parsed.x,
              y: parsed.y,
              force: parsed.force,
            },
            nextTurnWallet,
            atMs: Date.now(),
          });
          namespace.to(roomId).emit("match.turn", {
            challengeId: parsed.challengeId,
            currentTurnWallet: nextTurnWallet,
          });

          ack?.({
            ok: true,
            result: {
              seq: nextSeq,
              nextTurnWallet,
            },
          });
        } catch (err) {
          ack?.({
            ok: false,
            error:
              err instanceof Error ? err.message : "match.shot.submit failed",
          });
        }
      },
    );

    socket.on(
      "match.forfeit",
      async (payload: unknown, ack?: (payload: unknown) => void) => {
        try {
          const walletAddress = getWalletFromSocket(socket);
          const parsed = MatchForfeitPayloadSchema.parse(payload);
          let match = valuationMatchByChallenge.get(parsed.challengeId) ?? null;
          if (!match) {
            const persisted = await valuationRoomService.findByChallengeId(
              parsed.challengeId,
            );
            if (persisted) {
              match = rememberValuationMatch(
                buildValuationMatchFromRecord(persisted),
              );
            }
          }
          if (!match) {
            throw new Error("Match not found");
          }
          if (
            !match.players.some((player) => sameWallet(player, walletAddress))
          ) {
            throw new Error("Wallet does not belong to this match");
          }
          if (
            match.phase === "MATCHED" ||
            match.phase === "LOCKING" ||
            match.escrowState !== "ACTIVE"
          ) {
            throw new Error("Match has not started");
          }

          await finalizeDisconnectedPlayer(match, walletAddress);
          ack?.({ ok: true });
        } catch (err) {
          ack?.({
            ok: false,
            error: err instanceof Error ? err.message : "match.forfeit failed",
          });
        }
      },
    );

    socket.on(
      "match.result.submit",
      async (payload: unknown, ack?: (payload: unknown) => void) => {
        try {
          const walletAddress = getWalletFromSocket(socket);
          const parsed = SubmitResultSchema.parse(payload);
          const ackFinalizedChallenge = async () => {
            const existing = await challengeService.getChallenge(
              parsed.challengeId,
            );
            if (!existing || existing.status !== "FINALIZED") {
              return false;
            }
            const isParticipant =
              sameWallet(existing.challengerWallet, walletAddress) ||
              sameWallet(existing.opponentWallet ?? null, walletAddress);
            if (!isParticipant) {
              throw new Error("Wallet does not belong to this challenge");
            }

            const roomId =
              roomByChallenge.get(parsed.challengeId) ??
              (await valuationRoomService.findByChallengeId(parsed.challengeId))
                ?.suiRoomId ??
              undefined;
            const winnerWallet = existing.winnerWallet;
            const loserWallet =
              winnerWallet && existing.opponentWallet
                ? sameWallet(winnerWallet, existing.challengerWallet)
                  ? existing.opponentWallet
                  : existing.challengerWallet
                : null;
            const settlementPayload = await buildSettlementPayloadForRoom({
              challengeId: parsed.challengeId,
              roomId,
              winnerWallet,
              loserWallet,
            });

            ack?.({
              ok: true,
              result: { totalSubmissions: 2 },
              finalized: {
                winnerWallet,
                txDigest: null,
                settlementPayload,
              },
            });
            return true;
          };

          if (await ackFinalizedChallenge()) {
            return;
          }

          const submitResult = await challengeService.submitResult(
            parsed.challengeId,
            walletAddress,
            parsed.result,
          );

          const roomId = roomByChallenge.get(parsed.challengeId);
          const challenge =
            submitResult.challenge ??
            (await challengeService.getChallenge(parsed.challengeId));
          if (!challenge) {
            throw new Error("Challenge not found");
          }
          if (
            !sameWallet(challenge.challengerWallet, walletAddress) &&
            !sameWallet(challenge.opponentWallet ?? null, walletAddress)
          ) {
            throw new Error("Wallet does not belong to this challenge");
          }
          const otherWallet = sameWallet(challenge.challengerWallet, walletAddress)
            ? challenge.opponentWallet
            : challenge.challengerWallet;
          let winnerWallet =
            parsed.result === "WIN"
              ? walletAddress
              : parsed.result === "LOSE" || parsed.result === "FORFEIT"
                ? otherWallet
                : null;
          let txDigest: string | null = null;
          let loserWallet =
            winnerWallet && sameWallet(winnerWallet, walletAddress)
              ? otherWallet
              : winnerWallet
                ? walletAddress
                : null;

          try {
            const finalized = await challengeService.finalizeChallenge(
              parsed.challengeId,
              winnerWallet,
            );
            winnerWallet = finalized.challenge.winnerWallet;
            if (winnerWallet && finalized.challenge.opponentWallet) {
              loserWallet =
                winnerWallet === finalized.challenge.challengerWallet
                  ? finalized.challenge.opponentWallet
                  : finalized.challenge.challengerWallet;
            }
            txDigest = finalized.chainResult.digest;
          } catch (err) {
            const existing = await challengeService.getChallenge(
              parsed.challengeId,
            );
            if (!existing || existing.status !== "FINALIZED") {
              throw err;
            }
            winnerWallet = existing.winnerWallet;
            if (winnerWallet && existing.opponentWallet) {
              loserWallet =
                winnerWallet === existing.challengerWallet
                  ? existing.opponentWallet
                  : existing.challengerWallet;
            }
          }

          const settlementPayload = await buildSettlementPayloadForRoom({
            challengeId: parsed.challengeId,
            roomId,
            winnerWallet,
            loserWallet,
          });

          if (roomId) {
            namespace.to(roomId).emit("match.result.finalized", {
              challengeId: parsed.challengeId,
              winnerWallet,
              txDigest,
              settlementPayload,
            });
          }

          const valuationMatch = valuationMatchByChallenge.get(
            parsed.challengeId,
          );
          if (valuationMatch) {
            valuationMatch.phase = "FINISHED";
            valuationMatch.escrowState = "CLOSED";
            cleanupValuationMatch(valuationMatch);
            valuationMatchByChallenge.delete(parsed.challengeId);
          } else {
            if (roomId) {
              challengeByRoom.delete(roomId);
            }
            roomByChallenge.delete(parsed.challengeId);
            currentTurnByChallenge.delete(parsed.challengeId);
            shotSequenceByChallenge.delete(parsed.challengeId);
          }
          await valuationRoomService.markFinalized(parsed.challengeId);

          ack?.({
            ok: true,
            result: submitResult,
            finalized: {
              winnerWallet,
              txDigest,
              settlementPayload,
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          if (
            message.includes("Challenge must be ACTIVE or SUBMITTED") ||
            message.includes("Result already submitted")
          ) {
            const parsed = SubmitResultSchema.safeParse(payload);
            if (parsed.success) {
              const existing = await challengeService.getChallenge(
                parsed.data.challengeId,
              );
              if (existing?.status === "FINALIZED") {
                const roomId =
                  roomByChallenge.get(parsed.data.challengeId) ??
                  (
                    await valuationRoomService.findByChallengeId(
                      parsed.data.challengeId,
                    )
                  )?.suiRoomId ??
                  undefined;
                const winnerWallet = existing.winnerWallet;
                const loserWallet =
                  winnerWallet && existing.opponentWallet
                    ? sameWallet(winnerWallet, existing.challengerWallet)
                      ? existing.opponentWallet
                      : existing.challengerWallet
                    : null;
                const settlementPayload = await buildSettlementPayloadForRoom({
                  challengeId: parsed.data.challengeId,
                  roomId,
                  winnerWallet,
                  loserWallet,
                });
                ack?.({
                  ok: true,
                  result: { totalSubmissions: 2 },
                  finalized: {
                    winnerWallet,
                    txDigest: null,
                    settlementPayload,
                  },
                });
                return;
              }
            }
          }
          ack?.({
            ok: false,
            error: message || "match.result.submit failed",
          });
        }
      },
    );
  });

  return io;
}
