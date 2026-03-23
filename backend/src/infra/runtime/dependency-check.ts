import { env } from "../../config/env";
import { getRedisClient } from "../cache/redis";
import { getPrismaClient } from "../db/prisma";

type DependencyStatus = "ready" | "disabled" | "failed";

export interface RuntimeDependencyReport {
  storage: {
    backend: "memory" | "prisma";
    status: DependencyStatus;
    detail?: string;
  };
  matchmaking: {
    backend: "memory" | "redis";
    status: DependencyStatus;
    detail?: string;
  };
}

async function checkPrisma(): Promise<{ status: DependencyStatus; detail?: string }> {
  if (env.BACKEND_STORAGE !== "prisma") {
    return { status: "disabled" };
  }

  try {
    const prisma = getPrismaClient();
    await prisma.$queryRawUnsafe("SELECT 1");
    return { status: "ready" };
  } catch (err) {
    return {
      status: "failed",
      detail: err instanceof Error ? err.message : "Prisma connection failed",
    };
  }
}

async function checkRedis(): Promise<{ status: DependencyStatus; detail?: string }> {
  if (env.MATCHMAKING_BACKEND !== "redis") {
    return { status: "disabled" };
  }

  try {
    const redis = getRedisClient();
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const pong = await redis.ping();
    if (pong !== "PONG") {
      return { status: "failed", detail: `Unexpected redis ping response: ${pong}` };
    }
    return { status: "ready" };
  } catch (err) {
    return {
      status: "failed",
      detail: err instanceof Error ? err.message : "Redis connection failed",
    };
  }
}

export async function getRuntimeDependencyReport(): Promise<RuntimeDependencyReport> {
  const [storageCheck, matchmakingCheck] = await Promise.all([checkPrisma(), checkRedis()]);

  return {
    storage: {
      backend: env.BACKEND_STORAGE,
      status: storageCheck.status,
      detail: storageCheck.detail,
    },
    matchmaking: {
      backend: env.MATCHMAKING_BACKEND,
      status: matchmakingCheck.status,
      detail: matchmakingCheck.detail,
    },
  };
}

export async function ensureRuntimeDependencies(): Promise<void> {
  const report = await getRuntimeDependencyReport();
  const failures: string[] = [];

  if (report.storage.status === "failed") {
    failures.push(`storage(${report.storage.backend}): ${report.storage.detail ?? "failed"}`);
  }
  if (report.matchmaking.status === "failed") {
    failures.push(
      `matchmaking(${report.matchmaking.backend}): ${report.matchmaking.detail ?? "failed"}`,
    );
  }

  if (failures.length > 0) {
    throw new Error(`Runtime dependency check failed: ${failures.join(" | ")}`);
  }
}
