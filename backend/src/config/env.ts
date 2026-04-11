import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  BACKEND_STORAGE: z.enum(["memory", "prisma"]).default("memory"),
  MATCHMAKING_BACKEND: z.enum(["memory", "redis"]).default("memory"),
  CHAIN_ADAPTER: z.enum(["mock", "sui_cli"]).default("mock"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  ORACLE_API_KEY: z.string().optional(),
  SUI_NETWORK: z.enum(["devnet", "testnet", "mainnet", "localnet"]).default("devnet"),
  SUI_RPC_URL: z.string().url().optional(),
  SUI_PACKAGE_ID: z.string().optional(),
  SUI_MATCH_ORACLE_ID: z.string().optional(),
  SUI_CLI_BIN: z.string().default("sui"),
  SUI_CLI_CONFIG_PATH: z.string().optional(),
  SUI_CLI_GAS_BUDGET: z.coerce.number().int().positive().default(100_000_000),
  SUI_ORACLE_SENDER: z.string().optional(),
  ADMIN_SECRET_KEY: z.string().default("suisecret1234567890abcdef"),
  LOBBY_PACKAGE_ID: z.string().optional(),
  LOBBY_CONFIG_OBJECT_ID: z.string().optional(),
  LOBBY_SIGNER_SECRET_KEY: z.string().optional(),
  LOBBY_SETTLEMENT_TTL_MS: z.coerce.number().int().positive().default(120_000),
});

export const env = EnvSchema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",").map((item) => item.trim());
