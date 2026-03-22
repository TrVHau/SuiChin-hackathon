import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:5173"),
  BACKEND_STORAGE: z.enum(["memory", "prisma"]).default("memory"),
  MATCHMAKING_BACKEND: z.enum(["memory", "redis"]).default("memory"),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  ORACLE_API_KEY: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);
export const corsOrigins = env.CORS_ORIGINS.split(",").map((item) => item.trim());
