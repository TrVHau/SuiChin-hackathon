import assert from "node:assert/strict";
import { createServer, type Server as HttpServer } from "node:http";
import { afterEach, beforeEach, describe, it } from "node:test";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import { createApp } from "../app/create-app.js";
import { attachMultiplayerGateway } from "../gateways/socket/multiplayer.gateway.js";
import { valuationRoomEvents } from "../gateways/socket/valuation-room-events.js";
import { matchmakingService } from "../modules/matchmaking/matchmaking.service.js";
import { challengeService } from "../modules/challenge/challenge.service.js";
import { valuationRoomService } from "../modules/valuation-room/valuation-room.service.js";

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
    await challengeService.resetForTests();
    await valuationRoomService.resetForTests();
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

  it("matches tiered valuation clients after escrow notifications", async () => {
    clientA = ioClient(baseUrl, { auth: { walletAddress: "wallet_A" }, reconnection: false });
    clientB = ioClient(baseUrl, { auth: { walletAddress: "wallet_B" }, reconnection: false });

    await Promise.all([waitForConnect(clientA), waitForConnect(clientB)]);

    const matchFoundA = new Promise<{ roomId: string; challengeId: string; creator: string; joiner: string }>(
      (resolve) => {
        clientA!.once("match.found", (payload) => resolve(payload));
      },
    );
    const matchFoundB = new Promise<{ roomId: string; challengeId: string }>((resolve) => {
      clientB!.once("match.found", (payload) => resolve(payload));
    });

    const ackA = await new Promise<{ ok: boolean; result: { matched: boolean } }>((resolve) => {
      clientA!.emit(
        "queue.join",
        { tier: "0_5_SUI", nft: { id: "0xa1", name: "Bronze A", tier: 1 } },
        (payload: { ok: boolean; result: { matched: boolean } }) => resolve(payload),
      );
    });
    assert.equal(ackA.ok, true);
    assert.equal(ackA.result.matched, false);

    const ackB = await new Promise<{
      ok: boolean;
      result: { matched: boolean; challengeId?: string; tier?: string };
    }>((resolve) => {
      clientB!.emit(
        "queue.join",
        { tier: "0_5_SUI", nft: { id: "0xb2", name: "Bronze B", tier: 1 } },
        (payload: {
          ok: boolean;
          result: { matched: boolean; challengeId?: string; tier?: string };
        }) => resolve(payload),
      );
    });

    assert.equal(ackB.ok, true);
    assert.equal(ackB.result.matched, true);
    assert.equal(ackB.result.tier, "0_5_SUI");
    assert.equal(Boolean(ackB.result.challengeId), true);

    const [foundA, foundB] = await Promise.all([matchFoundA, matchFoundB]);
    assert.equal(foundA.challengeId, ackB.result.challengeId);
    assert.equal(foundB.challengeId, ackB.result.challengeId);
    assert.equal(foundA.creator, "wallet_A");
    assert.equal(foundA.joiner, "wallet_B");

    const readyForJoiner = new Promise<{ suiRoomId: string }>((resolve) => {
      clientB!.once("match.roomReady", (payload) => resolve(payload));
    });
    const suiRoomId = "0xabc123";
    valuationRoomEvents.emit("roomCreated", {
      roomId: suiRoomId,
      creator: "wallet_A",
      txDigest: "tx_room_created",
      eventSeq: "0",
    });
    assert.equal((await readyForJoiner).suiRoomId, suiRoomId);

    const matchStartA = new Promise<{ roomId: string; challengeId: string }>((resolve) => {
      clientA!.once("match.start", (payload) => resolve(payload));
    });
    const matchStartB = new Promise<{ roomId: string; challengeId: string }>((resolve) => {
      clientB!.once("match.start", (payload) => resolve(payload));
    });
    valuationRoomEvents.emit("roomJoined", {
      roomId: suiRoomId,
      joiner: "wallet_B",
      txDigest: "tx_room_joined",
      eventSeq: "1",
    });
    valuationRoomEvents.emit("roomActivated", {
      roomId: suiRoomId,
      txDigest: "tx_room_joined",
      eventSeq: "2",
    });
    const [startA, startB] = await Promise.all([matchStartA, matchStartB]);
    assert.equal(startA.roomId, suiRoomId);
    assert.equal(startB.challengeId, ackB.result.challengeId);

    const shotSeenByB = new Promise<{ byWallet: string; seq: number }>((resolve) => {
      clientB!.once("match.shot.received", (payload) => resolve(payload));
    });
    const shotAck = await new Promise<{ ok: boolean; result?: { seq: number } }>(
      (resolve) => {
        clientA!.emit(
          "match.shot.submit",
          { challengeId: ackB.result.challengeId, x: 0.5, y: 0.4, force: 1200 },
          (payload: { ok: boolean; result?: { seq: number } }) => resolve(payload),
        );
      },
    );
    assert.equal(shotAck.ok, true);
    assert.equal(shotAck.result?.seq, 1);
    assert.equal((await shotSeenByB).byWallet, "wallet_A");

    const finalizedA = new Promise<{ winnerWallet: string | null }>((resolve) => {
      clientA!.once("match.result.finalized", (payload) => resolve(payload));
    });
    const submitA = await new Promise<{ ok: boolean; result?: { totalSubmissions: number } }>(
      (resolve) => {
        clientA!.emit(
          "match.result.submit",
          { challengeId: ackB.result.challengeId, result: "WIN" },
          (payload: { ok: boolean; result?: { totalSubmissions: number } }) => resolve(payload),
        );
      },
    );
    assert.equal(submitA.ok, true);
    assert.equal(submitA.result?.totalSubmissions, 1);

    const submitB = await new Promise<{ ok: boolean; finalized?: { winnerWallet: string | null } }>(
      (resolve) => {
        clientB!.emit(
          "match.result.submit",
          { challengeId: ackB.result.challengeId, result: "LOSE" },
          (payload: { ok: boolean; finalized?: { winnerWallet: string | null } }) => resolve(payload),
        );
      },
    );
    assert.equal(submitB.ok, true);
    assert.equal(Boolean(submitB.finalized), true);
    assert.equal((await finalizedA).winnerWallet, "wallet_A");
  });
});
