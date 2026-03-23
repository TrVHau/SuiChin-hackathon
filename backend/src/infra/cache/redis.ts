import Redis from "ioredis";
import { env } from "../../config/env";

let client: Redis | null = null;

export function getRedisClient(): Redis {
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
