import { env } from "../../config/env.js";
import { getPrismaClient } from "../../infra/db/prisma.js";

export type ValuationRoomStatus =
  | "AWAITING_DEPOSIT"
  | "ROOM_CREATED"
  | "JOINED"
  | "PLAYING"
  | "FINALIZED";

export interface ValuationRoomNft {
  id: string;
  name: string;
  tier: number;
  imageUrl?: string;
}

export interface ValuationRoomRecord {
  challengeId: string;
  tempRoomId: string;
  suiRoomId: string | null;
  tier: string;
  wagerSui: number;
  wagerMist: number;
  creatorWallet: string;
  joinerWallet: string;
  creatorNft: ValuationRoomNft;
  joinerNft: ValuationRoomNft;
  status: ValuationRoomStatus;
}

export interface CreateValuationRoomInput {
  challengeId: string;
  tempRoomId: string;
  tier: string;
  wagerSui: number;
  wagerMist: number;
  creatorWallet: string;
  joinerWallet: string;
  creatorNft: ValuationRoomNft;
  joinerNft: ValuationRoomNft;
}

interface ValuationRoomRepository {
  create(input: CreateValuationRoomInput): Promise<ValuationRoomRecord>;
  findByChallengeId(challengeId: string): Promise<ValuationRoomRecord | null>;
  findBySuiRoomId(suiRoomId: string): Promise<ValuationRoomRecord | null>;
  findPendingByCreator(creatorWallet: string): Promise<ValuationRoomRecord | null>;
  findPendingByJoiner(input: {
    joinerWallet: string;
    suiRoomId?: string;
  }): Promise<ValuationRoomRecord | null>;
  markRoomCreated(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord>;
  markRoomJoined(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord>;
  markPlaying(challengeId: string): Promise<ValuationRoomRecord | null>;
  markFinalized(challengeId: string): Promise<ValuationRoomRecord | null>;
  reset(): Promise<void>;
}

function cloneRecord(record: ValuationRoomRecord): ValuationRoomRecord {
  return {
    ...record,
    creatorNft: { ...record.creatorNft },
    joinerNft: { ...record.joinerNft },
  };
}

class InMemoryValuationRoomRepository implements ValuationRoomRepository {
  private readonly roomsByChallenge = new Map<string, ValuationRoomRecord>();

  async create(input: CreateValuationRoomInput): Promise<ValuationRoomRecord> {
    const record: ValuationRoomRecord = {
      ...input,
      suiRoomId: null,
      creatorNft: { ...input.creatorNft },
      joinerNft: { ...input.joinerNft },
      status: "AWAITING_DEPOSIT",
    };
    this.roomsByChallenge.set(record.challengeId, record);
    return cloneRecord(record);
  }

  async findByChallengeId(challengeId: string): Promise<ValuationRoomRecord | null> {
    const record = this.roomsByChallenge.get(challengeId);
    return record ? cloneRecord(record) : null;
  }

  async findBySuiRoomId(suiRoomId: string): Promise<ValuationRoomRecord | null> {
    for (const record of this.roomsByChallenge.values()) {
      if (record.suiRoomId === suiRoomId) {
        return cloneRecord(record);
      }
    }
    return null;
  }

  async findPendingByCreator(creatorWallet: string): Promise<ValuationRoomRecord | null> {
    for (const record of this.roomsByChallenge.values()) {
      if (
        record.creatorWallet === creatorWallet &&
        record.status === "AWAITING_DEPOSIT" &&
        !record.suiRoomId
      ) {
        return cloneRecord(record);
      }
    }
    return null;
  }

  async findPendingByJoiner(input: {
    joinerWallet: string;
    suiRoomId?: string;
  }): Promise<ValuationRoomRecord | null> {
    for (const record of this.roomsByChallenge.values()) {
      if (record.joinerWallet !== input.joinerWallet) continue;
      if (record.status === "FINALIZED" || record.status === "PLAYING") continue;
      if (input.suiRoomId && record.suiRoomId && record.suiRoomId !== input.suiRoomId) {
        continue;
      }
      return cloneRecord(record);
    }
    return null;
  }

  async markRoomCreated(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    const record = this.requireRoom(input.challengeId);
    record.suiRoomId = input.suiRoomId;
    record.status = "ROOM_CREATED";
    return cloneRecord(record);
  }

  async markRoomJoined(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    const record = this.requireRoom(input.challengeId);
    record.suiRoomId = input.suiRoomId;
    record.status = "JOINED";
    return cloneRecord(record);
  }

  async markPlaying(challengeId: string): Promise<ValuationRoomRecord | null> {
    const record = this.roomsByChallenge.get(challengeId);
    if (!record) return null;
    record.status = "PLAYING";
    return cloneRecord(record);
  }

  async markFinalized(challengeId: string): Promise<ValuationRoomRecord | null> {
    const record = this.roomsByChallenge.get(challengeId);
    if (!record) return null;
    record.status = "FINALIZED";
    return cloneRecord(record);
  }

  async reset(): Promise<void> {
    this.roomsByChallenge.clear();
  }

  private requireRoom(challengeId: string): ValuationRoomRecord {
    const record = this.roomsByChallenge.get(challengeId);
    if (!record) {
      throw new Error("Valuation room not found");
    }
    return record;
  }
}

class PrismaValuationRoomRepository implements ValuationRoomRepository {
  private readonly db = getPrismaClient() as Record<string, any>;

  async create(input: CreateValuationRoomInput): Promise<ValuationRoomRecord> {
    const row = await this.db.valuationRoom.create({
      data: {
        challengeId: input.challengeId,
        tempRoomId: input.tempRoomId,
        tier: input.tier,
        wagerSui: input.wagerSui,
        wagerMist: input.wagerMist,
        creatorWallet: input.creatorWallet,
        joinerWallet: input.joinerWallet,
        creatorNftJson: input.creatorNft,
        joinerNftJson: input.joinerNft,
        status: "AWAITING_DEPOSIT",
      },
    });
    return this.toRecord(row);
  }

  async findByChallengeId(challengeId: string): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.findUnique({ where: { challengeId } });
    return row ? this.toRecord(row) : null;
  }

  async findBySuiRoomId(suiRoomId: string): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.findUnique({ where: { suiRoomId } });
    return row ? this.toRecord(row) : null;
  }

