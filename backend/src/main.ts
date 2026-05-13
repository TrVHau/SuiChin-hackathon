import { createServer } from "node:http";
import { createApp } from "./app/create-app.js";
import { BUILD_MARKER, env } from "./config/env.js";
import { attachMultiplayerGateway } from "./gateways/socket/multiplayer.gateway.js";
import { ensureRuntimeDependencies } from "./infra/runtime/dependency-check.js";
import { logger } from "./shared/logger.js";
import { indexerService } from "./infra/chain/indexer.service.js";

async function bootstrap() {
  const app = createApp();
  const server = createServer(app);
  attachMultiplayerGateway(server);

  server.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        buildMarker: BUILD_MARKER,
        gitCommitSha: env.RAILWAY_GIT_COMMIT_SHA ?? null,
        railwayDeploymentId: env.RAILWAY_DEPLOYMENT_ID ?? null,
      },
      "Backend started",
    );
    ensureRuntimeDependencies().catch((err) => {
      logger.error({ err }, "Runtime dependency check failed after startup");
    });
    indexerService.start();
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, "Backend bootstrap failed");
  process.exit(1);
});
