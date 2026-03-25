import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { z } from "zod";
import { corsOrigins } from "../../config/env";
import { challengeService } from "../../modules/challenge/challenge.service";
import { SubmitResultSchema } from "../../modules/challenge/challenge.schemas";
import type { ChallengeResultRecord } from "../../modules/challenge/challenge.types";
import { matchmakingService } from "../../modules/matchmaking/matchmaking.service";

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

const QueueJoinPayloadSchema = z.object({
  wager: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

const MatchShotPayloadSchema = z.object({
  challengeId: z.string().uuid(),
  x: z.number().finite(),
  y: z.number().finite(),
  force: z.number().finite().min(0).max(5000),
});

export function attachMultiplayerGateway(server: HttpServer) {
  const io = new Server(server, {
    cors: { origin: corsOrigins, credentials: true },
  });

  const namespace = io.of("/multiplayer");
  const challengeByRoom = new Map<string, string>();
  const roomByChallenge = new Map<string, string>();
  const currentTurnByChallenge = new Map<string, string>();
  const shotSequenceByChallenge = new Map<string, number>();

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

          const walletAddress = getWalletFromSocket(socket);
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
            namespace.to(result.roomId).emit("match.start", {
              roomId: result.roomId,
              players: [walletAddress, result.opponentWallet],
              challengeId: challenge.id,
              wager: result.wager,
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
      const result = await matchmakingService.leaveQueue(walletAddress);
      ack?.({ ok: true, result });
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

        try {
          const finalized = await challengeService.finalizeChallenge(parsed.challengeId, winnerWallet);
          winnerWallet = finalized.challenge.winnerWallet;
          txDigest = finalized.chainResult.digest;
        } catch (err) {
          const existing = await challengeService.getChallenge(parsed.challengeId);
          if (!existing || existing.status !== "FINALIZED") {
            throw err;
          }
          winnerWallet = existing.winnerWallet;
        }

        if (roomId) {
          namespace.to(roomId).emit("match.result.finalized", {
            challengeId: parsed.challengeId,
            winnerWallet,
            txDigest,
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
