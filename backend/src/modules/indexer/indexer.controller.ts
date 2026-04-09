import { Request, Response } from "express";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { logger } from "../../shared/logger";

const prisma = new PrismaClient();

// Shared validation schemas
const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const AddressParamSchema = z.object({
  user_address: z.string().min(64, "Invalid Sui address format"), // Simplistic check
});

export class IndexerController {
  /**
   * GET /leaderboard
   * Aggregates MatchEvents to get points for players.
   * Note: In a production heavily-active game, calculating this in-flight is slow.
   * For the internship MVP, grouping over the relational table is acceptable.
   */
  public async getLeaderboard(req: Request, res: Response) {
    try {
      const { limit } = PaginationSchema.parse(req.query);

      // Using raw query for standard GROUP BY summation over ranking.
      // ELO/Points are derived from how many points they earned.
      const leaderboard = await prisma.$queryRaw`
        SELECT "winnerAddress" as player, SUM("pointChange") as total_points, COUNT(id) as matches_won
        FROM "MatchEvent"
        GROUP BY "winnerAddress"
        ORDER BY total_points DESC
        LIMIT ${limit}
      `;

      res.status(200).json({
        success: true,
        data: leaderboard,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error({ error }, "Failed to fetch leaderboard");
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  /**
   * GET /matches/:user_address
   * Fetches match history where the given user was either the winner or loser.
   */
  public async getMatchHistory(req: Request, res: Response) {
    try {
      const { limit, cursor } = PaginationSchema.parse(req.query);
      const { user_address } = AddressParamSchema.parse(req.params);

      // Cursor-based pagination logic using `id` or `timestampMs`
      // For Prisma, we typically use the unique `id` (uuid).
      const matches = await prisma.matchEvent.findMany({
        where: {
          OR: [{ winnerAddress: user_address }, { loserAddress: user_address }],
        },
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: {
          timestampMs: "desc",
        },
      });

      const nextCursor =
        matches.length === limit ? matches[matches.length - 1].id : null;

      res.status(200).json({
        success: true,
        data: matches,
        nextCursor,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error({ error }, "Failed to fetch match history");
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  /**
   * GET /marketplace/floor
   * Returns active marketplace listings aggregated (lowest price).
   */
  public async getMarketplaceFloor(req: Request, res: Response) {
    try {
      const { limit } = PaginationSchema.parse(req.query);

      // Example floor logic: group by item type (if mapped to itemId), return MIN(price)
      // Since `MarketplaceListing` acts purely over distinct items in MVP,
      // we just return the cheapest ACTIVE items overall sorted.
      const listings = await prisma.marketplaceListing.findMany({
        where: {
          status: "ACTIVE",
        },
        take: limit,
        orderBy: {
          price: "asc",
        },
      });

      res.status(200).json({
        success: true,
        data: listings,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.errors });
        return;
      }
      logger.error({ error }, "Failed to fetch marketplace floor");
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }
}

export const indexerController = new IndexerController();
