import { createServer } from "node:http";
import { createApp } from "./app/create-app";
import { env } from "./config/env";
import { attachMultiplayerGateway } from "./gateways/socket/multiplayer.gateway";
import { ensureRuntimeDependencies } from "./infra/runtime/dependency-check";
import { logger } from "./shared/logger";
import { indexerService } from "./infra/chain/indexer.service";

async function bootstrap() {
  await ensureRuntimeDependencies();
  const app = createApp();
  const server = createServer(app);
  attachMultiplayerGateway(server);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Backend started");
    // Only run indexer when persistence backend is Prisma/Postgres.
    if (env.BACKEND_STORAGE === "prisma") {
      indexerService.start();
    } else {
      logger.info(
        { backendStorage: env.BACKEND_STORAGE },
        "Skipping indexer start because BACKEND_STORAGE is not prisma",
      );
    }
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Backend bootstrap failed");
  process.exit(1);
});
