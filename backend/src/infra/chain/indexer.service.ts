import { suiClient } from "./sui-client";
import { PrismaClient } from "@prisma/client";
import { env } from "../../config/env";
import { logger } from "../../shared/logger";
import cron from "node-cron";

const prisma = new PrismaClient();

// The package ID to filter out events
const PACKAGE_ID = env.SUI_PACKAGE_ID || "";

export class IndexerService {
  private isCatchingUp = false;

  constructor() {}

  /**
   * Main entry point to start the Indexer
   * 1. Subscribes to real-time events via WebSockets.
   * 2. Sets up a cron job to handle missed events dynamically.
   */
  public async start() {
    if (!PACKAGE_ID) {
      logger.warn(
        "No SUI_PACKAGE_ID provided, indexer will run but may miss events.",
      );
      return;
    }

    try {
      logger.info("Starting Sui Real-Time WebSocket Indexer listener...");
      await this.startWebSocketListener();

      logger.info("Starting Cron Job for historical event catch-up...");
      this.scheduleCatchUpWorker();

      // Do initial catch-up execution immediately
      this.catchUpHistoricalEvents().catch((err) =>
        logger.error({ err }, "Initial historical catch up failed."),
      );
    } catch (error) {
      logger.error({ error }, "Failed to start the indexer service");
    }
  }

  /**
   * Real-time WebSocket connection to ingest blockchain events live
   */
  private async startWebSocketListener() {
    /* 
    WebSocket subscriptions in @mysten/sui v2 require GraphQL Client configuration. 
    Falling back entirely to Chron Job catch-ups instead. 
    */
    logger.info(
      "Real-time WebSocket subscriptions skipped, relying on Cron Job.",
    );
  }

  /**
   * Cron Job setup to poll the sync state every 2 minutes
   */
  private scheduleCatchUpWorker() {
    cron.schedule("*/2 * * * *", async () => {
      logger.debug("Executing scheduled historical block catch-up...");
      await this.catchUpHistoricalEvents();
    });
  }

  /**
   * Poll historical events using cursors stored in the DB (SyncState)
   */
  private async catchUpHistoricalEvents() {
    if (this.isCatchingUp) return;
    this.isCatchingUp = true;

    try {
      let syncState = await prisma.syncState.findFirst({ where: { id: 1 } });
      if (!syncState) {
        // Initialize if not present
        syncState = await prisma.syncState.create({
          data: { id: 1, cursorTxDigest: "", cursorEventSeq: "" },
        });
      }

      let hasNextPage = true;
      let cursor =
        syncState.cursorTxDigest && syncState.cursorEventSeq
          ? {
              txDigest: syncState.cursorTxDigest,
              eventSeq: syncState.cursorEventSeq,
            }
          : null;

      while (hasNextPage) {
        const result = await suiClient.queryEvents({
          query: {
            MoveEventModule: {
              package: PACKAGE_ID,
              module: "nft_valuation_lobby",
            },
          },
          order: "ascending", // MUST process chronologically
        });

        // Batch process the events
        for (const event of result.data) {
          await this.processEvent(event);
        }

        hasNextPage = result.hasNextPage;
        if (result.nextCursor && result.data.length > 0) {
          cursor = result.nextCursor;
          // Update DB sync state
          await prisma.syncState.update({
            where: { id: 1 },
            data: {
              cursorTxDigest: cursor.txDigest,
              cursorEventSeq: cursor.eventSeq,
            },
          });
        }
      }
    } catch (error) {
      logger.error({ error }, "Error catching up historical events");
    } finally {
      this.isCatchingUp = false;
    }
  }

  /**
   * Dispatcher method that routes different Sui event types to their Prisma models.
   * Leverages Prisma's distinct Composite Unique logic to silently ignore duplicates.
   */
  private async processEvent(event: any) {
    const eventType = event.type.split("::").pop();
    const payload = event.parsedJson || {};

    // Ignore insertion if TxDigest+EventSeq exists using ON CONFLICT DO NOTHING trickery
    // We achieve this logically via `create` catching P2002 error
    try {
      switch (eventType) {
        case "CraftResult":
          await prisma.craftEvent.create({
            data: {
              txDigest: event.id.txDigest,
              eventSeq: event.id.eventSeq,
              playerAddress: payload.player,
              itemMintedId: payload.item_id,
              itemType: payload.item_type,
              timestampMs: BigInt(event.timestampMs || Date.now()),
            },
          });
          logger.info(`Indexed CraftEvent: ${payload.item_id}`);
          break;

        case "RoomSettled":
          // Extract info from payload
          await prisma.matchEvent.create({
            data: {
              txDigest: event.id.txDigest,
              eventSeq: event.id.eventSeq,
              roomId: payload.room_id,
              winnerAddress: payload.winner,
              loserAddress: payload.loser,
              pointChange: payload.point_change || 10, // Example point metric
              timestampMs: BigInt(event.timestampMs || Date.now()),
            },
          });
          logger.info(`Indexed MatchEvent: Room ${payload.room_id} Settled`);
          break;

        case "ScrapFused":
          await prisma.fusionEvent.create({
            data: {
              txDigest: event.id.txDigest,
              eventSeq: event.id.eventSeq,
              playerAddress: payload.player,
              inputItemIds: payload.destroyed_items || [],
              outputItemId: payload.new_item_id,
              timestampMs: BigInt(event.timestampMs || Date.now()),
            },
          });
          logger.info(`Indexed FusionEvent: Yielded ${payload.new_item_id}`);
          break;

        default:
          logger.debug(`Unhandled event type: ${eventType}`);
      }
    } catch (e: any) {
      // P2002 is Prisma unique constraint violation -> Event already processed
      if (e.code !== "P2002") {
        throw e;
      }
    }
  }
}

// Singleton export
export const indexerService = new IndexerService();
