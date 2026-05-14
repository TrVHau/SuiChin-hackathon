import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { corsOrigins, env } from "../../config/env.js";
import { SubmitResultSchema } from "../../modules/challenge/challenge.schemas.js";
import { challengeService } from "../../modules/challenge/challenge.service.js";
import type { ChallengeResultRecord } from "../../modules/challenge/challenge.types.js";
import { matchmakingService } from "../../modules/matchmaking/matchmaking.service.js";
import { logger } from "../../shared/logger.js";

const DISCONNECT_PAUSE_NOTICE_DELAY_MS = 2_000;

type MatchPhase = "IN_GAME" | "FINISHED";

interface RealtimeMatchState {
  challengeId: string;
  roomId: string;
  players: [string, string];
  phase: MatchPhase;
}

const QueueJoinPayloadSchema = z.object({
  wager: z.coerce.number().finite().min(0).max(1_000_000).default(0),
});

const MatchShotPayloadSchema = z.object({
  challengeId: z.string().uuid(),
  x: z.number().finite(),
  y: z.number().finite(),
  force: z.number().finite().min(0).max(5000),
});

const MatchHeartbeatPayloadSchema = z.object({
  challengeId: z.string().uuid().optional(),
  roomId: z.string().trim().min(1).optional(),
});

const MatchRejoinPayloadSchema = z.object({
  challengeId: z.string().uuid(),
  roomId: z.string().trim().min(1).optional(),
});

const MatchForfeitPayloadSchema = z.object({
  challengeId: z.string().uuid(),
});

function getWalletFromSocket(socket: Socket): string {
  return String(socket.data.walletAddress ?? "");
}

function sameWallet(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && a.toLowerCase() === b.toLowerCase());
}

function walletKey(wallet: string): string {
  return wallet.toLowerCase();
}

function disconnectTimerKey(challengeId: string, wallet: string): string {
  return `${challengeId}:${walletKey(wallet)}`;
}

