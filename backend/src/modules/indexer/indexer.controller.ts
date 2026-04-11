import { Request, Response } from "express";
import { z } from "zod";
import { logger } from "../../shared/logger";
import { getPrismaClient } from "../../infra/db/prisma";

const prisma = getPrismaClient() as Record<string, any>;

// Shared validation schemas
const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

const AddressParamSchema = z.object({
  user_address: z.string().min(64, "Invalid Sui address format"), // Simplistic check
});

const RoomParamSchema = z.object({
  roomId: z.string().min(1),
});

export class IndexerController {
  public async getPlayerProfileSummary(req: Request, res: Response) {
    try {
      const { user_address } = AddressParamSchema.parse(req.params);

      const [wins, losses, crafts, fusions] = await Promise.all([
        prisma.matchEvent.count({ where: { winnerAddress: user_address } }),
        prisma.matchEvent.count({ where: { loserAddress: user_address } }),
        prisma.craftEvent.count({ where: { playerAddress: user_address } }),
        prisma.fusionEvent.count({ where: { playerAddress: user_address } }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          address: user_address,
          wins,
          losses,
          crafts,
          fusions,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      logger.error({ error }, "Failed to fetch player profile summary");
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  public async getPlayerInventorySummary(req: Request, res: Response) {
    try {
      const { user_address } = AddressParamSchema.parse(req.params);

      const [craftRows, fusionRows] = await Promise.all([
        prisma.craftEvent.findMany({
          where: { playerAddress: user_address },
          orderBy: { timestampMs: "desc" },
          take: 100,
        }),
        prisma.fusionEvent.findMany({
          where: { playerAddress: user_address },
          orderBy: { timestampMs: "desc" },
          take: 100,
        }),
      ]);

      const mintedNfts = craftRows.filter(
        (item: any) => item.itemType !== "SCRAP",
      ).length;
      const mintedScraps = craftRows.filter(
        (item: any) => item.itemType === "SCRAP",
      ).length;

      res.status(200).json({
        success: true,
        data: {
          address: user_address,
          mintedNfts,
          mintedScraps,
          fusedBronze: fusionRows.length,
          latestCrafts: craftRows.slice(0, 20),
          latestFusions: fusionRows.slice(0, 20),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      logger.error({ error }, "Failed to fetch player inventory summary");
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  public async getCraftHistory(req: Request, res: Response) {
    try {
      const { user_address } = AddressParamSchema.parse(req.params);
      const { limit, cursor } = PaginationSchema.parse(req.query);

      const rows = await prisma.craftEvent.findMany({
        where: { playerAddress: user_address },
        take: limit,
        skip: cursor ? 1 : 0,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { timestampMs: "desc" },
      });

      const nextCursor =
        rows.length === limit ? rows[rows.length - 1].id : null;

      res.status(200).json({
        success: true,
        data: rows,
        nextCursor,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      logger.error({ error }, "Failed to fetch craft history");
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

  public async getRoomProof(req: Request, res: Response) {
    try {
      const { roomId } = RoomParamSchema.parse(req.params);

      const rows = await prisma.matchEvent.findMany({
        where: { roomId },
        orderBy: { timestampMs: "desc" },
      });

      res.status(200).json({
        success: true,
        data: {
          roomId,
          proofs: rows,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      logger.error({ error }, "Failed to fetch room proof");
      res
        .status(500)
        .json({ success: false, message: "Internal Server Error" });
    }
  }

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
        res.status(400).json({ success: false, errors: error.issues });
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
        res.status(400).json({ success: false, errors: error.issues });
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
        res.status(400).json({ success: false, errors: error.issues });
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
