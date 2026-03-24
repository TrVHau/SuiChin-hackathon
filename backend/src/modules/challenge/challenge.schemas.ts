import { z } from "zod";

const WalletSchema = z.string().trim().min(3).max(128);

export const CreateChallengeSchema = z.object({
  mode: z.enum(["REALTIME", "ASYNC"]).default("REALTIME"),
  opponentWallet: WalletSchema.optional(),
  stakeEnabled: z.boolean().default(false),
  stakeAmount: z.coerce.number().nonnegative().default(0),
  expiresInSeconds: z.coerce.number().int().min(30).max(24 * 60 * 60).default(5 * 60),
});

export const SubmitResultSchema = z.object({
  challengeId: z.string().trim().min(1),
  result: z.enum(["WIN", "LOSE", "DRAW", "FORFEIT"]),
});

export const FinalizeChallengeSchema = z.object({
  winnerWallet: WalletSchema.nullable().optional(),
});

export const ChallengeIdParamSchema = z.object({
  challengeId: z.string().trim().min(1),
});