function timerWithUnref(callback: () => void, delayMs: number): NodeJS.Timeout {
  const timer = setTimeout(callback, delayMs);
  timer.unref?.();
  return timer;
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
  const matchByChallenge = new Map<string, RealtimeMatchState>();
  const queuedWallets = new Set<string>();
  const queueTimeoutByWallet = new Map<string, NodeJS.Timeout>();
  const disconnectTimeoutByChallengeWallet = new Map<string, NodeJS.Timeout>();

  function clearQueueTimeout(wallet: string) {
    const key = walletKey(wallet);
    const timer = queueTimeoutByWallet.get(key);
    if (timer) {
      clearTimeout(timer);
      queueTimeoutByWallet.delete(key);
    }
  }

  function scheduleQueueTimeout(wallet: string, socketId: string) {
    clearQueueTimeout(wallet);
    const timer = timerWithUnref(() => {
      queuedWallets.delete(walletKey(wallet));
      namespace.to(socketId).emit("queue.timeout", {
        timeoutMs: env.PVP_QUEUE_TIMEOUT_MS,
        message: "Khong tim thay doi thu",
      });
      void matchmakingService.leaveQueue(wallet);
    }, env.PVP_QUEUE_TIMEOUT_MS);
    queueTimeoutByWallet.set(walletKey(wallet), timer);
  }

  function cleanupMatch(match: RealtimeMatchState) {
    challengeByRoom.delete(match.roomId);
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

  function findMatchByWallet(wallet: string) {
    for (const match of matchByChallenge.values()) {
      if (match.phase === "FINISHED") continue;
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

  function clearInGameDisconnect(match: RealtimeMatchState, wallet: string) {
    const key = disconnectTimerKey(match.challengeId, wallet);
    const timer = disconnectTimeoutByChallengeWallet.get(key);
    if (!timer) return false;
    clearTimeout(timer);
    disconnectTimeoutByChallengeWallet.delete(key);
    return true;
  }

  function reconcileInGameConnectivity(match: RealtimeMatchState): boolean {
    let cleared = false;
    for (const wallet of match.players) {
      if (!hasWalletSocket(namespace, wallet)) continue;
      if (clearInGameDisconnect(match, wallet)) {
        cleared = true;
        namespace.to(match.roomId).emit("match.playerReconnected", {
          challengeId: match.challengeId,
          wallet,
          message: "Doi thu da ket noi lai.",
        });
      }
    }
    return cleared;
  }

  async function finalizeDisconnectedPlayer(
    match: RealtimeMatchState,
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
    let resolvedWinner = resolveWinnerWallet(results) ?? winnerWallet;
    let txDigest: string | null = null;

    try {
      const finalized = await challengeService.finalizeChallenge(
        match.challengeId,
        resolvedWinner,
      );
      resolvedWinner = finalized.challenge.winnerWallet;
      txDigest = finalized.chainResult.digest;
    } catch (error) {
      const existing = await challengeService.getChallenge(match.challengeId);
      if (!existing || existing.status !== "FINALIZED") {
        throw error;
      }
      resolvedWinner = existing.winnerWallet;
    }

    namespace.to(match.roomId).emit("match.result.finalized", {
      challengeId: match.challengeId,
      winnerWallet: resolvedWinner,
      txDigest,
      reason: "DISCONNECT_FORFEIT",
      loserWallet: disconnectedWallet,
    });

    match.phase = "FINISHED";
    cleanupMatch(match);
    matchByChallenge.delete(match.challengeId);
  }

  function scheduleInGameDisconnect(match: RealtimeMatchState, wallet: string) {
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

    timerWithUnref(
      () => {
        if (!disconnectTimeoutByChallengeWallet.has(key)) return;
        if (hasWalletSocket(namespace, wallet)) {
          clearInGameDisconnect(match, wallet);
          return;
        }
        namespace.to(match.roomId).emit("match.playerDisconnected", {
          challengeId: match.challengeId,
          wallet,
          deadlineMs,
          graceMs: env.PVP_DISCONNECT_GRACE_MS,
          message: "Doi thu mat ket noi. Tran tam dung de cho reconnect.",
        });
      },
      Math.min(DISCONNECT_PAUSE_NOTICE_DELAY_MS, env.PVP_DISCONNECT_GRACE_MS),
    );
  }

  namespace.use((socket, next) => {
    const walletAddress = String(socket.handshake.auth?.walletAddress ?? "");
    if (!walletAddress) {
      next(new Error("walletAddress is required"));
      return;
    }

    socket.data.walletAddress = walletAddress;
    next();
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

      const match = matchByChallenge.get(challengeId);
      if (!match) return;
      if (!match.players.some((player) => sameWallet(player, walletAddress))) {
        return;
      }

      reconcileInGameConnectivity(match);
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
          const walletAddress = getWalletFromSocket(socket);

          clearQueueTimeout(walletAddress);
          const result = await matchmakingService.joinQueue(
            walletAddress,
            parsedPayload.wager,
          );

          if (!result.matched || !result.roomId || !result.opponentWallet) {
            queuedWallets.add(walletKey(walletAddress));
            scheduleQueueTimeout(walletAddress, socket.id);
            ack?.({
              ok: true,
              result: {
                matched: false,
                roomId: result.roomId,
              },
            });
            return;
          }

          clearQueueTimeout(result.opponentWallet);
          clearQueueTimeout(walletAddress);
          queuedWallets.delete(walletKey(result.opponentWallet));
          queuedWallets.delete(walletKey(walletAddress));

          const challenge = await challengeService.createChallenge(
            result.opponentWallet,
            {
              mode: "REALTIME",
              opponentWallet: walletAddress,
            },
          );
          await challengeService.acceptChallenge(challenge.id, walletAddress);

          const match: RealtimeMatchState = {
            challengeId: challenge.id,
            roomId: result.roomId,
            players: [result.opponentWallet, walletAddress],
            phase: "IN_GAME",
          };
          matchByChallenge.set(challenge.id, match);
          challengeByRoom.set(result.roomId, challenge.id);
          roomByChallenge.set(challenge.id, result.roomId);

          joinWalletSocketsToRoom(namespace, walletAddress, result.roomId);
          joinWalletSocketsToRoom(
            namespace,
            result.opponentWallet,
            result.roomId,
          );

          namespace.to(result.roomId).emit("match.start", {
            roomId: result.roomId,
            players: match.players,
            challengeId: challenge.id,
          });

          const firstTurnWallet = challenge.challengerWallet;
          currentTurnByChallenge.set(challenge.id, firstTurnWallet);
          shotSequenceByChallenge.set(challenge.id, 0);
          namespace.to(result.roomId).emit("match.turn", {
            challengeId: challenge.id,
            currentTurnWallet: firstTurnWallet,
          });

          ack?.({
            ok: true,
            result: {
              matched: true,
              roomId: result.roomId,
              opponentWallet: result.opponentWallet,
              challengeId: challenge.id,
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
      clearQueueTimeout(walletAddress);
      queuedWallets.delete(walletKey(walletAddress));
      const result = await matchmakingService.leaveQueue(walletAddress);
      ack?.({ ok: true, result });
    });

    socket.on("disconnect", () => {
      const walletAddress = getWalletFromSocket(socket);
      clearQueueTimeout(walletAddress);
      queuedWallets.delete(walletKey(walletAddress));
      void matchmakingService.leaveQueue(walletAddress);

      const match = findMatchByWallet(walletAddress);
      if (match) {
        scheduleInGameDisconnect(match, walletAddress);
      }
    });

    socket.on(
      "match.rejoin",
      async (payload: unknown, ack?: (payload: unknown) => void) => {
        try {
          const walletAddress = getWalletFromSocket(socket);
          const parsed = MatchRejoinPayloadSchema.parse(payload);
          const match = matchByChallenge.get(parsed.challengeId);
          if (!match) {
            throw new Error("Match not found");
          }
          if (
            !match.players.some((player) => sameWallet(player, walletAddress))
          ) {
            throw new Error("Wallet does not belong to this match");
          }

          socket.join(match.roomId);

          const reconnected = clearInGameDisconnect(match, walletAddress);
          if (reconnected) {
            namespace.to(match.roomId).emit("match.playerReconnected", {
              challengeId: match.challengeId,
              wallet: walletAddress,
              message: "Doi thu da ket noi lai.",
            });
          }

          ack?.({
            ok: true,
            result: {
              roomId: match.roomId,
              challengeId: match.challengeId,
              status: match.phase,
              players: match.players,
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
            sameWallet(challenge.challengerWallet, walletAddress) ||
            sameWallet(challenge.opponentWallet, walletAddress);
          if (!isParticipant) {
            throw new Error("Wallet does not belong to this challenge");
          }
          const match = matchByChallenge.get(parsed.challengeId);
          if (match) {
            reconcileInGameConnectivity(match);
          }
          if (isMatchPaused(parsed.challengeId)) {
            throw new Error("Match paused while waiting for reconnect");
          }

          const expectedTurn =
            currentTurnByChallenge.get(parsed.challengeId) ??
            challenge.challengerWallet;
          if (!sameWallet(expectedTurn, walletAddress)) {
            throw new Error("Not your turn");
          }

          const nextTurnWallet = sameWallet(
            walletAddress,
            challenge.challengerWallet,
          )
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
          const match = matchByChallenge.get(parsed.challengeId);
          if (!match) {
            throw new Error("Match not found");
          }
          if (
            !match.players.some((player) => sameWallet(player, walletAddress))
          ) {
            throw new Error("Wallet does not belong to this match");
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

          const existing = await challengeService.getChallenge(
            parsed.challengeId,
          );
          if (existing?.status === "FINALIZED") {
            const isParticipant =
              sameWallet(existing.challengerWallet, walletAddress) ||
              sameWallet(existing.opponentWallet, walletAddress);
            if (!isParticipant) {
              throw new Error("Wallet does not belong to this challenge");
            }
            ack?.({
              ok: true,
              result: { totalSubmissions: 1 },
              finalized: {
                winnerWallet: existing.winnerWallet,
                txDigest: null,
              },
            });
            return;
          }

          const finalizedRealtime =
            await challengeService.finalizeRealtimeResult(
              parsed.challengeId,
              walletAddress,
              parsed.result,
            );

          const challenge = finalizedRealtime.challenge;
          const roomId = roomByChallenge.get(parsed.challengeId);
          if (!roomId) {
            throw new Error("Room not found for challenge");
          }
          if (
            !sameWallet(challenge.challengerWallet, walletAddress) &&
            !sameWallet(challenge.opponentWallet, walletAddress)
          ) {
            throw new Error("Wallet does not belong to this challenge");
          }

          const winnerWallet = finalizedRealtime.challenge.winnerWallet;
          const txDigest = finalizedRealtime.chainResult?.digest ?? null;
          const finalizedEvent = {
            challengeId: parsed.challengeId,
            winnerWallet,
            txDigest,
          };
          namespace.to(roomId).emit("match.result.finalized", finalizedEvent);

          const match = matchByChallenge.get(parsed.challengeId);
          if (match) {
            match.phase = "FINISHED";
            cleanupMatch(match);
            matchByChallenge.delete(parsed.challengeId);
          } else {
            challengeByRoom.delete(roomId);
            roomByChallenge.delete(parsed.challengeId);
            currentTurnByChallenge.delete(parsed.challengeId);
            shotSequenceByChallenge.delete(parsed.challengeId);
          }

          ack?.({
            ok: true,
            result: { totalSubmissions: finalizedRealtime.totalSubmissions },
            finalized: finalizedEvent,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
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
