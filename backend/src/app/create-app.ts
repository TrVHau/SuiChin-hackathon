import cors from "cors";
import express from "express";
import helmet from "helmet";
import { createRequire } from "node:module";
import rateLimit from "express-rate-limit";
import { corsOrigins } from "../config/env.js";
import { errorHandler } from "./error-handler.js";
import { registerRoutes } from "./routes.js";
import { logger } from "../shared/logger.js";

const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http") as (options: unknown) => express.RequestHandler;

export function createApp() {
  const app = express();
  app.use(helmet({ crossOriginOpenerPolicy: false }));
  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120 }));
  app.use(pinoHttp({ logger }));

  registerRoutes(app);
  app.use(errorHandler);
  return app;
}
