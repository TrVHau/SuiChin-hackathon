import type {
  FinalizeChallengePayload,
  FinalizeChallengeResult,
  IChainAdapter,
} from "./chain-adapter";

export class MockChainAdapter implements IChainAdapter {
  async finalizeChallenge(payload: FinalizeChallengePayload): Promise<FinalizeChallengeResult> {
    return {
      digest: `mock_${payload.challengeId}_${Date.now()}`,
      finalizedAtMs: Date.now(),
    };
  }
}
