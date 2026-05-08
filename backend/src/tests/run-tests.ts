import assert from "node:assert/strict";
import { createServer } from "node:http";
import request from "supertest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";

type AppFactory = {
  createApp: () => any;
  attachMultiplayerGateway: (server: ReturnType<typeof createServer>) => unknown;
  challengeService: {
    resetForTests: () => Promise<void>;
    createChallenge: (...args: any[]) => Promise<any>;
    acceptChallenge: (...args: any[]) => Promise<any>;
    submitResult: (...args: any[]) => Promise<any>;
    finalizeChallenge: (...args: any[]) => Promise<any>;
  };
  matchmakingService: {
    reset: () => Promise<void>;
  };
  valuationRoomService: {
    resetForTests: () => Promise<void>;
  };
  valuationRoomEvents: {
    emit: (eventName: "roomCreated" | "roomJoined" | "roomActivated", event: any) => void;
  };
};

function waitForConnect(socket: ClientSocket) {
  return new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
}

async function loadAppFactory(): Promise<AppFactory> {
  // Force test execution to use in-memory backends regardless of .env.
  process.env.BACKEND_STORAGE = "memory";
  process.env.MATCHMAKING_BACKEND = "memory";
  process.env.CHAIN_ADAPTER = "mock";
  process.env.NODE_ENV = "test";
  process.env.ADMIN_SECRET_KEY = "";
  process.env.LOBBY_SIGNER_SECRET_KEY = "";

  const [
    { createApp },
    { attachMultiplayerGateway },
    { challengeService },
    { matchmakingService },
    { valuationRoomService },
    { valuationRoomEvents },
  ] =
    await Promise.all([
      import("../app/create-app"),
      import("../gateways/socket/multiplayer.gateway"),
      import("../modules/challenge/challenge.service"),
      import("../modules/matchmaking/matchmaking.service"),
      import("../modules/valuation-room/valuation-room.service"),
      import("../gateways/socket/valuation-room-events"),
    ]);

  return {
    createApp,
    attachMultiplayerGateway,
    challengeService,
    matchmakingService,
    valuationRoomService,
    valuationRoomEvents,
  };
}

async function testServiceFlow(factory: AppFactory) {
  await factory.challengeService.resetForTests();
  const challenge = await factory.challengeService.createChallenge("wallet_A", {
    mode: "REALTIME",
    opponentWallet: "wallet_B",
  });
  assert.equal(challenge.status, "OPEN");

  const accepted = await factory.challengeService.acceptChallenge(challenge.id, "wallet_B");
  assert.equal(accepted.status, "ACTIVE");

  const submitA = await factory.challengeService.submitResult(challenge.id, "wallet_A", "WIN");
  assert.equal(submitA.totalSubmissions, 1);
  const submitB = await factory.challengeService.submitResult(challenge.id, "wallet_B", "LOSE");
  assert.equal(submitB.totalSubmissions, 2);

  const finalized = await factory.challengeService.finalizeChallenge(challenge.id, "wallet_A");
  assert.equal(finalized.challenge.status, "FINALIZED");
  assert.equal(finalized.chainResult.digest.startsWith("mock_"), true);
  console.log("PASS service flow");
}

async function testApiFlow(factory: AppFactory) {
  await factory.challengeService.resetForTests();
  const app = factory.createApp();

  const health = await request(app).get("/api/health");
  assert.equal(health.status, 200);
  assert.equal(health.body.ok, true);

  const created = await request(app)
    .post("/api/challenges")
    .set("x-wallet-address", "wallet_A")
    .send({ mode: "REALTIME", opponentWallet: "wallet_B" });
  assert.equal(created.status, 201);

  const challengeId = created.body.challenge.id as string;
  const accepted = await request(app)
    .post(`/api/challenges/${challengeId}/accept`)
    .set("x-wallet-address", "wallet_B")
    .send({});
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.challenge.status, "ACTIVE");
  console.log("PASS api flow");
}

