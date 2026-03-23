import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import { corsOrigins } from "../config/env";
import { errorHandler } from "./error-handler";
import { registerRoutes } from "./routes";
import { logger } from "../shared/logger";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120 }));
  app.use(pinoHttp({ logger }));

  registerRoutes(app);
  app.use(errorHandler);
  return app;
}
