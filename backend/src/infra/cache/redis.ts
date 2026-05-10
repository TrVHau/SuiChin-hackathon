import { createRequire } from "node:module";
import type { Redis as RedisClient } from "ioredis";
import { env } from "../../config/env.js";

const require = createRequire(import.meta.url);
const Redis = require("ioredis") as new (...args: unknown[]) => RedisClient;

let client: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!env.REDIS_URL) {
    throw new Error("REDIS_URL is required when MATCHMAKING_BACKEND=redis");
  }
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 2000,
      retryStrategy: () => null,
    });
    client.on("error", () => {
      // Avoid unhandled error event noise; callers handle command failures.
    });
  }
  return client;
}
