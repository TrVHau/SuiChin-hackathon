import { env } from "../../config/env.js";
import { getPrismaClient } from "../db/prisma.js";

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

  if (!env.REDIS_URL) {
    return {
      status: "failed",
      detail: "REDIS_URL is required when MATCHMAKING_BACKEND=redis",
    };
  }

  // Do not open a Redis connection during startup. ioredis can reject pending
  // connect promises after the dependency check has already returned, which
  // is fatal on Node 22. Matchmaking commands connect lazily and fall back to
  // in-memory queues if Redis is unavailable.
  return { status: "ready", detail: "lazy connection" };
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
