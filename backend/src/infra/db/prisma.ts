import { env } from "../../config/env";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

type PrismaLikeClient = Record<string, any>;

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaLikeClient | undefined;
}

function createPrismaClient(): PrismaLikeClient {
  // Load at runtime so build does not depend on generated Prisma client typings.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const prismaModule = require("@prisma/client") as Record<string, any>;
  const PrismaClientCtor = prismaModule.PrismaClient;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const adapterModule = require("@prisma/adapter-pg") as Record<string, any>;
  if (!PrismaClientCtor) {
    throw new Error(
      "PrismaClient is unavailable. Run `npm run prisma:gen` after setting up prisma/schema.prisma.",
    );
  }
  if (!adapterModule?.PrismaPg) {
    throw new Error(
      "Prisma Postgres adapter package is missing. Install @prisma/adapter-pg.",
    );
  }
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for BACKEND_STORAGE=prisma");
  }

  const adapter = new adapterModule.PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClientCtor({ adapter });
}

export function getPrismaClient(): PrismaLikeClient {
  if (!globalThis.__prisma) {
    globalThis.__prisma = createPrismaClient();
  }
  return globalThis.__prisma;
}
