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
  process.env.NODE_ENV = "test";

  const [{ createApp }, { attachMultiplayerGateway }, { challengeService }, { matchmakingService }] =
    await Promise.all([
      import("../app/create-app"),
      import("../gateways/socket/multiplayer.gateway"),
      import("../modules/challenge/challenge.service"),
      import("../modules/matchmaking/matchmaking.service"),
    ]);

  return {
    createApp,
    attachMultiplayerGateway,
    challengeService,
    matchmakingService,
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
      const matchStartA = new Promise<{
        roomId: string;
        players: string[];
        challengeId: string;
      }>((resolve) => {
        clientA.once(
          "match.start",
          (payload: { roomId: string; players: string[]; challengeId: string }) =>
            resolve(payload),
        );
      });
      const matchStartB = new Promise<{
        roomId: string;
        players: string[];
        challengeId: string;
      }>((resolve) => {
        clientB.once(
          "match.start",
          (payload: { roomId: string; players: string[]; challengeId: string }) =>
            resolve(payload),
        );
      });

      const ackA = await new Promise<{ ok: boolean; result: { matched: boolean } }>((resolve) => {
        clientA.emit("queue.join", (payload: { ok: boolean; result: { matched: boolean } }) => {
          resolve(payload);
        });
      });
      assert.equal(ackA.ok, true);
      assert.equal(ackA.result.matched, false);

      const ackB = await new Promise<{
        ok: boolean;
        result: {
          matched: boolean;
          opponentWallet?: string;
          roomId?: string;
          challengeId?: string;
        };
      }>((resolve) => {
        clientB.emit(
          "queue.join",
          (payload: {
            ok: boolean;
            result: {
              matched: boolean;
              opponentWallet?: string;
              roomId?: string;
              challengeId?: string;
            };
          }) => resolve(payload),
        );
      });

      assert.equal(ackB.ok, true);
      assert.equal(ackB.result.matched, true);
      assert.equal(ackB.result.opponentWallet, "wallet_A");
      assert.equal(Boolean(ackB.result.roomId?.includes("match:")), true);
      assert.equal(Boolean(ackB.result.challengeId), true);

      const [startA, startB] = await Promise.all([matchStartA, matchStartB]);
      assert.equal(startA.challengeId, ackB.result.challengeId);
      assert.equal(startB.challengeId, ackB.result.challengeId);

      const challengeId = ackB.result.challengeId as string;
      const finalizeEvent = new Promise<{
        challengeId: string;
        winnerWallet: string | null;
        txDigest: string | null;
      }>((resolve) => {
        clientA.once(
          "match.result.finalized",
          (payload: { challengeId: string; winnerWallet: string | null; txDigest: string | null }) =>
            resolve(payload),
        );
      });

      const submitA = await new Promise<{ ok: boolean; result?: { totalSubmissions: number } }>(
        (resolve) => {
          clientA.emit(
            "match.result.submit",
            { challengeId, result: "WIN" },
            (payload: { ok: boolean; result?: { totalSubmissions: number } }) => resolve(payload),
          );
        },
      );
      assert.equal(submitA.ok, true);
      assert.equal(submitA.result?.totalSubmissions, 1);

      const submitB = await new Promise<{ ok: boolean; result?: { totalSubmissions: number } }>(
        (resolve) => {
          clientB.emit(
            "match.result.submit",
            { challengeId, result: "LOSE" },
            (payload: { ok: boolean; result?: { totalSubmissions: number } }) => resolve(payload),
          );
        },
      );
      assert.equal(submitB.ok, true);
      assert.equal(submitB.result?.totalSubmissions, 2);

      const finalized = await finalizeEvent;
      assert.equal(finalized.challengeId, challengeId);
      assert.equal(finalized.winnerWallet, "wallet_A");
      assert.equal(Boolean(finalized.txDigest), true);
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
