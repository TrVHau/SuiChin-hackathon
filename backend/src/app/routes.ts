import type { Express } from "express";
import { Router } from "express";
import { env } from "../config/env";
import { getRuntimeDependencyReport } from "../infra/runtime/dependency-check";
import { challengeService } from "../modules/challenge/challenge.service";
import {
  ChallengeIdParamSchema,
  CreateChallengeSchema,
  FinalizeChallengeSchema,
  SubmitResultSchema,
} from "../modules/challenge/challenge.schemas";
import { getOracleApiKey, getWalletAddress } from "../shared/auth";
import { AppError } from "../shared/errors";

export function registerRoutes(app: Express) {
  const api = Router();

  api.get("/health", (_req, res) => {
    return res.json({
      ok: true,
      storageBackend: env.BACKEND_STORAGE,
      matchmakingBackend: env.MATCHMAKING_BACKEND,
      chainAdapter: env.CHAIN_ADAPTER,
      suiNetwork: env.SUI_NETWORK,
    });
  });

  api.get("/ready", async (_req, res) => {
    const report = await getRuntimeDependencyReport();
    const isReady = report.storage.status !== "failed" && report.matchmaking.status !== "failed";
    return res.status(isReady ? 200 : 503).json({
      ok: isReady,
      dependencies: report,
    });
  });

  api.post("/challenges", async (req, res) => {
    const body = CreateChallengeSchema.parse(req.body);
    const walletAddress = getWalletAddress(req);
    const challenge = await challengeService.createChallenge(walletAddress, body);
    return res.status(201).json({ challenge });
  });

  api.post("/challenges/:challengeId/accept", async (req, res) => {
    const { challengeId } = ChallengeIdParamSchema.parse(req.params);
    const walletAddress = getWalletAddress(req);
    const challenge = await challengeService.acceptChallenge(challengeId, walletAddress);
    return res.json({ challenge });
  });

  api.post("/challenges/:challengeId/cancel", async (req, res) => {
    const { challengeId } = ChallengeIdParamSchema.parse(req.params);
    const walletAddress = getWalletAddress(req);
    const challenge = await challengeService.cancelChallenge(challengeId, walletAddress);
    return res.json({ challenge });
  });

  api.post("/challenges/:challengeId/results", async (req, res) => {
    const { challengeId } = ChallengeIdParamSchema.parse(req.params);
    const walletAddress = getWalletAddress(req);
    const parsed = SubmitResultSchema.parse({
      challengeId,
      result: req.body?.result,
    });

    const result = await challengeService.submitResult(
      parsed.challengeId,
      walletAddress,
      parsed.result,
    );
    return res.json(result);
  });

  api.post("/challenges/:challengeId/finalize", async (req, res) => {
    const { challengeId } = ChallengeIdParamSchema.parse(req.params);
    const body = FinalizeChallengeSchema.parse(req.body ?? {});

    if (env.ORACLE_API_KEY) {
      const providedKey = getOracleApiKey(req);
      if (providedKey !== env.ORACLE_API_KEY) {
        throw new AppError("FORBIDDEN", "Invalid oracle key", 403);
      }
    }

    const result = await challengeService.finalizeChallenge(
      challengeId,
      body.winnerWallet ?? null,
    );
    return res.json(result);
  });

  app.use("/api", api);
}
