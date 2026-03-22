import assert from "node:assert/strict";
import request from "supertest";
import { beforeEach, describe, it } from "node:test";
import { createApp } from "../app/create-app";
import { challengeService } from "../modules/challenge/challenge.service";

describe("API", () => {
  const app = createApp();

  beforeEach(async () => {
    await challengeService.resetForTests();
  });

  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
  });

  it("creates and accepts a challenge", async () => {
    const created = await request(app)
      .post("/api/challenges")
      .set("x-wallet-address", "wallet_A")
      .send({
        mode: "REALTIME",
        opponentWallet: "wallet_B",
      });

    assert.equal(created.status, 201);
    const challengeId = created.body.challenge.id as string;

    const accepted = await request(app)
      .post(`/api/challenges/${challengeId}/accept`)
      .set("x-wallet-address", "wallet_B")
      .send({});

    assert.equal(accepted.status, 200);
    assert.equal(accepted.body.challenge.status, "ACTIVE");
  });
});