  async findPendingByCreator(creatorWallet: string): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.findFirst({
      where: {
        creatorWallet,
        suiRoomId: null,
        status: "AWAITING_DEPOSIT",
      },
      orderBy: { createdAt: "asc" },
    });
    return row ? this.toRecord(row) : null;
  }

  async findPendingByJoiner(input: {
    joinerWallet: string;
    suiRoomId?: string;
  }): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.findFirst({
      where: {
        joinerWallet: input.joinerWallet,
        status: { in: ["AWAITING_DEPOSIT", "ROOM_CREATED", "JOINED"] },
        ...(input.suiRoomId ? { OR: [{ suiRoomId: input.suiRoomId }, { suiRoomId: null }] } : {}),
      },
      orderBy: { createdAt: "asc" },
    });
    return row ? this.toRecord(row) : null;
  }

  async markRoomCreated(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    const row = await this.db.valuationRoom.update({
      where: { challengeId: input.challengeId },
      data: {
        suiRoomId: input.suiRoomId,
        status: "ROOM_CREATED",
      },
    });
    return this.toRecord(row);
  }

  async markRoomJoined(input: {
    challengeId: string;
    suiRoomId: string;
  }): Promise<ValuationRoomRecord> {
    const row = await this.db.valuationRoom.update({
      where: { challengeId: input.challengeId },
      data: {
        suiRoomId: input.suiRoomId,
        status: "JOINED",
      },
    });
    return this.toRecord(row);
  }

  async markPlaying(challengeId: string): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.update({
      where: { challengeId },
      data: { status: "PLAYING" },
    });
    return row ? this.toRecord(row) : null;
  }

  async markFinalized(challengeId: string): Promise<ValuationRoomRecord | null> {
    const row = await this.db.valuationRoom.update({
      where: { challengeId },
      data: { status: "FINALIZED" },
    });
    return row ? this.toRecord(row) : null;
  }

  async reset(): Promise<void> {
    await this.db.valuationRoom.deleteMany({});
  }

  private toRecord(row: any): ValuationRoomRecord {
    return {
      challengeId: row.challengeId,
      tempRoomId: row.tempRoomId,
      suiRoomId: row.suiRoomId ?? null,
      tier: row.tier,
      wagerSui: Number(row.wagerSui),
      wagerMist: Number(row.wagerMist),
      creatorWallet: row.creatorWallet,
      joinerWallet: row.joinerWallet,
      creatorNft: row.creatorNftJson,
      joinerNft: row.joinerNftJson,
      status: row.status,
    };
  }
}

function buildRepository(): ValuationRoomRepository {
  if (env.BACKEND_STORAGE === "prisma") {
    return new PrismaValuationRoomRepository();
  }
  return new InMemoryValuationRoomRepository();
}

export const valuationRoomRepository = buildRepository();
