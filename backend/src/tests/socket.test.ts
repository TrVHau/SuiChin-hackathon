import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../app/create-app";
import { attachMultiplayerGateway } from "../gateways/socket/multiplayer.gateway";
import { matchmakingService } from "../modules/matchmaking/matchmaking.service";

function waitForConnect(socket: ClientSocket) {
  return new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

describe("socket /multiplayer", () => {
  let server: HttpServer;
  let baseUrl = "";
  let clientA: ClientSocket | null = null;
  let clientB: ClientSocket | null = null;

  beforeEach(async () => {
    await matchmakingService.reset();
    const app = createApp();
    server = createServer(app);
    attachMultiplayerGateway(server);
    await new Promise<void>((resolve) => server.listen(0, resolve));

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Server address not available");
    }
    baseUrl = `http://127.0.0.1:${address.port}/multiplayer`;
  });

  afterEach(async () => {
    const closeSocket = async (socket: ClientSocket | null) => {
      if (!socket) return;
      socket.removeAllListeners();
      socket.disconnect();
    };

    await closeSocket(clientA);
    await closeSocket(clientB);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("matches two clients when both join queue", async () => {
    clientA = ioClient(baseUrl, { auth: { walletAddress: "wallet_A" }, reconnection: false });
    clientB = ioClient(baseUrl, { auth: { walletAddress: "wallet_B" }, reconnection: false });

    await Promise.all([waitForConnect(clientA), waitForConnect(clientB)]);

    const matchA = new Promise<{ roomId: string; players: string[]; challengeId: string }>((resolve) => {
      clientA!.once("match.start", (payload: { roomId: string; players: string[]; challengeId: string }) =>
        resolve(payload),
      );
    });
    const matchB = new Promise<{ roomId: string; players: string[]; challengeId: string }>((resolve) => {
      clientB!.once("match.start", (payload: { roomId: string; players: string[]; challengeId: string }) =>
        resolve(payload),
      );
    });

    const ackA = await new Promise<{ ok: boolean; result: { matched: boolean } }>((resolve) => {
      clientA!.emit("queue.join", (payload: { ok: boolean; result: { matched: boolean } }) => {
        resolve(payload);
      });
    });
    assert.equal(ackA.ok, true);
    assert.equal(ackA.result.matched, false);

    const ackB = await new Promise<{
      ok: boolean;
      result: { matched: boolean; roomId?: string; opponentWallet?: string; challengeId?: string };
    }>((resolve) => {
      clientB!.emit(
        "queue.join",
        (payload: {
          ok: boolean;
          result: { matched: boolean; roomId?: string; opponentWallet?: string; challengeId?: string };
        }) => {
          resolve(payload);
        },
      );
    });

    assert.equal(ackB.ok, true);
    assert.equal(ackB.result.matched, true);
    assert.equal(ackB.result.opponentWallet, "wallet_A");
    assert.equal(ackB.result.roomId?.includes("match:"), true);
    assert.equal(Boolean(ackB.result.challengeId), true);

    const [matchStartA, matchStartB] = await Promise.all([matchA, matchB]);
    assert.equal(matchStartA.roomId, ackB.result.roomId);
    assert.equal(matchStartB.roomId, ackB.result.roomId);
    assert.equal(matchStartA.challengeId, ackB.result.challengeId);
    assert.equal(matchStartB.challengeId, ackB.result.challengeId);
    assert.equal(matchStartA.players.includes("wallet_A"), true);
    assert.equal(matchStartA.players.includes("wallet_B"), true);
  });
});
