import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { corsOrigins, env } from "../../config/env.js";
import { challengeService } from "../../modules/challenge/challenge.service.js";
import { getSettlementPayloadService } from "../../modules/challenge/settlement-payload.service.js";
import { SubmitResultSchema } from "../../modules/challenge/challenge.schemas.js";
import type { ChallengeResultRecord } from "../../modules/challenge/challenge.types.js";
import { matchmakingService } from "../../modules/matchmaking/matchmaking.service.js";
import {
  valuationRoomService,
} from "../../modules/valuation-room/valuation-room.service.js";
import type {
  ValuationRoomRecord,
} from "../../modules/valuation-room/valuation-room.repository.js";
import { logger } from "../../shared/logger.js";
import { valuationRoomEvents } from "./valuation-room-events.js";

const BETTING_TIERS = {
  "0_5_SUI": {
    label: "Binh dan",
    wagerSui: 0.5,
    wagerMist: 500_000_000,
    targetPoints: 5,
    requiredNftTier: 1,
  },
  "1_SUI": {
    label: "Trung luu",
    wagerSui: 1,
    wagerMist: 1_000_000_000,
    targetPoints: 10,
    requiredNftTier: 2,
  },
  "2_SUI": {
    label: "Dai gia",
    wagerSui: 2,
    wagerMist: 2_000_000_000,
    targetPoints: 20,
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

interface ValuationMatchState {
  challengeId: string;
  tempRoomId: string;
  suiRoomId: string | null;
  tier: BettingTier;
  wagerSui: number;
  wagerMist: number;
  players: [string, string];
  nftsByWallet: Map<string, ValuationNft>;
  started: boolean;
}

function getWalletFromSocket(socket: Socket): string {
  return String(socket.data.walletAddress ?? "");
}

function joinWalletSocketsToRoom(namespace: ReturnType<Server["of"]>, wallet: string, roomId: string) {
  for (const socket of namespace.sockets.values()) {
    if (socket.data.walletAddress === wallet) {
      socket.join(roomId);
    }
  }
}

function resolveWinnerWallet(results: ChallengeResultRecord[]): string | null {
  const winRecord = results.find((item) => item.result === "WIN");
  const loseRecord = results.find((item) => item.result === "LOSE");

  if (winRecord && loseRecord && winRecord.walletAddress !== loseRecord.walletAddress) {
    return winRecord.walletAddress;
  }

  const forfeit = results.find((item) => item.result === "FORFEIT");
  if (forfeit) {
    const otherPlayer = results.find((item) => item.walletAddress !== forfeit.walletAddress);
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
  wager: z.coerce.number().finite().min(0).max(1_000_000).default(0),
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
});

const RoomJoinedPayloadSchema = z.object({
  tempRoomId: z.string().trim().min(1),
  suiRoomId: z.string().trim().min(1),
});

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

  function buildValuationMatchFromRecord(record: ValuationRoomRecord): ValuationMatchState {
    const nftsByWallet = new Map<string, ValuationNft>([
      [record.creatorWallet, record.creatorNft],
      [record.joinerWallet, record.joinerNft],
    ]);
    return {
      challengeId: record.challengeId,
      tempRoomId: record.tempRoomId,
      suiRoomId: record.suiRoomId,
      tier: record.tier as BettingTier,
      wagerSui: record.wagerSui,
      wagerMist: record.wagerMist,
      players: [record.creatorWallet, record.joinerWallet],
      nftsByWallet,
      started: record.status === "PLAYING",
    };
  }

  function rememberValuationMatch(match: ValuationMatchState) {
    valuationMatchByChallenge.set(match.challengeId, match);
    challengeByRoom.set(match.suiRoomId ?? match.tempRoomId, match.challengeId);
    roomByChallenge.set(match.challengeId, match.suiRoomId ?? match.tempRoomId);
    return match;
  }

  function findPendingValuationMatchByCreator(creator: string) {
    for (const match of valuationMatchByChallenge.values()) {
      if (!match.suiRoomId && match.players[0] === creator) {
        return match;
      }
    }
    return null;
  }

  function findPendingValuationMatchByJoiner(joiner: string) {
    for (const match of valuationMatchByChallenge.values()) {
      if (!match.suiRoomId && match.players[1] === joiner) {
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

  async function markValuationRoomCreated(input: { roomId: string; creator: string }) {
    let match = findPendingValuationMatchByCreator(input.creator);
    if (!match) {
      const persisted = await valuationRoomService.findPendingByCreator(input.creator);
      if (persisted) {
        match = rememberValuationMatch(buildValuationMatchFromRecord(persisted));
      }
    }
    if (!match) {
      logger.debug(input, "No pending valuation match found for RoomCreated event");
      return false;
    }

    match.suiRoomId = input.roomId;
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

  async function markValuationRoomJoined(input: { roomId: string; joiner: string }) {
    let match = findPendingValuationMatchByJoiner(input.joiner);
    if (!match) {
      const persisted = await valuationRoomService.findPendingByJoiner({
        joinerWallet: input.joiner,
        suiRoomId: input.roomId,
      });
      if (persisted) {
        match = rememberValuationMatch(buildValuationMatchFromRecord(persisted));
      }
    }
    if (!match) {
      return false;
    }

    match.suiRoomId = input.roomId;
    await valuationRoomService.markRoomJoined({
      challengeId: match.challengeId,
      suiRoomId: input.roomId,
    });
    return true;
  }

  async function startValuationMatchFromRoom(roomId: string) {
    let match = findValuationMatchBySuiRoom(roomId);
    if (!match) {
      const persisted = await valuationRoomService.findBySuiRoomId(roomId);
      if (persisted) {
        match = rememberValuationMatch(buildValuationMatchFromRecord(persisted));
      }
    }
    if (!match || match.started) {
      return false;
    }

    const challenge = await challengeService.getChallenge(match.challengeId);
    if (!challenge) {
      logger.warn({ roomId, challengeId: match.challengeId }, "RoomActivated event has no challenge");
      return false;
    }

    match.started = true;
    await valuationRoomService.markPlaying(match.challengeId);
    challengeByRoom.delete(match.tempRoomId);
    roomByChallenge.delete(match.challengeId);
    challengeByRoom.set(roomId, match.challengeId);
    roomByChallenge.set(match.challengeId, roomId);

    joinWalletSocketsToRoom(namespace, challenge.challengerWallet, roomId);
    if (challenge.opponentWallet) {
      joinWalletSocketsToRoom(namespace, challenge.opponentWallet, roomId);
    }

    namespace.to(roomId).emit("match.start", {
      roomId,
      players: [challenge.challengerWallet, challenge.opponentWallet],
      challengeId: challenge.id,
      wager: challenge.stakeAmount ?? 0,
      status: "PLAYING",
      tier: match.tier,
      wagerMist: match.wagerMist,
      nfts: Object.fromEntries(match.nftsByWallet.entries()),
    });

    const firstTurnWallet = challenge.challengerWallet;
    currentTurnByChallenge.set(challenge.id, firstTurnWallet);
    shotSequenceByChallenge.set(challenge.id, 0);
    namespace.to(roomId).emit("match.turn", {
      challengeId: challenge.id,
      currentTurnWallet: firstTurnWallet,
    });
    return true;
  }

  valuationRoomEvents.on("roomCreated", (event) => {
    void markValuationRoomCreated({ roomId: event.roomId, creator: event.creator });
  });
  valuationRoomEvents.on("roomJoined", (event) => {
    void markValuationRoomJoined({ roomId: event.roomId, joiner: event.joiner });
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
    socket.on(
      "queue.join",
      async (
        payloadOrAck?: unknown | ((payload: unknown) => void),
        maybeAck?: (payload: unknown) => void,
      ) => {
        try {
          const ack = typeof payloadOrAck === "function" ? payloadOrAck : maybeAck;
          const payload =
            typeof payloadOrAck === "function" || payloadOrAck == null
              ? {}
              : payloadOrAck;
          const parsedPayload = QueueJoinPayloadSchema.parse(payload);
          const wager = parsedPayload.wager;
          const requestedRoomId = parsedPayload.roomId;

          const walletAddress = getWalletFromSocket(socket);

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
              (entry) => entry.walletAddress !== walletAddress,
            );
            const opponent = existingQueue.shift();

            if (!opponent) {
              existingQueue.push({
                walletAddress,
                socketId: socket.id,
                nft: parsedPayload.nft,
              });
              valuationQueuesByTier.set(tier, existingQueue);
              ack?.({
                ok: true,
                result: {
                  matched: false,
                  tier,
                  roomId: null,
                  wager: tierConfig.wagerSui,
                  wagerMist: tierConfig.wagerMist,
                },
              });
              return;
            }

            valuationQueuesByTier.set(tier, existingQueue);
            const challenge = await challengeService.createChallenge(opponent.walletAddress, {
              mode: "REALTIME",
              opponentWallet: walletAddress,
              stakeEnabled: true,
              stakeAmount: tierConfig.wagerMist,
            });
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
            joinWalletSocketsToRoom(namespace, opponent.walletAddress, tempRoomId);

            const nftsByWallet = new Map<string, ValuationNft>([
              [opponent.walletAddress, opponent.nft],
              [walletAddress, parsedPayload.nft],
            ]);
            valuationMatchByChallenge.set(challenge.id, {
              challengeId: challenge.id,
              tempRoomId,
              suiRoomId: null,
              tier,
              wagerSui: tierConfig.wagerSui,
              wagerMist: tierConfig.wagerMist,
              players: [opponent.walletAddress, walletAddress],
              nftsByWallet,
              started: false,
            });
            await valuationRoomService.create({
              challengeId: challenge.id,
              tempRoomId,
              tier,
              wagerSui: tierConfig.wagerSui,
              wagerMist: tierConfig.wagerMist,
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
              wager: tierConfig.wagerSui,
              wagerMist: tierConfig.wagerMist,
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
                wager: tierConfig.wagerSui,
                wagerMist: tierConfig.wagerMist,
                tier,
                challengeId: challenge.id,
              },
            });
            return;
          }

          if (requestedRoomId) {
            const pendingWallet = pendingWalletByEscrowRoom.get(requestedRoomId);

            if (!pendingWallet || pendingWallet === walletAddress) {
              pendingWalletByEscrowRoom.set(requestedRoomId, walletAddress);
              pendingEscrowRoomByWallet.set(walletAddress, requestedRoomId);
              ack?.({
                ok: true,
                result: {
                  matched: false,
                  roomId: requestedRoomId,
                  wager,
                },
              });
              return;
            }

            const opponentWallet = pendingWallet;
            pendingWalletByEscrowRoom.delete(requestedRoomId);
            pendingEscrowRoomByWallet.delete(opponentWallet);
            pendingEscrowRoomByWallet.delete(walletAddress);

            const challenge = await challengeService.createChallenge(opponentWallet, {
              mode: "REALTIME",
              opponentWallet: walletAddress,
              stakeEnabled: false,
              stakeAmount: 0,
            });
            await challengeService.acceptChallenge(challenge.id, walletAddress);

            challengeByRoom.set(requestedRoomId, challenge.id);
            roomByChallenge.set(challenge.id, requestedRoomId);

            joinWalletSocketsToRoom(namespace, walletAddress, requestedRoomId);
            joinWalletSocketsToRoom(namespace, opponentWallet, requestedRoomId);
            namespace.to(requestedRoomId).emit("match.start", {
              roomId: requestedRoomId,
              players: [walletAddress, opponentWallet],
              challengeId: challenge.id,
              wager,
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
                wager,
                challengeId: challenge.id,
              },
            });
            return;
          }

          const result = await matchmakingService.joinQueue(walletAddress, wager);
          if (result.matched && result.roomId && result.opponentWallet) {
            const challenge = await challengeService.createChallenge(result.opponentWallet, {
              mode: "REALTIME",
              opponentWallet: walletAddress,
              stakeEnabled: result.wager > 0,
              stakeAmount: result.wager,
            });
            await challengeService.acceptChallenge(challenge.id, walletAddress);

            challengeByRoom.set(result.roomId, challenge.id);
            roomByChallenge.set(challenge.id, result.roomId);

            joinWalletSocketsToRoom(namespace, walletAddress, result.roomId);
            joinWalletSocketsToRoom(namespace, result.opponentWallet, result.roomId);

            // New flow: Emit MATCH_FOUND with roles
            // opponentWallet was in queue first -> CREATOR
            // walletAddress just joined -> JOINER
            namespace.to(result.roomId).emit("match.found", {
              roomId: result.roomId,
              challengeId: challenge.id,
              wager: result.wager,
              creator: result.opponentWallet,
              joiner: walletAddress,
            });

            ack?.({
              ok: true,
              result: {
                ...result,
                challengeId: challenge.id,
              },
            });
            return;
          }
          ack?.({ ok: true, result });
        } catch (err) {
          const ack = typeof payloadOrAck === "function" ? payloadOrAck : maybeAck;
          ack?.({
            ok: false,
            error: err instanceof Error ? err.message : "queue.join failed",
          });
        }
      },
    );

    socket.on("queue.leave", async (ack?: (payload: unknown) => void) => {
      const walletAddress = getWalletFromSocket(socket);
      for (const [tier, queue] of valuationQueuesByTier.entries()) {
        const nextQueue = queue.filter((entry) => entry.walletAddress !== walletAddress);
        if (nextQueue.length > 0) {
          valuationQueuesByTier.set(tier, nextQueue);
        } else {
          valuationQueuesByTier.delete(tier);
        }
      }
      const pendingRoomId = pendingEscrowRoomByWallet.get(walletAddress);
      if (pendingRoomId) {
        pendingEscrowRoomByWallet.delete(walletAddress);
        if (pendingWalletByEscrowRoom.get(pendingRoomId) === walletAddress) {
          pendingWalletByEscrowRoom.delete(pendingRoomId);
        }
      }
      const result = await matchmakingService.leaveQueue(walletAddress);
      ack?.({ ok: true, result });
    });

    socket.on("disconnect", () => {
      const walletAddress = getWalletFromSocket(socket);
      for (const [tier, queue] of valuationQueuesByTier.entries()) {
        const nextQueue = queue.filter((entry) => entry.walletAddress !== walletAddress);
        if (nextQueue.length > 0) {
          valuationQueuesByTier.set(tier, nextQueue);
        } else {
          valuationQueuesByTier.delete(tier);
        }
      }
      const pendingRoomId = pendingEscrowRoomByWallet.get(walletAddress);
      if (pendingRoomId) {
        pendingEscrowRoomByWallet.delete(walletAddress);
        if (pendingWalletByEscrowRoom.get(pendingRoomId) === walletAddress) {
          pendingWalletByEscrowRoom.delete(pendingRoomId);
        }
      }
      void matchmakingService.leaveQueue(walletAddress);
    });

    socket.on("queue.roomCreated", async (payload: unknown, ack?: (payload: unknown) => void) => {
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
        ack?.({ ok: false, error: err instanceof Error ? err.message : "queue.roomCreated failed" });
      }
    });

    socket.on("queue.roomJoined", async (payload: unknown, ack?: (payload: unknown) => void) => {
      try {
        const walletAddress = getWalletFromSocket(socket);
        const parsed = RoomJoinedPayloadSchema.parse(payload);
        await markValuationRoomJoined({
          roomId: parsed.suiRoomId,
          joiner: walletAddress,
        });

        const startedByValuationRoom = await startValuationMatchFromRoom(parsed.suiRoomId);
        if (startedByValuationRoom) {
          ack?.({ ok: true });
          return;
        }

        // Emits match.start to all users in temp room
        // and swaps mappings so challenge points to suiRoomId
        const challengeId = challengeByRoom.get(parsed.tempRoomId);
        if (challengeId) {
          challengeByRoom.delete(parsed.tempRoomId);
          roomByChallenge.delete(challengeId);

          challengeByRoom.set(parsed.suiRoomId, challengeId);
          roomByChallenge.set(challengeId, parsed.suiRoomId);
          const valuationMatch = valuationMatchByChallenge.get(challengeId);
          if (valuationMatch) {
            valuationMatch.suiRoomId = parsed.suiRoomId;
          }

          const challenge = await challengeService.getChallenge(challengeId);
          if (challenge) {
            joinWalletSocketsToRoom(namespace, challenge.challengerWallet, parsed.suiRoomId);
            if (challenge.opponentWallet) {
              joinWalletSocketsToRoom(namespace, challenge.opponentWallet, parsed.suiRoomId);
            }

            namespace.to(parsed.suiRoomId).emit("match.start", {
              roomId: parsed.suiRoomId,
              players: [challenge.challengerWallet, challenge.opponentWallet],
              challengeId: challenge.id,
              wager: challenge.stakeAmount ?? 0,
              status: "PLAYING",
              tier: valuationMatch?.tier,
              wagerMist: valuationMatch?.wagerMist,
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
          }
        }

        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : "queue.roomJoined failed" });
      }
    });

    socket.on("match.shot.submit", async (payload: unknown, ack?: (payload: unknown) => void) => {
      try {
        const walletAddress = getWalletFromSocket(socket);
        const parsed = MatchShotPayloadSchema.parse(payload);
        const roomId = roomByChallenge.get(parsed.challengeId);
        if (!roomId) {
          throw new Error("Room not found for challenge");
        }

        const challenge = await challengeService.getChallenge(parsed.challengeId);
        if (!challenge) {
          throw new Error("Challenge not found");
        }

        const isParticipant =
          challenge.challengerWallet === walletAddress || challenge.opponentWallet === walletAddress;
        if (!isParticipant) {
          throw new Error("Wallet does not belong to this challenge");
        }

        const expectedTurn = currentTurnByChallenge.get(parsed.challengeId) ?? challenge.challengerWallet;
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

        const nextSeq = (shotSequenceByChallenge.get(parsed.challengeId) ?? 0) + 1;
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
          error: err instanceof Error ? err.message : "match.shot.submit failed",
        });
      }
    });

    socket.on("match.result.submit", async (payload: unknown, ack?: (payload: unknown) => void) => {
      try {
        const walletAddress = getWalletFromSocket(socket);
        const parsed = SubmitResultSchema.parse(payload);
        const submitResult = await challengeService.submitResult(
          parsed.challengeId,
          walletAddress,
          parsed.result,
        );

        if (submitResult.totalSubmissions < 2) {
          ack?.({ ok: true, result: submitResult });
          return;
        }

        const roomId = roomByChallenge.get(parsed.challengeId);
        const results = await challengeService.listResults(parsed.challengeId);
        let winnerWallet = resolveWinnerWallet(results);
        let txDigest: string | null = null;
        let loserWallet: string | null = null;
        let settlementPayload: unknown = null;

        try {
          const finalized = await challengeService.finalizeChallenge(parsed.challengeId, winnerWallet);
          winnerWallet = finalized.challenge.winnerWallet;
          if (winnerWallet && finalized.challenge.opponentWallet) {
            loserWallet =
              winnerWallet === finalized.challenge.challengerWallet
                ? finalized.challenge.opponentWallet
                : finalized.challenge.challengerWallet;
          }
          txDigest = finalized.chainResult.digest;
        } catch (err) {
          const existing = await challengeService.getChallenge(parsed.challengeId);
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

        const settlementSecret = env.LOBBY_SIGNER_SECRET_KEY ?? env.ADMIN_SECRET_KEY;

        if (
          roomId &&
          winnerWallet &&
          loserWallet &&
          settlementSecret &&
          isLikelySuiObjectId(roomId)
        ) {
          try {
            const digestBytes = Array.from(new TextEncoder().encode(parsed.challengeId));
            settlementPayload = await getSettlementPayloadService().buildPayload({
              roomId,
              winner: winnerWallet,
              loser: loserWallet,
              matchDigest: digestBytes,
            });
          } catch (error) {
            logger.warn(
              {
                challengeId: parsed.challengeId,
                roomId,
                error,
              },
              "Failed to build valuation lobby settlement payload",
            );
            settlementPayload = null;
          }
        }

        if (roomId) {
          namespace.to(roomId).emit("match.result.finalized", {
            challengeId: parsed.challengeId,
            winnerWallet,
            txDigest,
            settlementPayload,
          });
        }

        if (roomId) {
          challengeByRoom.delete(roomId);
        }
        roomByChallenge.delete(parsed.challengeId);
        currentTurnByChallenge.delete(parsed.challengeId);
        shotSequenceByChallenge.delete(parsed.challengeId);

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
        ack?.({
          ok: false,
          error: err instanceof Error ? err.message : "match.result.submit failed",
        });
      }
    });
  });

  return io;
}
