import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../app/create-app.js";
import { attachMultiplayerGateway } from "../gateways/socket/multiplayer.gateway.js";
import { challengeService } from "../modules/challenge/challenge.service.js";
import { matchmakingService } from "../modules/matchmaking/matchmaking.service.js";

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
    process.env.BACKEND_STORAGE = "memory";
    process.env.MATCHMAKING_BACKEND = "memory";
    process.env.CHAIN_ADAPTER = "mock";

    await matchmakingService.reset();
    await challengeService.resetForTests();
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

  it("matches online clients and finalizes a result", async () => {
    clientA = ioClient(baseUrl, {
      auth: { walletAddress: "wallet_A" },
      reconnection: false,
    });
    clientB = ioClient(baseUrl, {
      auth: { walletAddress: "wallet_B" },
      reconnection: false,
    });

    await Promise.all([waitForConnect(clientA), waitForConnect(clientB)]);

    const matchStartA = new Promise<{
      roomId: string;
      challengeId: string;
      players: string[];
    }>((resolve) => {
      clientA!.once("match.start", (payload) => resolve(payload));
    });
    const matchStartB = new Promise<{
      roomId: string;
      challengeId: string;
      players: string[];
    }>((resolve) => {
      clientB!.once("match.start", (payload) => resolve(payload));
    });

    const ackA = await new Promise<{
      ok: boolean;
      result: { matched: boolean };
    }>((resolve) => {
      clientA!.emit(
        "queue.join",
        {},
        (payload: { ok: boolean; result: { matched: boolean } }) =>
          resolve(payload),
      );
    });
    assert.equal(ackA.ok, true);
    assert.equal(ackA.result.matched, false);

    const ackB = await new Promise<{
      ok: boolean;
      result: { matched: boolean; challengeId?: string; opponentWallet?: string };
    }>((resolve) => {
      clientB!.emit(
        "queue.join",
        {},
        (payload: {
          ok: boolean;
          result: {
            matched: boolean;
            challengeId?: string;
            opponentWallet?: string;
          };
        }) => resolve(payload),
      );
    });
    assert.equal(ackB.ok, true);
    assert.equal(ackB.result.matched, true);
    assert.equal(ackB.result.opponentWallet, "wallet_A");
    assert.equal(Boolean(ackB.result.challengeId), true);

    const [startA, startB] = await Promise.all([matchStartA, matchStartB]);
    assert.equal(startA.challengeId, ackB.result.challengeId);
    assert.equal(startB.challengeId, ackB.result.challengeId);
    assert.deepEqual(startA.players, ["wallet_A", "wallet_B"]);

    const shotSeenByB = new Promise<{ byWallet: string; seq: number }>(
      (resolve) => {
        clientB!.once("match.shot.received", (payload) => resolve(payload));
      },
    );
    const shotAck = await new Promise<{
      ok: boolean;
      result?: { seq: number };
    }>((resolve) => {
      clientA!.emit(
        "match.shot.submit",
        { challengeId: ackB.result.challengeId, x: 0.5, y: 0.4, force: 1200 },
        (payload: { ok: boolean; result?: { seq: number } }) =>
          resolve(payload),
      );
    });
    assert.equal(shotAck.ok, true);
    assert.equal(shotAck.result?.seq, 1);
    assert.equal((await shotSeenByB).byWallet, "wallet_A");

    const finalizedA = new Promise<{ winnerWallet: string | null }>(
      (resolve) => {
        clientA!.once("match.result.finalized", (payload) => resolve(payload));
      },
    );
    const finalizedB = new Promise<{ winnerWallet: string | null }>(
      (resolve) => {
        clientB!.once("match.result.finalized", (payload) => resolve(payload));
      },
    );
    const submitA = await new Promise<{
      ok: boolean;
      finalized?: { winnerWallet: string | null };
    }>((resolve) => {
      clientA!.emit(
        "match.result.submit",
        { challengeId: ackB.result.challengeId, result: "WIN" },
        (payload: { ok: boolean; finalized?: { winnerWallet: string | null } }) =>
          resolve(payload),
      );
    });
    assert.equal(submitA.ok, true);
    assert.equal(submitA.finalized?.winnerWallet, "wallet_A");
    assert.equal((await finalizedA).winnerWallet, "wallet_A");
    assert.equal((await finalizedB).winnerWallet, "wallet_A");
  });
});
