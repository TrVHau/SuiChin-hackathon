import { suiClient } from "./sui-client.js";
import { getPrismaClient } from "../db/prisma.js";
import { env } from "../../config/env.js";
import { logger } from "../../shared/logger.js";
import cron from "node-cron";

// The package ID to filter out events
const PACKAGE_ID = env.SUI_PACKAGE_ID || "";
const EVENT_MODULES = ["craft_actions"] as const;

function extractObjectId(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = extractObjectId(item);
      if (resolved) return resolved;
    }
    return undefined;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["objectId", "id", "value", "vec", "fields"]) {
      const resolved = extractObjectId(record[key]);
      if (resolved) return resolved;
    }
  }
  return undefined;
}

export class IndexerService {
  private isCatchingUp = false;
  private db: Record<string, any> | null = null;

  constructor() {}

  private getDb() {
    if (!this.db) {
      this.db = getPrismaClient() as Record<string, any>;
    }
    return this.db;
  }

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
      for (const moduleName of EVENT_MODULES) {
        let cursor = await this.loadCursor(moduleName);

        while (true) {
          const result = await suiClient.queryEvents({
            query: {
              MoveEventModule: {
                package: PACKAGE_ID,
                module: moduleName,
              },
            },
            order: "ascending",
            limit: 50,
            cursor: cursor ?? undefined,
          });

          for (const event of result.data) {
            await this.processEvent(event);
            await this.saveCursor(moduleName, {
              txDigest: event.id.txDigest,
              eventSeq: event.id.eventSeq,
            });
          }

          if (!result.hasNextPage || !result.nextCursor) {
            break;
          }

          cursor = {
            txDigest: result.nextCursor.txDigest,
            eventSeq: result.nextCursor.eventSeq,
          };
        }
      }
    } catch (error) {
      logger.error({ error }, "Error catching up historical events");
    } finally {
      this.isCatchingUp = false;
    }
  }

  private async loadCursor(moduleName: string): Promise<{ txDigest: string; eventSeq: string } | null> {
    const row = await this.getDb().syncState.findUnique({ where: { moduleName } });
    if (!row?.cursorTxDigest || !row?.cursorEventSeq) {
      return null;
    }
    return {
      txDigest: row.cursorTxDigest,
      eventSeq: row.cursorEventSeq,
    };
  }

  private async saveCursor(
    moduleName: string,
    cursor: { txDigest: string; eventSeq: string },
  ) {
    await this.getDb().syncState.upsert({
      where: { moduleName },
      create: {
        moduleName,
        cursorTxDigest: cursor.txDigest,
        cursorEventSeq: cursor.eventSeq,
      },
      update: {
        cursorTxDigest: cursor.txDigest,
        cursorEventSeq: cursor.eventSeq,
      },
    });
  }

  /**
   * Dispatcher method that routes different Sui event types to their Prisma models.
   * Leverages Prisma's distinct Composite Unique logic to silently ignore duplicates.
   */
  private async processEvent(event: any) {
    const eventType = event.type.split("::").pop();
    const payload = event.parsedJson || {};
    const timestampMs = BigInt(event.timestampMs || Date.now());

    // Ignore insertion if TxDigest+EventSeq exists using ON CONFLICT DO NOTHING trickery
    // We achieve this logically via `create` catching P2002 error
    try {
      switch (eventType) {
        case "CraftResult":
        case "CraftResultFinalized": {
          const playerAddress = payload.player || payload.actor || payload.crafter;
          const itemMintedId = String(
            extractObjectId(payload.nft_minted_id) ??
              payload.item_id ??
              payload.craft_id ??
              event.id.txDigest,
          );
          const itemType =
            payload.item_type ||
            (payload.is_success === false || Number(payload.tier ?? 0) === 0
              ? "SCRAP"
              : `TIER_${Number(payload.tier ?? 0)}`);

          await this.getDb().craftEvent.create({
            data: {
              txDigest: event.id.txDigest,
              eventSeq: event.id.eventSeq,
              playerAddress,
              itemMintedId,
              itemType,
              timestampMs,
            },
          });
          logger.info(`Indexed CraftEvent: ${itemMintedId}`);
          break;
        }

        case "CraftRequested":
        case "CraftRandomnessFulfilled":
          logger.debug(
            { eventType, payload },
            "Observed craft lifecycle event",
          );
          break;

        case "RoomSettled":
          await this.getDb().matchEvent.create({
            data: {
              txDigest: event.id.txDigest,
              eventSeq: event.id.eventSeq,
              roomId: payload.room_id,
              winnerAddress: payload.winner,
              loserAddress: payload.loser,
              pointChange: payload.point_change || 10, // Example point metric
              timestampMs,
            },
          });
          logger.info(`Indexed MatchEvent: Room ${payload.room_id} Settled`);
          break;

        case "RecycleRewardIssued":
          logger.info(
            {
              burnedAssetId: payload.burned_asset_id,
              burnedAssetType: payload.burned_asset_type,
              rewardChun: payload.reward_chun,
            },
            "Observed recycle reward event",
          );
          break;

        case "ScrapFused":
          await this.getDb().fusionEvent.create({
            data: {
              txDigest: event.id.txDigest,
              eventSeq: event.id.eventSeq,
              playerAddress: payload.player || payload.actor,
              inputItemIds: Array.isArray(payload.destroyed_items)
                ? payload.destroyed_items
                : [],
              outputItemId: payload.new_item_id || payload.minted_nft_id,
              timestampMs,
            },
          });
          logger.info(
            `Indexed FusionEvent: Yielded ${payload.new_item_id || payload.minted_nft_id}`,
          );
          break;

        case "ScrapsFused":
          await this.getDb().fusionEvent.create({
            data: {
              txDigest: event.id.txDigest,
              eventSeq: event.id.eventSeq,
              playerAddress: payload.player || payload.actor,
              inputItemIds: [],
              outputItemId: payload.minted_nft_id,
              timestampMs,
            },
          });
          logger.info(`Indexed FusionEvent: Yielded ${payload.minted_nft_id}`);
          break;

        case "InventoryChanged":
          logger.debug(
            { action: payload.action, amount: payload.amount },
            "Observed inventory change event",
          );
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
