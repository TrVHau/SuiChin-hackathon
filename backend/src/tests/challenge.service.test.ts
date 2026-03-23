import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { ChallengeService } from "../modules/challenge/challenge.service";

describe("ChallengeService", () => {
  let service: ChallengeService;

  beforeEach(async () => {
    service = new ChallengeService();
    await service.resetForTests();
  });

  it("creates challenge and accepts by opponent", async () => {
    const challenge = await service.createChallenge("wallet_A", {
      mode: "REALTIME",
      opponentWallet: "wallet_B",
    });

    assert.equal(challenge.status, "OPEN");

    const accepted = await service.acceptChallenge(challenge.id, "wallet_B");
    assert.equal(accepted.status, "ACTIVE");
    assert.equal(accepted.opponentWallet, "wallet_B");
  });

  it("submits two results then finalizes", async () => {
    const challenge = await service.createChallenge("wallet_A", {
      mode: "REALTIME",
      opponentWallet: "wallet_B",
    });
    await service.acceptChallenge(challenge.id, "wallet_B");

    const submitA = await service.submitResult(challenge.id, "wallet_A", "WIN");
    assert.equal(submitA.totalSubmissions, 1);

    const submitB = await service.submitResult(challenge.id, "wallet_B", "LOSE");
    assert.equal(submitB.totalSubmissions, 2);

    const finalized = await service.finalizeChallenge(challenge.id, "wallet_A");
    assert.equal(finalized.challenge.status, "FINALIZED");
    assert.equal(finalized.chainResult.digest.startsWith("mock_"), true);
  });
});