async function testSocketFlow(factory: AppFactory) {
  await factory.matchmakingService.reset();
  await factory.challengeService.resetForTests();
  await factory.valuationRoomService.resetForTests();
  const app = factory.createApp();
  const server = createServer(app);
  factory.attachMultiplayerGateway(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Cannot resolve server address");
    }
    const url = `http://127.0.0.1:${address.port}/multiplayer`;

    const clientA = ioClient(url, { auth: { walletAddress: "wallet_A" }, reconnection: false });
    const clientB = ioClient(url, { auth: { walletAddress: "wallet_B" }, reconnection: false });

    try {
      await Promise.all([waitForConnect(clientA), waitForConnect(clientB)]);

      const matchFoundA = new Promise<{
        roomId: string;
        challengeId: string;
        creator: string;
        joiner: string;
        tier: string;
      }>((resolve) => {
        clientA.once("match.found", (payload) => resolve(payload));
      });
      const matchFoundB = new Promise<{
        roomId: string;
        challengeId: string;
        creator: string;
        joiner: string;
        tier: string;
      }>((resolve) => {
        clientB.once("match.found", (payload) => resolve(payload));
      });

      const nftA = { id: "0xa1", name: "Bronze A", tier: 1 };
      const nftB = { id: "0xb2", name: "Bronze B", tier: 1 };

      const ackA = await new Promise<{ ok: boolean; result: { matched: boolean } }>((resolve) => {
        clientA.emit(
          "queue.join",
          { tier: "0_5_SUI", nft: nftA },
          (payload: { ok: boolean; result: { matched: boolean } }) => resolve(payload),
        );
      });
      assert.equal(ackA.ok, true);
      assert.equal(ackA.result.matched, false);

      const ackB = await new Promise<{
        ok: boolean;
        result: { matched: boolean; roomId?: string; challengeId?: string; tier?: string };
      }>((resolve) => {
        clientB.emit(
          "queue.join",
          { tier: "0_5_SUI", nft: nftB },
          (payload: {
            ok: boolean;
            result: { matched: boolean; roomId?: string; challengeId?: string; tier?: string };
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

      const roomReadyB = new Promise<{ tempRoomId: string; suiRoomId: string }>((resolve) => {
        clientB.once("match.roomReady", (payload) => resolve(payload));
      });
      const suiRoomId = "0xabc123";
      factory.valuationRoomEvents.emit("roomCreated", {
        roomId: suiRoomId,
        creator: "wallet_A",
        txDigest: "tx_room_created",
        eventSeq: "0",
      });
      const ready = await roomReadyB;
      assert.equal(ready.suiRoomId, suiRoomId);

      const matchStartA = new Promise<{ roomId: string; challengeId: string }>((resolve) => {
        clientA.once("match.start", (payload) => resolve(payload));
      });
      const matchStartB = new Promise<{ roomId: string; challengeId: string }>((resolve) => {
        clientB.once("match.start", (payload) => resolve(payload));
      });
      factory.valuationRoomEvents.emit("roomJoined", {
        roomId: suiRoomId,
        joiner: "wallet_B",
        txDigest: "tx_room_joined",
        eventSeq: "1",
      });
      factory.valuationRoomEvents.emit("roomActivated", {
        roomId: suiRoomId,
        txDigest: "tx_room_joined",
        eventSeq: "2",
      });
      const [startA, startB] = await Promise.all([matchStartA, matchStartB]);
      assert.equal(startA.roomId, suiRoomId);
      assert.equal(startB.challengeId, ackB.result.challengeId);

      const shotSeenByB = new Promise<{ byWallet: string; seq: number }>((resolve) => {
        clientB.once("match.shot.received", (payload) => resolve(payload));
      });
      const shotAck = await new Promise<{ ok: boolean; result?: { seq: number } }>((resolve) => {
        clientA.emit(
          "match.shot.submit",
          { challengeId: ackB.result.challengeId, x: 0.5, y: 0.4, force: 1200 },
          (payload: { ok: boolean; result?: { seq: number } }) => resolve(payload),
        );
      });
      assert.equal(shotAck.ok, true);
      assert.equal(shotAck.result?.seq, 1);
      const shot = await shotSeenByB;
      assert.equal(shot.byWallet, "wallet_A");

      const finalizedA = new Promise<{ challengeId: string; winnerWallet: string | null }>((resolve) => {
        clientA.once("match.result.finalized", (payload) => resolve(payload));
      });

      const resultA = await new Promise<{ ok: boolean; result?: { totalSubmissions: number } }>((resolve) => {
        clientA.emit(
          "match.result.submit",
          { challengeId: ackB.result.challengeId, result: "WIN" },
          (payload: { ok: boolean; result?: { totalSubmissions: number } }) => resolve(payload),
        );
      });
      assert.equal(resultA.ok, true);
      assert.equal(resultA.result?.totalSubmissions, 1);

      const resultB = await new Promise<{ ok: boolean; finalized?: { winnerWallet: string | null } }>((resolve) => {
        clientB.emit(
          "match.result.submit",
          { challengeId: ackB.result.challengeId, result: "LOSE" },
          (payload: { ok: boolean; finalized?: { winnerWallet: string | null } }) => resolve(payload),
        );
      });
      assert.equal(resultB.ok, true);
      assert.equal(Boolean(resultB.finalized), true);

      const finalized = await finalizedA;
      assert.equal(finalized.challengeId, ackB.result.challengeId);
      assert.equal(finalized.winnerWallet, "wallet_A");
      console.log("PASS socket flow");
    } finally {
      clientA.disconnect();
      clientB.disconnect();
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}
async function run() {
  const factory = await loadAppFactory();
  await testServiceFlow(factory);
  await testApiFlow(factory);
  await testSocketFlow(factory);
  console.log("ALL TESTS PASSED");
}

run().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
