import { Router } from "express";
import { indexerController } from "./indexer.controller";

const router = Router();

// Define indexer REST endpoints
// Uses .bind to preserve the 'this' context of the controller class
router.get(
  "/leaderboard",
  indexerController.getLeaderboard.bind(indexerController),
);
router.get(
  "/matches/:user_address",
  indexerController.getMatchHistory.bind(indexerController),
);
router.get(
  "/marketplace/floor",
  indexerController.getMarketplaceFloor.bind(indexerController),
);

export { router as indexerRoutes };
