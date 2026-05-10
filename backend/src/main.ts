import { createServer } from "node:http";
import { createApp } from "./app/create-app.js";
import { env } from "./config/env.js";
import { attachMultiplayerGateway } from "./gateways/socket/multiplayer.gateway.js";
import { ensureRuntimeDependencies } from "./infra/runtime/dependency-check.js";
import { logger } from "./shared/logger.js";
import { indexerService } from "./infra/chain/indexer.service.js";

async function bootstrap() {
  const app = createApp();
  const server = createServer(app);
  attachMultiplayerGateway(server);

  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "Backend started");
    ensureRuntimeDependencies().catch((err) => {
      logger.error({ err }, "Runtime dependency check failed after startup");
    });
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
